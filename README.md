# AegisX: Real Security Insights

AegisX — Lovable Build Prompt (Real Backend, No Mock Data)

Copy everything below into Lovable as ONE prompt. This skips the "fake mock data" phase and builds directly on a real Supabase backend, so every incident, endpoint, and alert shown in the UI comes from real database records — not hardcoded fake JSON.

START OF PROMPT

Build AegisX — an AI-Powered Endpoint Security & Mini-SOC Platform. This must be a real, working full-stack app (React + TypeScript frontend, Supabase backend), not a static UI with hardcoded mock data. Every screen must read live data from Supabase tables.

Tech Stack

React + TypeScript + Tailwind CSS + shadcn/ui

React Router for navigation

Recharts for charts

Supabase (Postgres + Auth + Realtime + Edge Functions) — connect from the start, don't fake it later

Deployable to Vercel

1. Supabase Setup (do this first, real from day one)

Enable Email/Password auth. Create these tables with proper relationships and Row Level Security (RLS):

profiles (linked to auth.users): id, email, role, organization_id

organizations: id, name

endpoints: id, hostname, os, agent_version, last_heartbeat, status, risk_level, organization_id

events: id, endpoint_id, event_type, timestamp, payload (jsonb), ingested_at

detections: id, rule_id, incident_id, confidence, severity, reasons (jsonb)

incidents: id, incident_code (e.g. AX-000124), severity, risk_score, status, summary, endpoint_id, created_at, updated_at, assigned_to

incident_events: incident_id, event_id (junction table — real evidence linkage)

mitre_mappings: id, technique_id, technique_name, incident_id, evidence

response_actions: id, action_type, target, requested_by, status, result, incident_id, created_at

audit_logs: id, actor, action, target, details, created_at

detection_rules: id, name, description, severity, enabled, logic_version

No table should ever be pre-populated with fake demo rows baked into the frontend code — all data must flow through real inserts.

2. Authentication

Real Supabase Auth signup/login.

Add a "Demo Analyst" login option that logs into a real pre-created Supabase account (not a fake bypass) — this account's data is real, just labeled as a demo org.

Protect all dashboard routes with real session checks.

3. Real Event Ingestion + Detection Pipeline (Supabase Edge Functions)

ingest-event Edge Function: accepts a batch of telemetry events (this is the same endpoint a real Windows agent will call later), validates schema, inserts into events.

run-detection logic (can run inside the same function or be triggered after insert):

Rule engine checks events against detection_rules (implement 5–8 real deterministic rules: Office app spawning PowerShell, encoded PowerShell command, suspicious parent-child process, executable from temp/user-writable path, unusual outbound connection after process start, known test-indicator hash match).

Behavior engine correlates related events (same endpoint, same time window, matching process chain) into one incident instead of one-event-per-alert.

Risk engine computes a real weighted score (0–100) and stores the specific reasons in detections.reasons — this must be genuinely computed, not a random or fixed number.

MITRE mapping: insert a row into mitre_mappings only when a rule maps to a real technique (e.g. T1059.001 for encoded PowerShell execution).

AI explanation: call an LLM API (OpenAI/Groq) from a secure Edge Function, passing only the structured evidence for that incident, and store the returned summary in incidents.summary. Never call the LLM directly from the frontend (keep the API key server-side only).

Insert the finished incident into incidents for real — the dashboard must show this incident because it exists in the database, not because it's hardcoded.

4. "Send Test Telemetry" Panel (for safe demo — real pipeline, controlled input)

Add a panel (Incident page or admin area) with a button that calls ingest-event with a realistic payload matching the demo scenario:

WINWORD.EXE → POWERSHELL.EXE (encoded command) → unusual outbound connection

This is the safe way to demonstrate the pipeline without running real malware — but it must go through the exact same ingestion → detection → scoring → incident-creation path that a real Windows agent will use later. Nothing about the resulting incident should be faked separately for this button.

5. Pages (all reading real Supabase data)

Login — real Supabase Auth

SOC Overview — KPI cards (severity counts via real query), recent incidents feed (real, ordered by created_at), 7-day severity chart (real aggregation query), endpoint health summary

Endpoints — table from endpoints, real last_heartbeat/status; row click → details

