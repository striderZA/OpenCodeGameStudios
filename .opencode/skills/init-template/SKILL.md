---
name: init-template
description: "First-time repo setup for new projects. Transforms the cloned OCGS template into a clean, ready-to-use game project with your own identity."
argument-hint: "[--reset-git] [--name \"My Game\"] [--engine godot|unity|unreal]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Write, Edit, Bash, question, Task
---

When this skill is invoked:

## 1. Welcome and Prompt

Welcome the user to their new project. Use `question` to gather:

### Tab 1: Project Identity
- **What is your game's name?** (e.g., "My Game")
- **What is your game's one-line description?** (e.g., "A 2D platformer about a cat in space")

### Tab 2: Engine & Genre
- **Which engine are you using?** (godot / unity / unreal)
- **What genre best describes your game?** (e.g., platformer, RPG, puzzle, FPS, strategy)

### Tab 3: Team
- **Team size** (solo / small 2-5 / medium 6-15 / large 16+)
- **Preferred model tier** (default / workhorse / lightweight) — refer to the README's Model Mapping section for options

## 2. Replace README.md

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

## 3. Update AGENTS.md

Read AGENTS.md and update:
- Replace the Model Mapping section at the top with the user's engine and model preference
- Set the engine to the user's choice
- Remove or update any project-specific settings

## 4. Update opencode.json

Read opencode.json and clean it up:
- Remove any internal-only plugin paths
- Set project name appropriately
- Keep the ccgs-hooks.ts plugin reference

## 5. Remove Internal Files

Delete these files/directories that are only relevant to the OCGS project itself, not to new game projects:
- `UPGRADING.md` (user doesn't need upgrade history of the template)
- `CONTRIBUTING.md` (project-specific contribution guide)
- `SECURITY.md` (project-specific security policy)
- `CODE_OF_CONDUCT.md` (replace with a reference to the GitHub default)
- Clear `design/` directory (remove any existing GDDs, entity registries)
- Keep `design/` directory structure but empty it
- Clear `src/` contents (keep `.gitkeep`)
- Clear `production/` contents (session logs, sprint plans from our dev)

## 6. Optional Git Reset

If the user selected `--reset-git` or agrees when prompted:
- Offer to reset git history to a single commit
- `git checkout --orphan fresh-root`
- `git add -A`
- `git commit -m "Initial commit: scaffolded from OpenCode Game Studios template"`
- Delete all old tags (optional)
- Force push if needed (warn about consequences)

## 7. Summary

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
