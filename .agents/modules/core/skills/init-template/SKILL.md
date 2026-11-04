---
name: init-template
description: "First-time repo setup for new projects. Transforms the cloned OCGS template into a clean, ready-to-use game project with your own identity and harness."
argument-hint: "[--reset-git] [--name \"My Game\"] [--engine godot|unity|unreal|sfml3|raylib|bevy] [--harness opencode|pi|omp|claude|codex]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Write, Edit, Bash, question, Task
---

When this skill is invoked:

## Phase 1: Parse Arguments

Check if CLI arguments were passed (from `argument-hint`):

- `--name "My Game"` → sets game name (skips the name question below)
- `--engine godot|unity|unreal|sfml3|raylib|bevy` → sets engine (skips engine question)
- `--harness opencode|pi|omp|claude|codex` → sets harness (skips harness question)
- `--reset-git` → automatically offers git reset (skips the prompt)

If `--name`, `--engine`, and `--harness` are all provided, skip the interactive prompt entirely and proceed to Phase 2 using the provided values.

Otherwise, use `question` to gather missing details:

### Tab 1: Project Identity
- **What is your game's name?** (e.g., "My Game")
- **What is your game's one-line description?** (e.g., "A 2D platformer about a cat in space")

### Tab 2: Engine & Genre
- **Which engine are you using?** (godot / unity / unreal / sfml3 / raylib / bevy)
- **What genre best describes your game?** (e.g., platformer, RPG, puzzle, FPS, strategy)

### Tab 3: Team
- **Team size** (solo / small 2-5 / medium 6-15 / large 16+)

### Tab 4: Agent Harness
- **Prompt**: "Which agent harness will you use for this project?"
- **Options**: `OpenCode` / `Pi` / `oh-my-pi (omp)` / `Claude Code` / `Codex`

The template ships configuration for all five. The answer selects the module install target, the MCP config file, and the harness config this skill validates. It does not delete the others unless the user asks in Phase 7.

| Harness | Content target | MCP file | Notes |
|---------|----------------|----------|-------|
| OpenCode | `.opencode/{agents,skills,commands,rules}` | `opencode.json` (`mcp.servers`) | Windows checkouts may need `node tools/fix-opencode-symlinks.mjs` |
| Pi | `.agents/{agents,skills,commands,rules}` | `.pi/mcp.json` (`mcpServers`) | Project MCP loads only after the project is trusted |
| omp | `.omp/agents` + `.agents/{skills,commands,rules}` | `.omp/mcp.json` (`mcpServers`) | Agents are generated into `.omp/agents/`; they inherit the session tool set |
| Claude Code | `.claude/{agents,skills,commands,rules}` | `.mcp.json` (`mcpServers`) | Agents gain `name:` frontmatter; project MCP needs approval |
| Codex | `.codex/agents` + `.agents/skills` | `.codex/config.toml` (`[mcp_servers.*]`) | Agents are converted to TOML; commands and path-rules do not map |

## Phase 2: Install Modules

Install the desired framework modules for the selected harness. Pass `--harness` on every command. `add` is idempotent: modules already present in the harness install state are skipped.

```bash
# Required
node .opencode/modules/install.mjs add core --harness <harness>

# Engine specialists (choose the module matching --engine)
node .opencode/modules/install.mjs add engine-godot --harness <harness>   # or engine-unity / engine-unreal / engine-sfml3 / engine-raylib / engine-bevy

# Common starter set
node .opencode/modules/install.mjs add art design ui qa release prototyping --harness <harness>
```

Use `--force` only to refresh files after an upgrade; it overwrites existing module files and refreshes the install record.

Available modules (run `node .opencode/modules/install.mjs list --harness <harness>` to see all):

