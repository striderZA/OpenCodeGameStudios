# Pi Compatibility Guide

OpenCode Game Studios (OCGS) supports the [Pi coding agent harness](https://pi.dev/) alongside OpenCode and oh-my-pi (`omp`).

## Quick Start

1. Install Pi: `npm install -g @earendil-works/pi-coding-agent`
2. Clone this project: `git clone <repo> && cd <project>`
3. Start Pi: `pi`

All OCGS skills and commands are available through `.agents/`. The 52 agent
definitions are present, but the `Task` delegation path has a known defect (see
[Delegation](#delegation)); treat agent definitions as prompts until it is fixed.
Tested baseline: Pi 0.85.1. Autopilot MCP wiring was separately verified on Pi 1.5.0.

## Project Structure

```
.agents/                     ← Canonical content (harness-agnostic)
  agents/                    ← 52 agent definitions
  skills/                    ← 78 skill workflows
  commands/                  ← 78 slash commands
  rules/                     ← 11 path-scoped rules
  modules/                   ← 22 installable modules
.opencode/                   ← OpenCode-specific plugins & config
.pi/                         ← Pi-specific extensions & settings
.omp/                        ← oh-my-pi config and MCP
```

## Available Pi Extensions

| Extension | Purpose |
|---|---|
| `ocgs-core` | Discovers `.agents/` skills and commands via `resources_discover` |
| `ocgs-delegation` | `Task` tool for agent delegation, `/consult` for peer review (known defect; see below) |
| `ocgs-question` | Strategic decision capture with TUI picker; logs omp `ask` answers |
| `ocgs-path-guard` | Path-scoped rules injected dynamically into system prompt |
| `ocgs-audit` | Session and tool audit logging |
| `ocgs-drift-detector` | Detects skill/agent structural drift |
| `ocgs-changelog` | Conventional-commit changelog generation (`/generate-changelog`) |
| `ocgs-validate` | `.agents/` content validation |
| `ocgs-hooks` | The 12 CCGS lifecycle hooks, shared with omp |

## Key Concepts

- **`.agents/`** — canonical source of all agents, skills, commands, rules, and modules. Harness-neutral frontmatter.
- **`.pi/extensions/`** — Pi-specific extension implementations using `@earendil-works/pi-coding-agent` API.
- **Cross-harness names** — `Task`, `question`, and `/consult` are intended to work identically in OpenCode and Pi. omp exposes `ask` instead of `question` and does not wire `ocgs-delegation`; see the omp guide.

## Detailed Documentation

| Guide | Description |
|---|---|
| [`docs/pi-extensions.md`](pi-extensions.md) | Full reference for every Pi extension — tools, commands, events, and schemas |
| [`docs/pi-workflow.md`](pi-workflow.md) | Day-to-day workflow differences between OpenCode and Pi |
| [`docs/omp-compatibility.md`](omp-compatibility.md) | oh-my-pi (omp) setup, extension wiring, and known gaps |
| [`.pi/README.md`](../.pi/README.md) | Extension directory overview and dependency info |

## Delegation

OCGS uses two delegation primitives:

1. **`Task` tool** — vertical delegation (Director → Lead → Specialist). Use `Task` when you need another agent to do work.
2. **`/consult <agent> [question]`** — horizontal peer review. Use `/consult` when you need a second opinion without delegating work.

**Known defect:** `ocgs-delegation` calls `ctx.sessionManager.inMemory(...)`. In
the Pi 0.85.1 types, `ctx.sessionManager` is a read-only `Pick` with no
`inMemory`, so the call is expected to throw before a subagent starts. This is
documented in `docs/omp-compatibility.md`; it has not been reproduced at runtime.
Until it is fixed, use `question`/`ask` for decisions and direct file reads for
specialist context instead of relying on `Task` or `/consult`.

## Path-Guard Rules

When the LLM works in certain paths (e.g., `src/ai/**`), matching rules from `.agents/rules/` are automatically injected into the system prompt. The status bar shows which rules are active: `rules: ai-code, engine-code`.

## Audit Log

All tool calls, delegations, and session events are recorded in `production/session-logs/agent-audit.log`. The format is byte-identical to the OpenCode audit log.

## Migration from .opencode/

If you have an existing OCGS project:

1. Run `node tools/migrate-to-agents.mjs` to migrate content from `.opencode/` to `.agents/`
2. Run with `--dry-run` first to preview
3. Use `--remove-old` to delete the original `.opencode/` content after verification

## Windows Symlink Setup

`.opencode/{agents,commands,skills,rules}` are git symlinks pointing at the
canonical `.agents/*` directories. On Windows, git only checks these out as
real symlinks if `core.symlinks=true` is set (and Developer Mode/admin rights
are enabled) **before** cloning. Otherwise they check out as inert stub files
containing the link-target text, and OpenCode's `.opencode/`-based discovery
silently finds nothing (Pi is unaffected — it reads `.agents/` directly).

Fix: `git config --global core.symlinks true` + enable Developer Mode, then
re-clone (or run `git checkout -- .opencode` after enabling). Alternatively,
run `node tools/fix-opencode-symlinks.mjs` to detect and repair inert stub
files in an existing checkout.
