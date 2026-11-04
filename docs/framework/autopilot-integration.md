# Autopilot Integration

**Status**: Accepted (Phase 1)
**Date**: 2026-11-04
**Scope**: this framework repository. Game architecture decisions go in `docs/architecture/` once a game exists.
**Harness target**: OpenCode V2 (2.x). Pre-V2 OpenCode is not supported.
**Upstream**: https://github.com/ramenvr/autopilot (by Aura, Apache-2.0)

## Decision

Autopilot is an optional MCP tool, used from OpenCode V2, Pi and omp:

- `opencode.json`: `mcp.servers.autopilot` is `{"type": "local", "command": ["autopilot", "mcp"], "disabled": true, "codemode": false}`. A session enables it by setting `disabled` to `false`.
- `.omp/mcp.json` (omp, project): `mcpServers.autopilot`, with `enabled` set to `false`. A session enables it by setting `enabled` to `true`, then restarting omp.
- Skill `autopilot-playtest` in the `qa` module (`.agents/modules/qa/skills/`). Its Setup section holds the per-project steps.
- Command `/autopilot-playtest` (`.agents/modules/qa/commands/`).
- Reports go to `production/qa/playtests/autopilot-<date>-<slug>.md`, labelled as automated evidence.

## Rationale

- **MCP, not vendoring the addon.** The Godot addon is third-party and versioned per project. Vendoring would duplicate it and ship it into the game unless excluded. Install it per project from Autopilot's download.
- **MCP, not `autopilot connect`.** `connect` only targets Claude Code and Codex. The MCP entry is harness-neutral.
- **`codemode: false`.** V2 routes MCP tools through Code Mode by default, so they are reached via `execute`. The framework's skills name MCP tools directly (`start_run`, `create_canvas`, `run_project`), so the servers expose their tools directly.
- **Bring-your-own keys, no Aura.** Owner decision.
- **Sharing off.** Autopilot's documented privacy step is on by default and sends recordings, screenshots, traces and memories to its developers. Turn it off during setup.
- **Not a replacement for `automated-smoke-test`.** The smoke test checks engine output cheaply, with no model. Autopilot judges gameplay and costs tokens and minutes.
- **Never counts as a human playtest.** `gate-check` requires human sessions. Autopilot runs are labelled as automated evidence.
- **CI replay deferred.** `autopilot run <harness.py>` needs a running agent service and a decision-model key. Neither is verified in CI.

## Rejected alternatives

- **Vendor the addon.** Drifts from the supported version and ships into the game.
- **Aura sign-in.** Owner decision.
- **Replace `automated-smoke-test`.** Different jobs (above).

## Verified behaviour (2026-11-04)

Tested with OpenCode V2 2.2.5, installed from npm (`@opencode/cli`) into a scratch prefix. `autopilot` was installed from GitHub into a scratch venv. The model was scripted, so these checks cover tool access and plumbing, not model judgment. No game, editor, or keys were involved.

- **V2 schema.** V2 reads `plugins` (plural), `mcp.servers`, `permissions` (an ordered array), and `commands`. The V1 shapes (`mcp` with direct children, `enabled`, a `permission` object, `command`) are accepted without error and then ignored. Before this migration, the repo's MCP servers and permission rules were not in effect under V2.
- **Deny rules take effect.** Under the migrated config, `git reset --hard HEAD` returns `Permission denied`. Under the HEAD config, the same command runs. `echo hi`, which no rule matches, runs under both.
- **Autopilot tools.** With the server enabled, the model is offered 14 `autopilot_*` tools directly. Measured startup: about 5 s from run start, with a warm venv and the real MCP server. The first model turn can run before the tools appear, so the skill checks for `autopilot_start_run` and makes up to 20 read-only calls to wait for it before starting. An earlier "10 s" figure came from a delay I had added to the mock, so it is not a startup measurement. Cold-start time on a user's machine is unmeasured. `autopilot_start_run` reached the real server, which answered that the agent service isn't running.
- **Skill loading.** The skill loads from `.agents/skills/`, which is on V2's search path. V2 ignores the `allowed-tools` frontmatter, as V1 did, so it does not restrict the Autopilot tools.
- **Enabling.** An inline `OPENCODE_CONFIG_CONTENT` override did not enable a server that the project config disables. Setting `disabled` to `false` in the project config did.
- **Slash commands.** `opencode run` passes `/autopilot-playtest ...` to the model as plain text, even with `.opencode/commands/` materialized. Command expansion is not verified headlessly. The skill is the verified entry point.
- **Not verified:** a live run in the Godot editor, and the bare `autopilot` command resolving on PATH. The test used the absolute path.

## Pre-V2 removal (this change)