Endpoint Details — device info + real recent events for that endpoint + related open incidents

Alerts / Incidents List — filterable/searchable, real data, severity color coding

Incident Investigation (hero page) — incident header (real fields), process chain (built from real incident_events), evidence list (real), detection reasons (real, from detections.reasons), MITRE section (real rows from mitre_mappings), AI Summary card (real LLM output stored in DB), timeline (real events ordered by time), Response Action Panel (buttons write real rows to response_actions + audit_logs with confirmation modals), audit log for this incident (real)

Response Center — real list from response_actions

Audit Logs — real, searchable

Detection Rules — real list from detection_rules, toggle enabled updates the real row

Settings — profile (real), theme toggle, notification prefs

6. Response Actions (real, logged, allowlisted)

Only these actions are allowed: Acknowledge, Assign, Mark Investigating, Simulate Isolate, Terminate approved test process. Every action:

writes a real row to response_actions

writes a real row to audit_logs

updates the incident's status No action should just change local UI state without persisting to Supabase.

7. Real-time

Use Supabase Realtime so new incidents and endpoint heartbeat changes appear on the dashboard without a manual refresh.

8. Security

RLS enabled on every table, scoped to the user's organization

Service role key and LLM API key only ever used inside Edge Functions, never in frontend code

Validate all inputs to ingest-event

Rate-limit the ingestion function

9. Agent Integration Contract (build these Edge Functions for real — the agent itself is a separate local program, not part of this build)

Implement these Edge Functions with exact request/response contracts, since a real Python agent (built separately, running on a Windows PC) will call them:

POST /functions/v1/agent-enroll Request: { "hostname": string, "os": string, "agent_version": string, "enroll_key": string } Response: { "endpoint_id": uuid, "device_token": string } Logic: validates enroll_key against organization, inserts a row into endpoints with status online, returns a long-lived device_token (store a hashed version server-side, e.g. in a new device_tokens table with endpoint_id + token_hash + created_at).

POST /functions/v1/agent-heartbeat Headers: Authorization: Bearer <device_token> Request: { "endpoint_id": uuid, "timestamp": iso8601 } Response: { "ok": true } Logic: validates token against device_tokens, updates endpoints.last_heartbeat and endpoints.status = 'online'. A separate scheduled function or query should mark endpoints offline if last_heartbeat is older than 2 minutes.

POST /functions/v1/events-batch (this is the real ingestion endpoint — same logic as ingest-event above) Headers: Authorization: Bearer <device_token> Request: { "endpoint_id": uuid, "events": [ { "event_type": string, "timestamp": iso8601, "payload": object }, ... ] } Response: { "inserted": number, "incidents_created": [uuid, ...] } Logic: validate token → insert rows into events → run rule engine + correlation + risk scoring + MITRE mapping + AI summary → insert into incidents/detections/mitre_mappings → return which new incident IDs were created.

GET /functions/v1/agent-commands?endpoint_id=<uuid> Headers: Authorization: Bearer <device_token> Response: { "commands": [ { "command_id": uuid, "action_type": "isolate"|"terminate", "target": object } ] } Logic: returns pending response_actions rows for this endpoint where status = pending_agent.

POST /functions/v1/agent-command-result Headers: Authorization: Bearer <device_token> Request: { "command_id": uuid, "status": "success"|"failed", "result": string } Response: { "ok": true } Logic: updates the response_actions row and writes an audit_logs entry.

