---
name: autopilot-playtest
description: "Playtest the game open in the Godot editor with Autopilot's MCP server: explore for bugs, test a level, verify a claim, or reach a goal in play. Files the result to production/qa/playtests/. Use when asked for an automated playtest or to check gameplay with Autopilot."
argument-hint: "[explore|test|verify|goal] [request]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Write, question
---

# Automated Playtest with Autopilot

Autopilot plays the game open in the Godot editor. You write the harness for this request, run it through Autopilot's MCP tools, and file what play showed.

Autopilot's own instructions (`INSTRUCTIONS.md`, named by `start_run`) are the detailed reference. This skill is the framework's wrapper around them.

**The result is automated evidence. It is never a human playtest.**

---

## Setup (once per machine and project)

Rationale and verified behaviour: `docs/framework/autopilot-integration.md`.

- **Harness.** OpenCode 2.2.5, Pi 1.x and omp 18.16.0 are verified. Tool names differ by harness. In this skill, a bare name such as `start_run` means Autopilot's MCP tool of that name, shown as `autopilot_start_run` in OpenCode, `mcp__autopilot__start_run` in Pi and `mcp__autopilot_start_run` in omp. Other harnesses: stop and say so, and do not edit their config.
- **Godot 4.7 or later.** Autopilot's addon README states this. The addon is tested on 4.7.2, which this framework's Godot reference is pinned to. The addon has no runtime version check, so Godot 4.6 is untested.
- **Addon.** Install `addons/autopilot/` into the game project from Autopilot's download. Enable it in Project Settings > Plugins, then commit the `project.godot` changes it makes (autoload `AutopilotPlaytest`, and `autopilot/project_id`). Do not copy the addon into this repository.
- **Agent service and Bun.** Install Autopilot's agent service, which provides the `autopilot` command that `opencode.json` runs. Install Bun, which Autopilot's default harness agent needs.
- **Keys.** Bring your own keys: a TypeSafe decision key and an LLM key, both in Autopilot's `autopilot.env`. Do not sign in to Aura.
- **Sharing.** In the dock's Privacy step, turn sharing off. Autopilot shares recordings, screenshots, traces and memories by default.
- **Releases.** Exclude `addons/autopilot/*` from export presets.

---

## Phase 1: Preflight

1. Confirm the server is enabled for this session. In OpenCode, `opencode.json` → `mcp.servers.autopilot` must have `disabled` set to `false`. In Pi, the `autopilot` entry in your `mcp.json` must have `enabled` set to `true` and `exposure` set to `direct`. Pi's own MCP view can enable the server, and after editing the file, reconnect the server there or restart Pi. In omp, the `autopilot` entry in `.omp/mcp.json` must have `enabled` set to `true`; restart omp after editing it. If it is off, ask the user whether to enable it for this session, then stop until they answer. If the entry is missing, stop and tell the user to add it from the Autopilot section of `/setup-engine`. Do not edit config files yourself.
2. Readiness. The Autopilot tools join your tool list only after the MCP server starts. That took about 5 seconds in testing and can take longer on a cold start. Check that `autopilot_start_run` (OpenCode), `mcp__autopilot__start_run` (Pi) or `mcp__autopilot_start_run` (omp) is among your tools. If it is not, make one cheap read-only call (for example `read` on `AGENTS.md`) so the next turn sees the tools, then check again. Make at most 20 such checks. If the tool is still missing, stop and tell the user: "Autopilot's MCP server did not start. Check that the `autopilot` command is on PATH, then run `opencode mcp list` (OpenCode), `pi mcp list` (Pi) or `/mcp list` (omp). Send the request again once `autopilot` shows connected."
3. Confirm the game's project is open in the Godot editor with the Autopilot dock connected. If `start_run` says the agent service isn't running, relay its message and stop.
4. Keys: never ask the user to paste a key into this chat. If a run asks for a key, tell the user where it goes (see Setup).
5. Sharing: confirm the dock's Privacy step is off (see Setup). If the user has not confirmed this, ask before the first run.

## Phase 2: Choose the kind and start the run

Map the request to a kind:

- `verify`: a claim to check, e.g. "the door opens with the key". Result: CONFIRMED, DENIED or INCONCLUSIVE.
- `goal`: an outcome to reach in play, e.g. "sell three crops". Result: achieved or not achieved.
- `explore`: look for bugs, or test a level or system, e.g. "go through the level and tell me what looks wrong". A test is an exploration.

Call `start_run` with `request` (the user's words, verbatim) and `kind`. Add `minutes` (explorations; default 10), `time_limit_minutes` (default 30) and `level` only when the user gives them.

Start one run per request unless the user asks for more. Each run costs model tokens.

## Phase 3: Build the harness

1. Read the `INSTRUCTIONS.md` that `start_run` names, in full, with the MCP `read_file` tool. It is long: read it in parts. Follow it.
2. Write the harness and notes with `write_file` or `edit_file`. Those tools reach only this run's folder, `notes.md` and `lib.py` in Autopilot's memory folder for the project. They cannot touch this repository.
3. Read the game's scripts from this repository with your read and search tools as needed (`read`, `glob` and `grep` in OpenCode and omp; in Pi, `read` and `bash`). Autopilot's own copy of the code is in its memory folder.
4. Never try to change game files. Autopilot acts on the game through play only.

## Phase 4: Run and wait

- A call that answers "still going" has not finished. Call `wait` until it returns the result. Do not call other game tools in the meantime.
- The user can watch, stop or steer the run in the Autopilot dock. Steering text arrives with a later tool result: follow it.
- Pictures: `describe_frames` needs a vision model. Autopilot's guide assumes a frame-describer subagent, which only Claude Code and Codex get from `autopilot connect`. Call `describe_frames` only if this session's model reads images. Otherwise say the run could not check visuals, and base the report on state data.

## Phase 5: Report

When `report` says "Reported", the run is over. Ask:

> May I write this playtest report to `production/qa/playtests/autopilot-[date]-[slug].md`?

Then write the report with:

- Kind, request (verbatim), level, time limit used, and run id.
- Outcome: the verdict or achieved state, with Autopilot's reason and evidence.
- Findings, each marked **Unverified (Autopilot)**. Confirm a bug in the game before filing it with `/bug-report`.
- Recording location (the dock's run folder, `user://playtest/<time>/`), and cost or turns if the result shows them.
- This line, verbatim: "Automated playtest. Does not count toward human playtest sessions."

## Phase 6: Tell the user

Give the outcome in a few lines, the report path, and the open findings.

---

## Rules

- Autopilot results never count as human playtest sessions or as core-fantasy evidence (`gate-check`).
- Never modify the game's files through this skill.
- Never ask for API keys in chat.
- Do not run this on every PR or in CI. Runs take minutes and cost tokens.
