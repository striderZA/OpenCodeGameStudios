# oh-my-pi (omp) Compatibility

OpenCode Game Studios (OCGS) runs under [oh-my-pi](https://omp.sh/) (`omp`) alongside OpenCode and Pi. This page covers what omp loads natively, what this repo wires through `.omp/config.yml`, what does not carry over, the acceptance results, and the open issues.

omp loads the same `.pi/extensions/*` modules that Pi does. Nothing is copied into `.omp/`, so a fix to an extension applies to both harnesses.

## Quick Start

1. Install oh-my-pi. Tested with 18.16.0 (see [Tested Versions](#tested-versions)).
2. From the repository root (the directory with `AGENTS.md` and `.omp/`), run `omp`.
3. Generate the project agent roster: `node .opencode/modules/install.mjs add core --harness omp` (or run `/init-template --harness omp`). This writes `.omp/agents/*.md`; press `Ctrl`+`R` in `/agents` to reload the hub.

Project config is read from `.omp/config.yml` in the working directory. Launch from the repository root. Launching from `src/` loads no OCGS extensions (see [Acceptance Matrix](#acceptance-matrix), row 12).

## What Loads Natively

omp's built-in `agents` provider reads `.agents/` directly, so these load without wiring. This is from omp's source and docs; the acceptance matrix checks the observable behavior on a live run.

- Root `AGENTS.md` as context.
- `.agents/skills/*/SKILL.md` as skills, readable as `skill://<name>`, and invokable as `/skill:<name>` once `skills.enableSkillCommands` is on.
- `.agents/commands/*.md` as slash commands.
- `.agents/rules/*.md`, which load but are not applied on their own. See [Rules](#rules).

`.agents/agents/` does not load; the installer generates `.omp/agents/` from it. See [Generated Agents](#generated-agents).

## Generated Agents

omp reads project agents from `.omp/agents/<name>.md`. Install a module with `--harness omp` to generate one file per agent in `.agents/agents/`:

```bash
node .opencode/modules/install.mjs add core --harness omp
```

Each generated file carries `name` and `description`; the source body becomes the agent's instructions. `tools` is omitted, so the agent inherits the session's tool set. Add an explicit `tools` list to an individual `.omp/agents/<name>.md` when you want a narrower boundary. omp reads the nearest `.omp/agents` directory, so a project definition wins over a user-level one. Press `Ctrl`+`R` in `/agents` after generating or editing.

## What `.omp/config.yml` Wires

```yaml
extensions:
  - ./.pi/extensions/ocgs-audit
  - ./.pi/extensions/ocgs-changelog
  - ./.pi/extensions/ocgs-drift-detector
  - ./.pi/extensions/ocgs-hooks
  - ./.pi/extensions/ocgs-path-guard
  - ./.pi/extensions/ocgs-question
  - ./.pi/extensions/ocgs-tool-map
  - ./.pi/extensions/ocgs-validate
skills:
  enableSkillCommands: true
```

| Extension | Role on omp | Observed |
|---|---|---|
| `ocgs-audit` | Appends session and tool events to `production/session-logs/agent-audit.log` | `session_start` and `tool_call` lines (rows 6, startup) |
| `ocgs-changelog` | Shows the `ocgs-changelog` widget on `agent_end` when there are unreleased commits and no `CHANGELOG.md` | Row 9 |
| `ocgs-drift-detector` | Checks `.agents/` files for structural drift on startup and after writes | Row 8, row 7 |
| `ocgs-hooks` | Runs the 12 CCGS hooks: session context, commit and push guards, asset and skill checks, agent audit, compaction context (omp `session.compacting`), notifications | Load verified headlessly (see Verification). Not in the acceptance matrix |
| `ocgs-path-guard` | Injects path-scoped rules into the system prompt when a read, write, or edit matches a rule's `paths:` | Rows 4, 5 |
| `ocgs-question` | Registers the `question` tool (TUI picker, inactive by default on omp). Also logs omp `ask` answers to `agent-decisions.jsonl` through a `tool_result` hook | Row 10 (decision append, `rpc-ui`) |
| `ocgs-tool-map` | Injects a system-prompt mapping so skills that say `Task` use `task` (with `subagent_type` → `agent`, prompt → `task`, and required `solutionSpace`) and skills that say `question` use `ask` | Not covered by the matrix; see `tests/extensions/test-tool-map.test.mjs` |
| `ocgs-validate` | Validates `.agents/` content on startup and after writes | Rows 7, 8 |

## MCP Servers

omp reads MCP servers from `mcpServers` in `.omp/mcp.json` (project) and `~/.omp/agent/mcp.json` (user). This repository ships one entry, `autopilot`, disabled:

```json
{
  "mcpServers": {
    "autopilot": {
      "type": "stdio",
      "command": "autopilot",
      "args": ["mcp"],
      "enabled": false
    }
  }
}
```

To run `/autopilot-playtest`, set `enabled` to `true` and restart omp. Its tools are named `mcp__autopilot_<tool>`, for example `mcp__autopilot_start_run`. The `autopilot` command must be on PATH. In our test, the OpenCode V2 `mcp.servers` entry in `opencode.json` gave omp no Autopilot tools, so `.omp/mcp.json` is the entry that applies.

Module installs write here when you pass `--harness omp`. For example, `node .opencode/modules/install.mjs add art --harness omp` merges the Aseprite fragment into `.omp/mcp.json`; an existing server with the same name is left untouched.

## What Does Not Carry Over

| Item | On Pi | On omp | Reason |
|---|---|---|---|
| `ocgs-core` barrel | Loaded via explicit `-e`; discovery requires `-a` (see [Pi Notes](#pi-notes)) | Not wired | omp's agents provider reads `.agents/` directly, so the barrel is unnecessary |
| `ocgs-delegation` (`Task`, `/consult`) | Removed | Not wired | Pi exposes no sub-session API on `ExtensionContext`; the exported SDK path is unverified. omp uses its native `task`; `ocgs-tool-map` maps the names |
| `.agents/agents/` roster (52 agents) | Loaded inline as prompts; no subagent tool | Generated into `.omp/agents/` by the installer | omp reads `.omp/agents/`, not `.agents/agents/` |
| `.pi/settings.json` | Read | Not read | Set `skills.enableSkillCommands` in `.omp/config.yml` instead |

### Delegation

Pi 1.5.0's `ExtensionContext.sessionManager` is a `ReadonlySessionManager`: a
`Pick` of read-only accessors with no sub-session constructor. `newSession()`
and `fork()` exist only on `ExtensionCommandContext` and move the host session
instead of spawning a subagent. The former `ocgs-delegation` extension called
`sessionManager.inMemory(...)`, which does not exist, so `Task` and `/consult`
failed before any work started. It has been removed from `.pi/extensions/`.

omp's native `task` tool is the supported delegation path; it reads generated
definitions from `.omp/agents/`. `ocgs-tool-map` translates canonical `Task`
and `question` references at run time: `subagent_type` becomes `agent`, the
instructions go in the required `task` and `solutionSpace` fields, and
`question` becomes `ask`. `.agents/` content does not need a rewrite.

The package root also exports `createAgentSession()` and
`SessionManager.inMemory()`. A nested-session implementation through that path
was not evaluated, so the Pi retirement is a tradeoff rather than proof that
delegation is impossible.

### Rules

omp sorts rules by frontmatter. `alwaysApply: true` places a rule in the always-apply set. A `description` places it in the rulebook. A rule with neither is dropped. OCGS's 11 rules declare only `paths:`, so omp neither lists nor applies them natively. Path scoping comes only from `ocgs-path-guard`.

Decision: keep `.agents/rules/` unchanged and rely on path-guard. [INFERENCE] This is from a static read of the omp 18.16.0 bundle. Rows 4 and 5 check the injected rule status.

## Known Issues Found and Fixed

1. **System prompt shape (path-guard).** Pi passes `event.systemPrompt` as a string; omp passes `string[]`. path-guard now handles both.
2. **Edit paths (path-guard, validate, drift).** Pi's `edit` takes `path`. omp's `edit` takes `input`, hashline text with `[PATH#TAG]` headers, and no `path`. All three extensions now read both shapes. validate and drift also had post-write handlers that read `input.path` only, so they missed omp edits; both now read the headers too.
3. **Drift `await` (drift).** `checkFileForDrift` is async. The startup loop counted an unresolved Promise, so the count never moved. The loop now awaits it.
4. **Startup trigger (validate, drift).** Startup scans ran on `resources_discover`. omp's docs list that event but name no session call site, so the scans moved to `session_start`, which omp fires. Pi also runs them once per session through a guard. Row 8 checks the real omp startup path.
5. **Retired test.** `test-path-guard.test.mjs` reimplemented the matcher and never imported the extension. It is replaced by `test-path-guard-contract.test.mjs`, which imports the real module.
6. **False dependency claim.** `.pi/README.md` said path-guard depends on `minimatch`, declared in a `package.json` that does not exist. path-guard uses its own matcher. The claim was removed.
7. **Decision log for omp `ask` (ocgs-question).** omp's built-in `ask` never writes `agent-decisions.jsonl`. `ocgs-question` now logs `ask` answers from a `tool_result` hook, using the pure helper `ask-log.ts` (6 unit tests). The `question` tool path is unchanged.
8. **Pi delegation retired (ocgs-delegation).** Pi's extension context exposes no sub-session constructor, so `Task` and `/consult` could not start. The extension was removed. `ocgs-tool-map` now injects the per-harness mapping on both Pi and omp.

## Acceptance Matrix

Run on 2026-11-03 and 2026-11-04. The matrix is run headlessly through `omp --mode rpc` and `pi --mode rpc`, and through `omp --mode rpc-ui` for the ask rows (`ask` is not registered in plain `rpc`). [INFERENCE] TUI-only behavior (the `question` picker, the trust prompt) is not covered by these results.

| # | Scenario | Pass means | omp 18.16.0 | Pi 0.85.1 |
|---|---|---|---|---|
| 1 | Startup load | Gate passes; the six status-emitting extensions bind (hooks and tool-map verified separately) | PASS. All six act in a default session: validate and drift status (rows 7, 8), path-guard `rules:` status (rows 4, 5), audit lines (row 6), changelog widget (row 9), and the `ocgs-question` decision hook (row 10). The `question` tool itself stays inactive by default | PARTIAL. Trusted discovery (`-a`) binds OCGS; validate and drift status observed, and the changelog widget in row 9. Audit, path-guard, and question not individually observed at startup |
| 2 | Skill command | `/skill:help` runs | PASS. Output is the OCGS help workflow | BLOCKED: model unavailable (see [Pi Notes](#pi-notes)) |
| 3 | Slash command | `/help` from `.agents/commands` runs | PASS. Reads `skill://help` | BLOCKED: model unavailable |
| 4 | Path-guard, read/write | `read` or `write` of `src/ai/x.gd` injects `ai-code` | PASS. `rules: ai-code` on the turn after a read, and again after a write | BLOCKED: needs model tool calls |
| 5 | Path-guard, edit | `edit` of `src/ai/x.gd` injects `ai-code` | PASS. Edit-only session, using a `[PATH#TAG]` header: next turn shows `rules: ai-code` | BLOCKED: needs model tool calls |
| 6 | Audit | An edit appends to `agent-audit.log` | PASS. `tool_call` lines for `edit` and `write` appear | BLOCKED: needs model tool calls |
| 7 | Validate | Malformed `.agents/skills/x/SKILL.md` reported after `write` and after `edit` | PASS. Both raw tool results carry `[ERROR] ... Missing YAML frontmatter` | BLOCKED: needs model tool calls |
| 8 | Startup scans | Validation report and drift status appear once at start | PASS (headless RPC; the criterion names an interactive run, which was not exercised). Validate status and warn notify, drift status, each once | PASS (headless RPC with `-a`; same caveat). Same three signals, once each |
| 9 | Changelog | `agent_end` notice with unreleased commits and no `CHANGELOG.md` | PASS. `setWidget ocgs-changelog` on `agent_end` with `CHANGELOG.md` moved aside (restored after) | PASS. Same widget on four `agent_end` frames, including error turns |
| 10 | Question | Tool renders and appends to `agent-decisions.jsonl` | PASS (`rpc-ui`). Built-in `ask` renders a select dialog, returns `User selected: Red`, and `ocgs-question` appends `{"source":"ask", ...}`. The `question` tool's TUI picker is not run. Plain `rpc` and print mode have no `ask` tool | BLOCKED: needs model tool calls |
| 11 | Failure isolation | A broken module path leaves the others loaded and logs the error | PASS. Broken import is logged; the good extension still loads | FAIL. One broken module aborts Pi's startup before any frame is sent (see [Pi Notes](#pi-notes)) |
| 12 | cwd | Launched from `src/`; behavior observed and documented | OBSERVED. No OCGS extension loads from `src/`. The project config is read from the working directory [INFERENCE: no ancestor walk, from the plan]. No new `session_start` audit line on that run | OBSERVED. No OCGS extension loads from `src/`, even with `-a`. From the repo root the same flags load them. Only global Pi packages load (`pi-lens-lsp`) |

**Status key:** PASS = criterion observed. PARTIAL = some criteria observed, others not. FAIL = criterion contradicted by a run. BLOCKED = not run. OBSERVED = no pass/fail criterion; behavior recorded.

**Counts (12 rows).** omp: 11 PASS, 1 OBSERVED (row 12). This changed from 9 PASS, 1 PARTIAL, 1 FAIL on new evidence: row 10 now passes through `ask` in `rpc-ui`, and the `ocgs-question` hook firing in a default-config run shows all six observed extensions act, so row 1 is PASS. `ocgs-hooks` load is verified separately in [Verification](#verification). Pi: 2 PASS (rows 8, 9), 1 PARTIAL (row 1), 1 FAIL (row 11), 7 BLOCKED (rows 2–7, 10), 1 OBSERVED (row 12). The Pi row 11 FAIL is Pi-only; omp passes row 11.

### Deviations from the plan

- **Row 8** was run through RPC, not an interactive TUI session. The startup status and notify frames are the observed output.
- **Verification profile.** The first omp run used `--profile ocgs-verify`. Its first model call failed with `404 ... Function ... Not found for account` (exit 1). The acceptance runs used the default profile instead, with `--max-cost 0.10` on every model call.
- **Row 10** runs through omp's built-in `ask`. It is registered only in interactive and `rpc-ui` modes. Plain `--mode rpc` has no `ask` tool, which is why the first omp run in plain `rpc` failed.
- **Row 1** on omp: all six act. The `question` tool itself stays inactive by default; see Open Issues.
- **Matrix predates `ocgs-tool-map`.** The extension was added after these runs. Its prompt injection is covered by `tests/extensions/test-tool-map.test.mjs`, not by these rows.
- **Rows 2–7 and 10 on Pi** were not run (see [Pi Notes](#pi-notes)).

## Open Issues

- **`question` is not active on omp by default; `ask` is the omp equivalent.** omp registers `question` and leaves it inactive. None of the 599 keys in `omp config list` enables extension tools, and `disabledExtensions` is empty. omp's built-in `ask` is enabled by default (`ask.enabled: true`) and does the same job. One sample: when prompted with the agent wording "Use `question`", the model called `ask` under `rpc-ui` (n=1). About 110 files under `.agents/` say "use `question`". Renaming them changes canonical content and needs sign-off. Decision: keep the wording; `ocgs-tool-map` injects the `question` → `ask` mapping at run time.
- **The `question` tool is still TUI-only.** It logs to `agent-decisions.jsonl` only after its picker answers, and its picker has not been run on omp. `ask` answers are logged headlessly by the hook in `ocgs-question`.
- **Pi aborts startup on a broken extension.** See [Pi Notes](#pi-notes). This contradicts the claim in `.pi/README.md` ("Individual extension failures are caught and logged"). That claim is not true on Pi 0.85.1.

## Pi Notes

These were found while running the Pi baseline. They are Pi 0.85.1 behavior, not omp behavior.

- **Project extensions need trust.** Pi discovers `<repo>/.pi/extensions/*` only for trusted projects. Headless runs must pass `-a` (`--approve`), which "trusts project-local files for this run". Without it, no OCGS extension loads, and there is no output and no error on stderr.
- **Global packages load in discovery mode.** `~/.pi/agent/settings.json` lists packages (for example `pi-subagents`, `pi-lens`). They load alongside OCGS and add their own statuses and widgets. `-ne` disables discovery, and explicit `-e` paths still load.
- **One broken module aborts startup.** A module with a missing import makes Pi print `Failed to load extension ... Cannot find module` and exit before any frame. This holds for explicit `-e` paths and for discovered modules. omp logs the same failure and continues.
- **No `ready` frame and no `prompt_result`.** Pi 0.85.1's RPC sends neither. Completion is signalled by `agent_settled`.
- **Model access blocked during this run.** Pi's stored `opencode` and `opencode-go` keys return `401 api_key_expired`. The `opencode-go` default model returns `400 Model is unavailable`. NVIDIA models returned `410` (`deepseek-ai/deepseek-v4-flash-0731`) and `404` (`moonshotai/kimi-k2.6`). `NVIDIA_API_KEY` is set, but no reachable NVIDIA model answered. Rows 2–7 and 10 on Pi need a live model, so they are not run. Row 9 ran because its handler fires on `agent_end` even when the turn errors.

## Where Load Errors Appear

- **omp:** extension import and factory errors are logged to `~/.omp/logs/omp.*.log` at `error` level. omp isolates each extension, so one failure does not stop the others.
- **Pi:** load errors are printed to stderr and abort startup (see [Pi Notes](#pi-notes)).
- Startup and post-write validation: `production/session-logs/ocgs-validation-report.md`.
- Audit trail: `production/session-logs/agent-audit.log`.
- Drift count: TUI status bar, `drift: N files`.

## Verification

- `npm run test:extensions` covers the extension modules, the ask decision mapping, and the `ocgs-hooks` port: 61 tests pass (36 for `ocgs-hooks`, including the subagent stop regression).
- `npm run test:omp` covers the omp config wiring: 3 tests pass.
- `ocgs-hooks` loads on omp: `omp --mode rpc` with no prompt exits 0 with empty stderr, the factory's `Plugin loaded` audit line appears, and the `session_start` summary is notified. Model-driven behavior (compaction injection, notification UI) was not run.
- `npm run test:framework` passes.
- The acceptance runs use `--max-cost 0.10` on every omp model call. The `ocgs-verify` profile is not used; see [Deviations](#deviations-from-the-plan).
- MCP (Autopilot): with omp's default agent directory and model, `mcp__autopilot_start_run` ran with `enabled: true` and returned the real server's not-running answer, and with `enabled: false` the model reported no such tool. A minimal stdio probe server also ran as `mcp__probe_ping` in the same setup. An isolated `PI_CODING_AGENT_DIR` connected the server but offered no MCP tools to the model, so these checks use the default directory.

## Tested Versions

| Harness | Version | Host |
|---|---|---|
| oh-my-pi | 18.16.0 | Windows 11 (26200) |
| Pi | 0.85.1 (`@earendil-works/pi-coding-agent`) — baseline for this matrix; Autopilot MCP was separately verified on Pi 1.5.0 | Windows 11 (26200) |