- `opencode.json` moved to the V2 schema (`mcp.servers`, `disabled`, `permissions`, `commands`).
- `.opencode/modules/install.mjs` merges and removes MCP servers under `mcp.servers`.
- MCP fragment `art/mcp/aseprite.json` (both module trees): `enabled` removed, `codemode: false` added.
- Unity MCP instructions (`setup-engine` in three copies, `quick-start.md`, `setup-requirements.md`) use the V2 shape.
- `.opencode/plugins/README.md`: the V1 `bash` tool name in the example is now `shell`. The V1 hook and logging comparisons are removed.
- `docs/CONTRIBUTING.md`: the V1 `@opencode-ai/plugin` package is now `@opencode/plugin`.

## Known gaps

1. **Two tracked module trees.** `.opencode/modules/` (224 files; the installer reads it) and `.agents/modules/` (220 files) both exist. The V2 edits went to both where the same text existed. Consolidating them is a separate decision.
2. **Windows symlinks.** On this checkout, `.opencode/skills`, `.opencode/commands`, `.opencode/agents`, and `.opencode/rules` are git symlinks checked out as text stubs. Skills still load from `.agents/skills/`. Command expansion may depend on `.opencode/commands/` (unverified).
3. **Playtest folders.** Normalized to `production/qa/playtests/`: `playtest-report`, `autopilot-playtest`, `gate-check`, `soak-test`, and the gate artifact globs in `.agents/modules/core/docs/workflow-catalog.yaml` and `tests/workflow/gates.mjs` all point there. `qa-plan`, `story-done`, and `test-evidence-review` still use `production/session-logs/` for some records.
4. **Engine version.** Autopilot's Godot addon documents Godot 4.7 or later and is tested on 4.7.2 (`plugin/godot/README.md`). The addon has no runtime version check, so 4.6 is untested. `docs/engine-reference/godot/` is now pinned to 4.7.2. The Autopilot offer in `/setup-engine` is gated to a chosen engine of Godot, Godot 4.7+, and OpenCode, Pi or omp.
5. **Not done:** excluding `addons/autopilot/*` from release presets, and creating the Godot project. Both need a game project.
6. **Pre-existing, not changed here:** the plugin README names `session.compacted` for post-compaction notifications. The PR #108 review flagged a possible V2 event rename (`session.compaction.ended`).
7. **Harness scope.** Autopilot's MCP wiring is verified on OpenCode 2.2.5, where a scripted-model run reached the real server, and on Pi 1.5.0. On Pi, `pi mcp list` showed a connection and 14 tools with `exposure: "direct"`, and `enabled: false` stayed disconnected. A scripted-model run under Pi offered the model 14 `mcp__autopilot__*` tools with `exposure: "direct"`, and the model called `mcp__autopilot__start_run`, which reached the real server and returned its not-running answer. With the default `codemode` exposure, the model was offered only `codemode`, so the Autopilot tools were not visible to it. The scripted model tests tool access, not model judgment; a real model run under Pi is not tested. Pi ignores a project `.pi/mcp.json` until the project is trusted, so the setup offer points to the user-level file. The installer skips MCP fragments for Pi. The godot-mcp and unity-mcp sections in `/setup-engine` name `pi.json` for Pi, but Pi reads `mcp.json`; those sections are wrong and are not changed here.
8. **omp (oh-my-pi 18.16.0).** `.omp/mcp.json` holds `mcpServers.autopilot`, disabled. With the default agent directory and model, `enabled: true` and `autopilot` on PATH reached the real server: the model called `mcp__autopilot_start_run` and got the not-running answer. With `enabled: false`, the model reported no such tool. The `/mcp list` command is in omp's docs but was not run here. Isolating omp with `PI_CODING_AGENT_DIR` connected the server but offered its tools to nobody, so the checks use the default directory.

## Files changed

- `opencode.json`: V2 schema, with the autopilot server disabled.
- `.omp/mcp.json`: omp project MCP entry for the autopilot server, disabled.
- `.opencode/modules/install.mjs`: MCP merge and removal under `mcp.servers`.
- `.agents/modules/qa/` and `.agents/skills/autopilot-playtest/`: skill and command (module source and installed copy), `modulefile.yaml` and `installed.json` entries.
- `.agents/modules/art/mcp/aseprite.json` and `.opencode/modules/art/mcp/aseprite.json`: fragment shape.
- `.agents/modules/core/skills/setup-engine/SKILL.md`, `.opencode/modules/core/skills/setup-engine/SKILL.md`, `.agents/skills/setup-engine/SKILL.md`: Unity MCP instructions.
- `docs/framework/quick-start.md`, `docs/framework/setup-requirements.md`: Unity MCP instructions.
- `.opencode/plugins/README.md`, `docs/CONTRIBUTING.md`: V2 wording.
- `AGENTS.md`, `docs/framework/directory-structure.md`, `docs/framework/skills-reference.md`: skill and command counts (78), and `/autopilot-playtest` in the QA row of `AGENTS.md`.
- Framework validator: 209/209 pass.
