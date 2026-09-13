# AegisX Windows Agent

Real local agent — no simulated data. It reads actual running processes and
network connections on the machine it's installed on via `psutil`, and talks
to your deployed AegisX backend (built in Lovable/Supabase).

## Requirements
- Windows 10/11 (or any OS for testing — psutil works cross-platform; some
  fields like full command line require admin rights on Windows)
- Python 3.9+
- Run terminal **as Administrator** for full visibility into other users'
  process command lines and network connections.

## Setup

```bash
pip install -r requirements.txt
copy config.example.json config.json
```

Edit `config.json`:
```json
{
  "backend_url": "https://YOUR-DEPLOYED-APP-DOMAIN",
  "enroll_key": "the key shown on your AegisX Settings page"
}
```

> **Note:** `backend_url` is the base URL of the deployed AegisX **web app**
> itself (its Lovable publish domain or Vercel domain — e.g.
> `https://aegisx-real-security-insights.vercel.app`), **not** a
> `*.supabase.co/functions/v1` URL. The agent endpoints (`agent-enroll`,
> `events-batch`, etc.) are TanStack Start server routes served at
> `/api/public/...` on that same app domain — they are not Supabase Edge
> Functions, even though Supabase is used underneath for the database/auth.
> `agent.py` appends `/api/public/<name>` to whatever you put here, so make
> sure `backend_url` has no trailing slash and no extra path.

## Run

```bash
python agent.py
```

First run enrolls the device and saves a `device_token` into `config.json`.
After that it will:
- Poll processes every 5s, diff against the previous snapshot, and report
  genuinely new processes, suspicious parent→child pairs (e.g.
  WINWORD.EXE → POWERSHELL.EXE), encoded PowerShell command lines, execution
  from temp paths, and real outbound network connections.
- Send a heartbeat every 30s.
- Poll for pending response commands every 10s and execute allowlisted
  actions (`terminate`, `isolate`) only when the backend's target PID and
  process name both match what's actually running — otherwise it refuses
  and reports a safety-check failure.

## Testing the real detection scenario safely

To generate the WINWORD → PowerShell → encoded command → network chain for
real (not faked), you can manually run, in an authorized test VM:

```powershell
powershell.exe -EncodedCommand <base64-of-a-harmless-command>
```
launched as a child of a Word document's macro, or simply run PowerShell
with the `-enc` flag from a terminal spawned by Word for a controlled test.
The agent will pick this up as real telemetry — there is nothing hardcoded
that fakes this scenario in the agent itself.

## Notes on "real" vs hackathon-safe

- `terminate` really calls `psutil.Process(pid).terminate()` — only on a PID
  that matches both the ID and process name the backend targeted.
- `isolate` currently logs the intent and reports success so the audit trail
  is real, but does not yet modify Windows Firewall rules. Extend
  `execute_command()` with a real `netsh advfirewall` rule if you want actual
  network isolation — left out by default so a bug can't cut off your own
  test machine's network access.