| Module | Description |
|--------|-------------|
| `core` | Framework skeleton (required) |
| `art` | Aseprite MCP, art generation, art bible |
| `design` | Game mechanics, systems design, combat |
| `architecture` | Technical planning, ADRs |
| `stories` | Epics, stories, dev workflow, code review |
| `programming` | Gameplay, AI, engine, network agents + rules |
| `ui` | UX design, UI programming, accessibility |
| `audio` | Audio direction, sound design |
| `narrative` | Story, world-building, dialogue |
| `level-design` | Level layout, encounter design |
| `qa` | Testing strategy, bug tracking, profiling |
| `release` | Release management, sprints, changelogs |
| `prototyping` | Rapid prototyping, exploration |
| `live-ops` | Post-launch content, community |
| `localization` | i18n, translation pipeline |
| `engine-godot` | Godot 4 specialists |
| `engine-unity` | Unity specialists |
| `engine-unreal` | Unreal Engine 5 specialists |
| `engine-sfml3` | SFML 3 specialist |
| `engine-raylib` | Raylib specialist |
| `engine-bevy` | Bevy specialists |
| `data` | Data file conventions |

If a module has an MCP fragment for the selected harness, the installer merges it into that harness's MCP file. If the server already exists, it is left untouched and reported as skipped.

Agent installation differs by harness: omp definitions are generated into
`.omp/agents/`, Claude Code definitions gain the required `name:` frontmatter in
`.claude/agents/`, and Codex definitions are converted to
`.codex/agents/*.toml`. OpenCode and Pi use `.agents/agents/` content directly.

## Phase 3: Replace README.md

Write a fresh README.md to the project root. Use a template structure like:

````markdown
# [Game Name]

> [One-line description]

