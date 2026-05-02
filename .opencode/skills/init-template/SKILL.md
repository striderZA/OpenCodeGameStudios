---
name: init-template
description: "First-time repo setup for new projects. Transforms the cloned OCGS template into a clean, ready-to-use game project with your own identity."
argument-hint: "[--reset-git] [--name \"My Game\"] [--engine godot|unity|unreal]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Write, Edit, Bash, question, Task
---

When this skill is invoked:

## Phase 1: Parse Arguments

Check if CLI arguments were passed (from `argument-hint`):

- `--name "My Game"` → sets game name (skips the name question below)
- `--engine godot|unity|unreal` → sets engine (skips engine question)
- `--reset-git` → automatically offers git reset (skips the prompt)

If `--name` and `--engine` are both provided, skip the interactive prompt entirely and proceed to Phase 2 using the provided values.

Otherwise, use `question` to gather missing details:

### Tab 1: Project Identity
- **What is your game's name?** (e.g., "My Game")
- **What is your game's one-line description?** (e.g., "A 2D platformer about a cat in space")

### Tab 2: Engine & Genre
- **Which engine are you using?** (godot / unity / unreal)
- **What genre best describes your game?** (e.g., platformer, RPG, puzzle, FPS, strategy)

### Tab 3: Team
- **Team size** (solo / small 2-5 / medium 6-15 / large 16+)
- **Preferred model tier** (default / workhorse / lightweight) — refer to the README's Model Mapping section for options

## Phase 2: Replace README.md

Write a fresh README.md to the project root. Use a template structure like:

```markdown
# [Game Name]

> [One-line description]

Built with [Engine] using [OpenCode Game Studios](https://github.com/striderZA/OpenCodeGameStudios).

## Quick Start

```bash
opencode
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
```

Replace `[Game Name]`, `[One-line description]`, and `[Engine]` with the user's answers from Phase 1.

## Phase 3: Update AGENTS.md

Read AGENTS.md and update:
- Replace the Model Mapping section at the top with the user's engine and model preference
- Set the engine to the user's choice
- Remove or update any project-specific settings

## Phase 4: Update opencode.json

Read opencode.json and clean it up:
- Remove any internal-only plugin paths
- Set project name appropriately
- Keep the ccgs-hooks.ts plugin reference only if the file actually exists: `if [ -f .opencode/plugins/ccgs-hooks.ts ]; then ...`

## Phase 5: Remove Internal Files

Remove these files/directories with existence guards (`rm -f` or `[ -f ] && rm`):

- `rm -f UPGRADING.md CONTRIBUTING.md SECURITY.md CODE_OF_CONDUCT.md`
- Clear `design/` directory contents: `rm -rf design/*` but keep the directory
- Clear `src/` contents: `rm -rf src/*` then `touch src/.gitkeep`
- Clear `production/` contents: `rm -rf production/*`

## Phase 6: Optional Git Reset

If the user selected `--reset-git` or agrees when prompted:
- Offer to reset git history to a single commit
- `git checkout --orphan fresh-root`
- `git add -A`
- `git commit -m "Initial commit: scaffolded from OpenCode Game Studios template"`
- Delete all old tags (optional)
- Force push if needed (warn about consequences)

## Phase 7: Summary

Print a completion summary:

```
✅ Template initialized

  Project: [Game Name]
  Engine:  [Engine]
  Team:    [Size]

  What's next:
  - Run /setup-engine [engine] to configure your engine docs
  - Run /brainstorm to start designing your game concept
  - Run /start for guided onboarding
```
