/**
 * AegisX detection engine — deterministic rules, correlation helpers, risk scoring
 * and MITRE mapping. Pure functions only, so the same logic can run in the agent
 * ingestion route and in tests.
 */

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface IngestEvent {
  event_type: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface StoredEvent extends IngestEvent {
  id: string;
}

export interface MatchedRule {
  rule: string;
  weight: number;
  description: string;
  evidence: string;
}

export const OFFICE_PARENTS = ["WINWORD.EXE", "EXCEL.EXE", "OUTLOOK.EXE", "POWERPNT.EXE"];

export const KNOWN_BAD_PAIRS = [
  "WINWORD.EXE>POWERSHELL.EXE",
  "EXCEL.EXE>POWERSHELL.EXE",
  "OUTLOOK.EXE>POWERSHELL.EXE",
  "WINWORD.EXE>CMD.EXE",
  "MSHTA.EXE>POWERSHELL.EXE",
  "POWERSHELL.EXE>RUNDLL32.EXE",
  "WSCRIPT.EXE>POWERSHELL.EXE",
];

export const KNOWN_GOOD_PORTS = [53, 80, 123, 443, 3128, 8080, 8443];

export const TEST_INDICATOR_HASHES = [
  // EICAR test file hash - safe, non-malicious test indicator
  "275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f",
  "aegisx0000000000000000000000000000000000000000000000000000testih",
];

export const RULE_DESCRIPTIONS: Record<string, string> = {
  office_to_powershell:
    "An Office application spawned PowerShell — a hallmark of macro-based initial access.",
  encoded_powershell:
    "PowerShell ran with an encoded command line, used to hide the real script contents.",
  suspicious_parent_child:
    "The observed parent/child process relationship matches a known-bad execution chain.",
  temp_path_exec:
    "A binary executed from a user-writable temp path, typical of a dropped payload.",
  unusual_outbound:
    "The process opened an outbound connection on a non-standard port shortly after launch.",
  known_test_hash: "The file hash matches a known malicious/test indicator.",
};

export const RULE_WEIGHTS: Record<string, number> = {
  office_to_powershell: 30,
  encoded_powershell: 25,
  suspicious_parent_child: 15,
  temp_path_exec: 15,
  unusual_outbound: 20,
  known_test_hash: 40,
};

const MITRE_MAP: Record<string, { technique_id: string; technique_name: string }> = {
  encoded_powershell: {
    technique_id: "T1059.001",
    technique_name: "Command and Scripting Interpreter: PowerShell",
  },
  office_to_powershell: {
    technique_id: "T1566.001",
    technique_name: "Phishing: Spearphishing Attachment (contextual)",
  },
  suspicious_parent_child: {
    technique_id: "T1055",
    technique_name: "Process Injection / Abnormal Process Lineage",
  },
  temp_path_exec: {
    technique_id: "T1204.002",
    technique_name: "User Execution: Malicious File",
  },
  unusual_outbound: {
    technique_id: "T1071",
    technique_name: "Application Layer Protocol (Command and Control)",
  },
  known_test_hash: {
    technique_id: "T1588.001",
    technique_name: "Obtain Capabilities: Malware",
  },
};

const str = (v: unknown) => (typeof v === "string" ? v : "");
const upper = (v: unknown) => str(v).toUpperCase();

const processName = (e: IngestEvent) =>
  upper(e.payload["process_name"] ?? e.payload["image"] ?? basename(str(e.payload["image_path"])));

const parentName = (e: IngestEvent) =>
  upper(e.payload["parent_process"] ?? e.payload["parent_name"] ?? basename(str(e.payload["parent_image_path"])));

function basename(p: string) {
  const parts = p.split(/[\\/]/);
  return parts[parts.length - 1] ?? "";
}

/** Rule engine: evaluate all enabled rules against a correlated batch of events. */
export function evaluateRules(events: IngestEvent[], enabledRuleKeys: string[]): MatchedRule[] {
  const matches = new Map<string, MatchedRule>();
  const add = (rule: string, evidence: string) => {
    if (!enabledRuleKeys.includes(rule) || matches.has(rule)) return;
    matches.set(rule, {
      rule,
      weight: RULE_WEIGHTS[rule] ?? 10,
      description: RULE_DESCRIPTIONS[rule] ?? rule,
      evidence,
    });
  };

  for (const e of events) {
    const child = processName(e);
    const parent = parentName(e);
    const cmd = str(e.payload["command_line"]);
    const imagePath = str(e.payload["image_path"]);
    const sha256 = str(e.payload["sha256"]).toLowerCase();

    if (OFFICE_PARENTS.includes(parent) && child === "POWERSHELL.EXE") {
      add("office_to_powershell", `${parent} spawned ${child}`);
    }
    if (parent && child && KNOWN_BAD_PAIRS.includes(`${parent}>${child}`)) {
      add("suspicious_parent_child", `${parent} > ${child}`);
    }
    if (/-enc\b|-e\s|-encodedcommand/i.test(cmd)) {
      add("encoded_powershell", cmd.slice(0, 300));
    }
    if (/\\Temp\\|\\AppData\\Local\\Temp\\/i.test(imagePath)) {
      add("temp_path_exec", imagePath);
    }
    if (e.event_type === "network_connection") {
      const port = Number(e.payload["dest_port"] ?? 0);
      if (port > 0 && !KNOWN_GOOD_PORTS.includes(port)) {
        add(
          "unusual_outbound",
          `${child || "process"} → ${str(e.payload["dest_ip"]) || "unknown"}:${port}`,
        );
      }
    }
    if (sha256 && TEST_INDICATOR_HASHES.includes(sha256)) {
      add("known_test_hash", sha256);
    }
  }

  return [...matches.values()];
}

export function severityFromScore(score: number): Severity {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 30) return "MEDIUM";
  return "LOW";
}

