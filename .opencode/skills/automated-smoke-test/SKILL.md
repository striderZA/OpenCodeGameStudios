---
name: automated-smoke-test
description: "Run an automated smoke test using the godot-mcp server. Launches the project, captures debug output, and checks for errors or crashes."
argument-hint: "[duration-seconds]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Write, Bash, Task, question
---

# Automated Smoke Test

This skill runs a fully automated smoke test against the Godot project using
the godot-mcp server. It launches the project headlessly, captures debug output
for a configurable duration, and analyzes the output for errors, warnings, and
assertions — producing a structured pass/fail report.

No manual verification required. The entire check is automated through MCP.

---

## Phase 1: Verify godot-mcp Availability

Call `get_godot_version` via the godot-mcp server. If the call succeeds, note
the version string. If it fails, inform the user:

> "godot-mcp server is not available. Install it with:
> `npx @coding-solo/godot-mcp`
> Then configure the MCP server in `opencode.json`."

Stop if the server is unavailable.

---

## Phase 2: Read Project Info

Call `get_project_info` via godot-mcp. Record:

- **Project title** — from the project info response
- **Main scene** — the configured main scene path
- **Render mode** — e.g. Forward+, Mobile, GL Compatible

If `get_project_info` fails, try again once after a short delay. If it fails
again: "Could not read project info. Is the godot-mcp server running against
the correct project?" Then stop.

---

## Phase 3: Run the Project

Parse the optional argument for duration. If no argument is provided, default
to 10 seconds. The argument is in seconds: `/automated-smoke-test 15` means
capture output for 15 seconds.

Call `run_project` via godot-mcp. Confirm the project has started.

If `run_project` returns an error or the project fails to start:
- Report: "Project failed to start with error: [error message]"
- Verdict: **FAIL**
- Skip to Phase 7 (Report) — project was never launched, no stop needed

---

## Phase 4: Capture Debug Output

Wait the configured duration (default: 10 seconds, configurable via argument).
After the duration elapses, call `get_debug_output`.

If `get_debug_output` returns an error:
- Report: "Could not capture debug output: [error message]"
- Verdict: **FAIL**
- Skip to Phase 6 (stop project), then continue to Phase 7 for the report

If output is empty or trivially short, note: "Output appears minimal — the
project may not have rendered any frames."

---

## Phase 5: Analyze Output

Scan the debug output for:

| Pattern | Severity | Flags |
|---------|----------|-------|
| `ERROR` | Error | Catch-all for Godot error messages |
| `error:` | Error | Lower-case variant in scripts |
| `crash` | Critical | Game crashed during runtime |
| `NullReferenceException` | Error | Null access in C# script (.NET) |
| `segfault` | Critical | Memory access violation |
| `segmentation fault` | Critical | Full-form segfault message |
| `WARNING` | Warning | Non-fatal warnings |
| `warning:` | Warning | Lower-case variant |
| `Assertion failed` | Error | GDScript or C# assertion failure |

Count the occurrences of each pattern. Record the actual matching lines (up to
10 per pattern for the report).

---

## Phase 6: Stop the Project

Call `stop_project` via godot-mcp to clean up. If it fails, note:
"Could not stop the project cleanly — you may need to close the Godot
editor or kill the process manually."

---

## Phase 7: Report Results

Format the report:

```markdown
## Automated Smoke Test Report

**Date**: [date]
**Project**: [project title]
**Main Scene**: [main scene path]
**Godot Version**: [version from Phase 1]
**Duration**: [X seconds]

---

### Results

| Check | Result |
|-------|--------|
| Project launched | ✅ / ❌ |
| No runtime errors | ✅ / ❌ (N errors found) |
| No critical crashes | ✅ / ❌ (N crashes detected) |
| No warnings | ✅ / ⚠️ (N warnings) |
| No assertion failures | ✅ / ❌ (N assertions failed) |

---

### Error Details

[If errors/crashes found, include the matching lines in a code block.
Otherwise: "No errors detected."]

---

### Warning Details

[If warnings found, include the matching lines in a code block.
Otherwise: "No warnings detected."]

---

### Verdict: [PASS | FAIL]

**FAIL** if ANY of:
- Project failed to start
- Runtime errors or crashes detected
- Assertion failures found

**PASS** if ALL of:
- Project launched successfully
- No runtime errors or crashes
- No assertion failures
- Warnings are acceptable (advisory only — do not cause FAIL)
```

Present the report to the user. Do not write it to a file unless asked.
