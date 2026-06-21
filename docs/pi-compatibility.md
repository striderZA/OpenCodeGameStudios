# Pi Compatibility Guide

OpenCode Game Studios (OCGS) supports the [Pi coding agent harness](https://pi.dev/) alongside OpenCode.

## Quick Start

1. Install Pi: `npm install -g @earendil-works/pi-coding-agent`
2. Clone this project: `git clone <repo> && cd <project>`
3. Start Pi: `pi`

All OCGS skills, commands, and agents are available automatically through the `.agents/` directory.

## Project Structure

```
.agents/                     ← Canonical content (harness-agnostic)
  agents/                    ← 51 agent definitions
  skills/                    ← 77 skill workflows
  commands/                  ← 54 slash commands
  rules/                     ← 11 path-scoped rules
  modules/                   ← 17 installable modules
.opencode/                   ← OpenCode-specific plugins & config
.pi/                         ← Pi-specific extensions & settings
```

## Available Pi Extensions

| Extension | Purpose |
|---|---|
| `ocgs-core` | Barrel: loads all OCGS extensions; discovers `.agents/` skills and commands |
| `ocgs-delegation` | `Task` tool for agent delegation, `/consult` for peer review |
| `ocgs-question` | Strategic decision capture with TUI picker |
| `ocgs-path-guard` | Path-scoped rules injected dynamically into system prompt |
| `ocgs-audit` | Session and tool audit logging |
| `ocgs-drift-detector` | Detects skill/agent structural drift |
| `ocgs-changelog` | Conventional-commit changelog generation |
| `ocgs-validate` | `.agents/` content validation |

## Key Concepts

- **`.agents/`** — canonical source of all agents, skills, commands, rules, and modules. Harness-neutral frontmatter.
- **`.pi/extensions/`** — Pi-specific extension implementations using `@earendil-works/pi-coding-agent` API.
- **Cross-harness names** — `Task`, `question`, and `/consult` work identically in OpenCode and Pi. Agent prompts are written once.

## Delegation

OCGS uses two delegation primitives:

1. **`Task` tool** — vertical delegation (Director → Lead → Specialist). Use `Task` when you need another agent to do work.
2. **`/consult <agent> [question]`** — horizontal peer review. Use `/consult` when you need a second opinion without delegating work.

## Path-Guard Rules

When the LLM works in certain paths (e.g., `src/ai/**`), matching rules from `.agents/rules/` are automatically injected into the system prompt. The status bar shows which rules are active: `rules: ai-code, engine-code`.

## Audit Log

All tool calls, delegations, and session events are recorded in `production/session-logs/agent-audit.log`. The format is byte-identical to the OpenCode audit log.

## Migration from .opencode/

If you have an existing OCGS project:

1. Run `node tools/migrate-to-agents.mjs` to migrate content from `.opencode/` to `.agents/`
2. Run with `--dry-run` first to preview
3. Use `--remove-old` to delete the original `.opencode/` content after verification
