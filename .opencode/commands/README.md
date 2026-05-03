# Commands

Slash commands available in OpenCode. Each command is a thin routing file that
maps to the corresponding skill in `.opencode/skills/`.

## Adding a Command

1. Create `{command-name}.md` in this directory
2. Frontmatter requires: `name`, `description`, `skill`, `category`
3. The `skill` field must match a directory name in `.opencode/skills/`
4. The body should describe what the command does and any arguments

## Categories

| Category | Purpose |
|----------|---------|
| `onboarding` | Project setup and navigation |
| `design` | Game design authoring and review |
| `architecture` | Technical architecture and ADRs |
| `stories` | Epic/story lifecycle and code review |
| `qa` | Quality assurance and testing |
| `prototyping` | Rapid prototyping workflows |
| `team` | Multi-agent team orchestration |
| `release` | Sprint and release management |
| `ops` | Emergency fixes, bugs, and security |