Built with [Engine] using [OpenCode Game Studios](https://github.com/striderZA/OpenCodeGameStudios).

## Quick Start

```bash
[harness command]
```

Type `/start` for onboarding, or browse all skills with `/`.

## Project Structure

```
/
├── src/              # Game source code
├── assets/           # Game assets (art, audio, vfx)
├── design/           # Game design documents
├── docs/             # Technical documentation
└── production/       # Sprint plans, session logs
```

## License

[Choose a license]
````

Replace `[Game Name]`, `[One-line description]`, `[Engine]`, and `[harness command]` with the user's answers from Phase 1. Harness commands: `opencode`, `pi`, `omp`, `claude`, `codex`.

## Phase 4: Update AGENTS.md

Read AGENTS.md and update:
- Set the engine to the user's choice by changing the `## Technology Stack` section
- Add `- **Agent Harness**: [OpenCode 2.x | Pi 1.x | oh-my-pi 18.16.0+ | Claude Code | Codex]` to `## Technology Stack`
- Remove or update any project-specific settings
- If AGENTS.md is missing or malformed, warn and skip this phase

## Phase 5: Configure the Selected Harness

Read and validate only the config for the selected harness. If a file is missing or malformed, warn and skip that item.

### OpenCode
- Read `opencode.json`; remove internal-only plugin paths and keep `./.opencode/plugins/ccgs-hooks.ts` only if that file exists.
- On Windows, check whether `.opencode/{agents,skills,commands,rules}` are directories. A git checkout without symlink support writes them as one-line text stubs. If any is a file, run:
  ```bash
  node tools/fix-opencode-symlinks.mjs
  ```
- Re-check that all four paths are directories before reporting success.

### Pi
- Read `.pi/settings.json`; ensure `"enableSkillCommands": true`.
- MCP entries live in `.pi/mcp.json`. Tell the user that Pi reads this file only after the project is trusted.

### oh-my-pi (omp)
- Read `.omp/config.yml`; ensure the OCGS extensions are listed.
- MCP entries live in `.omp/mcp.json`.
- `add --harness omp` generates `.omp/agents/*.md` from `.agents/agents/`. Each definition carries `name` and `description` and inherits the session tool set.
- Reload the agent hub with `Ctrl`+`R` in `/agents` after generation.

### Claude Code
- Claude Code reads `AGENTS.md` natively from v2.1.277. For older versions, and as a harmless fallback, create `CLAUDE.md` at the project root containing only:
  ```markdown
  @AGENTS.md
  ```
- Do not create `CLAUDE.md` if one already exists.
- MCP entries live in `.mcp.json`. Tell the user the first interactive session asks for approval.

### Codex
- Codex reads `AGENTS.md` natively; no instruction file is needed.
- Custom agents live in `.codex/agents/*.toml`; `add --harness codex` generates them from `.agents/agents/`.
- MCP entries live in `.codex/config.toml` under `[mcp_servers.<name>]`. Codex loads project `.codex/` config only after the project is trusted.
- Codex has no project-level slash commands and no path-scoped rule equivalent; skills and `AGENTS.md` carry those workflows.

## Phase 6: Remove Internal Files

For each file/directory below, check existence first before deleting. If the directory already has user-created content, warn and skip rather than destroying it:

- `rm -f UPGRADING.md CONTRIBUTING.md SECURITY.md CODE_OF_CONDUCT.md`
- Clear `design/` contents only if empty of user files: `if ls design/*.md >/dev/null 2>&1; then echo "WARNING: design/ has content, skipping"; else rm -rf design/*; fi`
- Clear `src/` contents only if empty of user files: `if ls src/*.gd src/*.cs src/*.cpp src/*.ts >/dev/null 2>&1; then echo "WARNING: src/ has code files, skipping"; else rm -rf src/* && touch src/.gitkeep; fi`
- Clear `production/` contents only if empty of user files: similar guard
- On any error (file locked, permission denied), warn and continue to next item

## Phase 7: Optional Harness Pruning

Ask with `question`:

- **Prompt**: "This project is set up for [harness]. Do you want to keep the other harness configs so you can switch later, or remove them?"
- **Options**:
  - `Keep all harness configs` — recommended; nothing is deleted.
  - `Remove the other harness configs` — show the exact list first, then delete only after confirmation.
  - `Show me the list first` — print the paths and ask again.

Never delete these shared paths, whichever harness was selected:

- `AGENTS.md`
- `.agents/` (canonical content and module sources)
- `.opencode/modules/` and `.opencode/plugins/` (module CLI, framework plugins, tests)
- `.pi/extensions/` (shared by Pi and omp)
- `tools/`, `tests/`, `docs/`, `src/`, `assets/`, `design/`, `production/`

Prune list per selected harness:

| Selected | Safe to remove |
|----------|----------------|
| OpenCode | `.pi/settings.json`, `.omp/config.yml`, `.omp/mcp.json`, `.omp/agents/`, `.claude/{agents,skills,commands,rules,modules}/`, `.codex/`, `.cursor/rules/` |
| Pi | `.opencode/{agents,skills,commands,rules}`, `.omp/`, `.claude/{agents,skills,commands,rules,modules}/`, `.codex/`, `.cursor/rules/` |
| omp | `.opencode/{agents,skills,commands,rules}`, `.pi/settings.json`, `.claude/{agents,skills,commands,rules,modules}/`, `.codex/`, `.cursor/rules/` |
| Claude Code | `.opencode/{agents,skills,commands,rules}`, `.pi/settings.json`, `.omp/`, `.codex/`, `.cursor/rules/` |
| Codex | `.opencode/{agents,skills,commands,rules}`, `.pi/settings.json`, `.omp/`, `.claude/{agents,skills,commands,rules,modules}/`, `.cursor/rules/` |

Show the resolved paths before deleting. Do not delete files that are not on this list. Remove empty parent directories only after their contents are gone.

## Phase 8: Optional Git Reset

If the user selected `--reset-git` or agrees when prompted:
- Offer to reset git history to a single commit
- `git checkout --orphan fresh-root`
- `git add -A`
- `git commit -m "Initial commit: scaffolded from OpenCode Game Studios template"`
- Delete all old tags (optional) — warn: if tags were previously pushed to remote, deletion requires `git push origin --delete <tag>` for each one
- Force push if needed (warn: this rewrites remote history for anyone who has cloned this repo)

## Phase 9: Summary

Print a completion summary:

```
✅ Template initialized

  Project: [Game Name]
  Engine:  [Engine]
  Team:    [Size]
  Harness: [Harness]

  What's next:
  - Run /setup-engine [engine] to configure your engine docs
  - Run /concept-brainstorm to start designing your game concept
  - Run /start for guided onboarding
```