export function scoreIncident(matched: MatchedRule[]) {
  const raw = matched.reduce((sum, r) => sum + r.weight, 0);
  const score = Math.min(raw, 100);
  return {
    score,
    severity: severityFromScore(score),
    reasons: matched,
    confidence: Math.min(1, Number((score / 100).toFixed(2))),
  };
}

export function mapToMitre(matched: MatchedRule[]) {
  return matched
    .map((m) => {
      const t = MITRE_MAP[m.rule];
      return t ? { ...t, evidence: m.evidence } : null;
    })
    .filter((v): v is { technique_id: string; technique_name: string; evidence: string } => v !== null);
}

/** Human title derived from the strongest matched rules. */
export function incidentTitle(matched: MatchedRule[]): string {
  const keys = matched.map((m) => m.rule);
  if (keys.includes("office_to_powershell") && keys.includes("encoded_powershell")) {
    return "Office macro chain executing encoded PowerShell";
  }
  if (keys.includes("known_test_hash")) return "Known malicious indicator executed on endpoint";
  if (keys.includes("encoded_powershell")) return "Obfuscated PowerShell execution";
  if (keys.includes("unusual_outbound")) return "Suspicious outbound connection from process";
  if (keys.includes("temp_path_exec")) return "Execution from user-writable temp path";
  return "Suspicious endpoint activity";
}

/** Build a readable process chain from correlated process_create events. */
export function buildProcessChain(events: StoredEvent[]) {
  return events
    .filter((e) => e.event_type === "process_create")
    .sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp))
    .map((e) => ({
      id: e.id,
      parent: parentName(e),
      process: processName(e),
      command_line: str(e.payload["command_line"]),
      image_path: str(e.payload["image_path"]),
      pid: e.payload["pid"] ?? null,
      timestamp: e.timestamp,
    }));
}

export const CORRELATION_WINDOW_MS = 5 * 60 * 1000;