Show me the exact deployed Edge Function URLs (they'll look like https://<project>.supabase.co/functions/v1/<name>) once built — I will configure a real local agent to call these directly.

10. Suggested Project File Structure

Follow (or closely match) this structure so the codebase stays organized:

aegisx/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── lib/
│   │   ├── supabaseClient.ts
│   │   └── types.ts
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Overview.tsx
│   │   ├── Endpoints.tsx
│   │   ├── EndpointDetails.tsx
│   │   ├── Incidents.tsx
│   │   ├── IncidentInvestigation.tsx
│   │   ├── ResponseCenter.tsx
│   │   ├── AuditLogs.tsx
│   │   ├── DetectionRules.tsx
│   │   └── Settings.tsx
│   ├── components/
│   │   ├── layout/ (Sidebar.tsx, Topbar.tsx)
│   │   ├── incidents/ (ProcessChain.tsx, RiskScoreGauge.tsx, MitreCard.tsx, AiSummaryCard.tsx, ResponsePanel.tsx, EvidenceList.tsx)
│   │   ├── endpoints/ (EndpointTable.tsx, EndpointStatusBadge.tsx)
│   │   └── shared/ (SeverityBadge.tsx, EmptyState.tsx, LoadingSkeleton.tsx)
│   └── hooks/
│       ├── useIncidents.ts
│       ├── useEndpoints.ts
│       └── useRealtimeIncidents.ts
├── supabase/
│   ├── migrations/ (SQL for all tables + RLS policies)
│   └── functions/
│       ├── agent-enroll/index.ts
│       ├── agent-heartbeat/index.ts
│       ├── events-batch/index.ts   ← rule engine + risk scoring + MITRE + AI call live here
│       ├── agent-commands/index.ts
│       └── agent-command-result/index.ts
└── vercel.json


11. Detection & Risk Scoring Logic (implement exactly this inside events-batch)

Pseudocode for the rule engine and scoring — implement as real TypeScript/Deno code inside the Edge Function, not as a black box:

rules = [
  { id: "office_to_powershell", weight: 30, check: (chain) => chain.parent in ["WINWORD.EXE","EXCEL.EXE","OUTLOOK.EXE"] && chain.child == "POWERSHELL.EXE" },
  { id: "encoded_powershell", weight: 25, check: (event) => /-enc|-EncodedCommand/i.test(event.payload.command_line) },
  { id: "suspicious_parent_child", weight: 15, check: (chain) => chain.parent_child_pair in KNOWN_BAD_PAIRS },
  { id: "temp_path_exec", weight: 15, check: (event) => /\\Temp\\|\\AppData\\Local\\Temp\\/i.test(event.payload.image_path) },
  { id: "unusual_outbound", weight: 20, check: (event) => event.event_type == "network_connection" && event.payload.dest_port not in KNOWN_GOOD_PORTS },
  { id: "known_test_hash", weight: 40, check: (event) => event.payload.sha256 in TEST_INDICATOR_HASHES },
]

function scoreIncident(matchedRules):
  score = sum(rule.weight for rule in matchedRules)
  score = min(score, 100)
  reasons = [ { rule: r.id, weight: r.weight, description: HUMAN_READABLE[r.id] } for r in matchedRules ]
  severity = score >= 80 ? "CRITICAL" : score >= 60 ? "HIGH" : score >= 30 ? "MEDIUM" : "LOW"
  return { score, severity, reasons }

function correlateIntoIncident(events, endpoint_id):
  # group events for same endpoint within a 5-minute rolling window into one process chain
  # if a chain matches office_to_powershell + encoded_powershell + unusual_outbound → single CRITICAL incident
  ...

function mapToMitre(matchedRules):
  mapping = {
    "encoded_powershell": { technique_id: "T1059.001", technique_name: "Command and Scripting Interpreter: PowerShell" },
    "office_to_powershell": { technique_id: "T1566.001", technique_name: "Phishing: Spearphishing Attachment (contextual)" },
  }
  return matchedRules.map(r => mapping[r.id]).filter(Boolean)


Store reasons as real JSON in detections.reasons so the Incident Investigation page can render the exact contributing factors — never show a hardcoded reasons list in the frontend.

12. Agent Enrollment Key

Generate a real enroll_key per organization (store in organizations.enroll_key, a random 32-char string) so a real local agent config file can use it during agent-enroll. Show this key in the Settings page so I can copy it into the agent's config.

10. Deployment

Configure clean deploy to Vercel. Environment variables for Supabase URL/anon key and LLM API key must be set server-side (Vercel project settings), never committed or exposed to frontend.

Definition of done: I should be able to sign up, log in, click "Send Test Telemetry," and watch a real incident get created live in the database, scored, mapped to MITRE, explained by AI, and appear on the dashboard in real time — with every response action and audit entry actually persisted in Supabase.

END OF PROMPT

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1ad57e49-3652-4080-817f-8cc4e6e574b8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
