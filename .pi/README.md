# OCGS Pi Extensions

This directory contains Pi-specific extensions that enable the OpenCode Game Studios (OCGS) framework to work with the [Pi coding agent](https://pi.dev/).

## Architecture

Pi discovers `.agents/` content through the `ocgs-core` extension's `resources_discover` handler, which registers `.agents/skills/` and `.agents/commands/` with Pi's skill and prompt template systems. The other extensions register custom tools, commands, and lifecycle hooks.

## Extensions

| Directory | Registration | Purpose |
|-----------|-------------|---------|
| `ocgs-core` | `resources_discover` | Discovers `.agents/` skills and commands; does not load other extensions |
| `ocgs-tool-map` | `before_agent_start` | Injects a per-harness tool map: `Task` → `task` (with `subagent_type` → `agent`, prompt → `task`, and required `solutionSpace`) and `question` → `ask` on omp; on Pi it says no `Task` tool exists and to use another delegation tool if installed |
| `ocgs-question` | `registerTool` + `tool_result` | `question` tool with TUI for strategic decision capture; logs omp `ask` answers to `agent-decisions.jsonl` |
| `ocgs-path-guard` | `tool_call` + `before_agent_start` | Dynamic injection of path-scoped rules from `.agents/rules/` (own matcher; no external dependency) |
| `ocgs-audit` | `session_start` + `tool_call` + `tool_result` + `agent_end` | Session/tool audit logging to `production/session-logs/` |
| `ocgs-drift-detector` | `session_start` + `resources_discover` + `tool_result` | Detects structural drift in `.agents/` files after writes |
| `ocgs-changelog` | `registerCommand` | `/generate-changelog` command with TUI for conventional-commit changelogs |
| `ocgs-validate` | `session_start` + `resources_discover` + `tool_result` | Validates `.agents/` content for harness-neutral conformance |
| `ocgs-hooks` | `session_start` + `agent_settled` + `session_compact` + `tool_call` + `tool_result` + `ui_prompt_start` | The 12 CCGS hooks: session context, commit and push guards, asset and skill checks, agent audit, compaction context, notifications. See `docs/pi-extensions.md` |

## How Extensions Load

Pi auto-discovers each `.pi/extensions/*/index.ts` module at startup. `ocgs-core`
only registers `.agents/` content paths; it is not a barrel. On Pi 0.85.1 a
module with a broken import aborts startup before any frame is sent. omp logs
the same failure and continues.

## Dependencies

- `@earendil-works/pi-coding-agent` — ExtensionAPI, lifecycle events, tool registration (provided by Pi at runtime)
- `typebox` — Schema definitions for tool parameters (provided by Pi at runtime)

## Settings

`.pi/settings.json` configures Pi-specific behavior:

```json
{
  "enableSkillCommands": true,
  "packages": []
}
```

- `enableSkillCommands: true` — enables Pi to invoke skills via `/command-name`
- `packages` — reserved for future `@ocgs/*` npm packages
