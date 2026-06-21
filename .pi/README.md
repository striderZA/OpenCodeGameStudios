# OCGS Pi Extensions

This directory contains Pi-specific extensions that enable the OpenCode Game Studios (OCGS) framework to work with the [Pi coding agent](https://pi.dev/).

## Architecture

Pi discovers `.agents/` content through the `ocgs-core` extension's `resources_discover` handler, which registers `.agents/skills/` and `.agents/commands/` with Pi's skill and prompt template systems. The other extensions register custom tools, commands, and lifecycle hooks.

## Extensions

| Directory | Registration | Purpose |
|-----------|-------------|---------|
| `ocgs-core` | `resources_discover` | Barrel: loads all extensions, discovers `.agents/` skills/commands |
| `ocgs-delegation` | `registerTool` + `registerCommand` | `Task` tool + `/consult` command for agent delegation |
| `ocgs-question` | `registerTool` | `question` tool with TUI for strategic decision capture |
| `ocgs-path-guard` | `tool_call` + `before_agent_start` | Dynamic injection of path-scoped rules from `.agents/rules/` |
| `ocgs-audit` | `session_start` + `tool_call` + `tool_result` + `agent_end` | Session/tool audit logging to `production/session-logs/` |
| `ocgs-drift-detector` | `resources_discover` + `tool_result` | Detects structural drift in `.agents/` files after writes |
| `ocgs-changelog` | `registerCommand` | `/changelog` command with TUI for conventional-commit changelogs |
| `ocgs-validate` | `resources_discover` + `tool_result` | Validates `.agents/` content for harness-neutral conformance |

## How Extensions Load

Pi auto-discovers extensions in `.pi/extensions/` at startup. The `ocgs-core/index.ts` barrel imports and registers all other extensions. Individual extension failures are caught and logged — no single failure blocks the rest.

## Dependencies

- `@earendil-works/pi-coding-agent` — ExtensionAPI, lifecycle events, tool registration (provided by Pi at runtime)
- `@earendil-works/pi-ai` — `StringEnum` utility for TypeBox schemas (provided by Pi at runtime)
- `typebox` — Schema definitions for tool parameters (provided by Pi at runtime)
- `minimatch` — Used by `ocgs-path-guard` for glob matching (declared in `ocgs-path-guard/package.json`)

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
