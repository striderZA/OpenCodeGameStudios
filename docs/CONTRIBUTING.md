# Contributing to OpenCode Game Studios

This guide covers how to add, modify, and maintain the OCGS framework —
agents, skills, commands, rules, and plugins. If you're building a game
(rather than the framework), see `README.md` instead.

## Table of Contents

1. [Framework Architecture](#framework-architecture)
2. [Adding an Agent](#adding-an-agent)
3. [Adding a Skill](#adding-a-skill)
4. [Adding a Command](#adding-a-command)
5. [Modifying Rules](#modifying-rules)
6. [Adding a Plugin](#adding-a-plugin)
7. [Testing Requirements](#testing-requirements)
8. [PR Process](#pr-process)

## Framework Architecture

The OCGS framework has 5 component types:

| Component | Location | Purpose |
|-----------|----------|---------|
| **Agents** | `.opencode/agents/` | Agent definitions (49 files) |
| **Skills** | `.opencode/skills/` | Skill workflows (76 directories) |
| **Commands** | `.opencode/commands/` | Slash commands (51 files) |
| **Rules** | `.opencode/rules/` | Coding standards (11 files) |
| **Plugins** | `.opencode/plugins/` | TypeScript hooks |

Components interact as follows:
- A **command** routes to a **skill** via frontmatter `skill:` field
- A **skill** delegates to **agents** via `subagent_type: agent-name` in Task tools
- An **agent** consults **rules** for their domain
- **Plugins** hook into session lifecycle, tool execution, and compaction events

## Adding an Agent

### Before You Start

Verify an agent for this role doesn't already exist. Check `.opencode/agents/`
and the [Studio Hierarchy](../AGENTS.md#studio-hierarchy).

### Agent Template

Every agent must have:

```markdown
---
description: "One-sentence description of the agent's domain and purpose"
mode: subagent          # primary (director) or subagent (specialist)
model: opencode-go/qwen3.6-plus
maxTurns: 20
permission:             # optional — add `bash: deny` for non-code agents
  bash: deny
---

You are the [Role Name] for a [Engine] game project. [2-3 sentence identity statement].

## Collaboration Protocol

**Collaborative implementer / collaborative consultant** statement.
User approval workflow (6-step Implementation Workflow).

## Core Responsibilities

1. [Responsibility 1] — [explanation]
2. [Responsibility 2] — [explanation]

## Domain-Specific Standards / Patterns

(With code examples for programming agents, or design standards for non-code agents)

## Common Anti-Patterns

- [Anti-pattern 1] — [why it's bad]
- [Anti-pattern 2] — [why it's bad]

## Delegation Map

**Reports to**: `[parent-agent]`

**Escalation targets**: [agents to escalate to for specific categories]

**Coordinates with**: [agents to collaborate with horizontally]

## What This Agent Must NOT Do

- [Boundary 1]
- [Boundary 2]

## Version Awareness

(Required for code agents — engine API verification steps)

## When Consulted

When should this agent be involved?

## MCP Integration

(Required for agents that use engine-specific MCP servers)
```

### Required Sections

| Section | Required for | Purpose |
|---------|-------------|---------|
| Frontmatter (description, mode, model, maxTurns) | All agents | Metadata for OpenCode routing |
| Collaboration Protocol | All agents | User interaction workflow |
| Core Responsibilities | All agents | Domain ownership definition |
| What This Agent Must NOT Do | All agents | Boundary enforcement |
| Delegation Map | All agents | Collaboration and escalation |
| Domain-Specific Patterns | Code agents | Implementation guidance with examples |
| Common Anti-Patterns | Code agents | What to avoid |
| Version Awareness | Code agents | API version verification |
| MCP Integration | Code agents | Tool access patterns |

### Naming Conventions

- File name: `kebab-case-role-name.md`
- Agent role in descriptions: `PascalCase Role Name`
- Frontmatter `name`: not used (inferred from filename)
- `mode`: `primary` for directors, `subagent` for specialists

### Validation

Run the agent validator to check structural compliance:

```bash
node tests/agents/validate.mjs
```

The validator checks:
- YAML frontmatter validity and required fields
- Required sections present
- Cross-references to other agents are valid

## Adding a Skill

### Skill Template

```markdown
---
name: skill-name
description: "One-sentence description of what the skill does"
argument-hint: "[arguments]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Write, Edit, Task, question, TodoWrite
agent: primary-agent-for-this-skill
---

## Phase 1: [Name]

[Structured steps with tool calls]

## Phase 2: [Name]

[Structured steps with tool calls]

## ... (as many phases as needed)

## Recommended Next Steps

- Link to related skills and commands
```

### Required Frontmatter

| Field | Description |
|-------|-------------|
| `name` | Slug matching the skill directory name |
| `description` | Human-readable one-liner |
| `argument-hint` | Shows in `/` command menu |
| `user-invocable` | Must be `true` for discoverable commands |
| `allowed-tools` | Comma-separated list of permitted tools |
| `agent` | Default agent for this skill (optional) |

### Structure Guidelines

- Use numbered phases for sequential workflows
- Include concrete tool commands in code blocks
- Use `question` for all decision points
- Include output format templates in fenced code blocks
- End with a Next Steps section linking to related skills
- For team orchestration skills: use `subagent_type` to delegate to specialists

### Agent Routing

Use the `Task` tool for specialist delegation:

```markdown
When this skill encounters domain-specific questions:
1. Spawn `systems-designer` for formula and balance questions
2. Spawn `economy-designer` for economy system questions
3. Present their proposals to the user via `question`
```

Map system categories to agents in a routing table:

| System Category | Primary Agent | Supporting Agents |
|----------------|---------------|-------------------|
| Combat | `game-designer` | `systems-designer`, `ai-programmer` |

## Adding a Command

Commands are thin routing files in `.opencode/commands/`. Each command maps
to an existing skill:

```markdown
---
name: command-name
description: "Human-readable one-liner"
skill: skill-name
category: category-name
---

Brief usage note.
```

### Required Frontmatter

| Field | Description |
|-------|-------------|
| `description` | Shown in command menu |
| `skill` | Must match a directory in `.opencode/skills/` |
| `category` | One of: onboarding, design, architecture, stories, qa, prototyping, team, release, ops |

## Modifying Rules

Rules files in `.opencode/rules/` define path-scoped coding standards.

Each rule should include:
- A clear list of rules (bullet points)
- **Examples**: At least 1 good + 1 bad code example
- **Anti-Patterns**: What to avoid, with rationale
- **Cross-References**: Links to related agents, skills, and other rules

## Adding a Plugin

See `.opencode/plugins/README.md` for the complete plugin architecture guide.

Briefly:
1. Create `{plugin-name}.ts` in `.opencode/plugins/`
2. Export a `Plugin` instance conforming to `@opencode-ai/plugin`
3. Register in `opencode.json` under the `plugins` array
4. Write tests in `.opencode/plugins/tests/test-{name}.mjs`
5. Document the plugin in `.opencode/plugins/README.md`

## Testing Requirements

### For Agent Changes

Run the structural validator:

```bash
node tests/agents/validate.mjs
```

The validator must report PASS for all agents. If you intentionally leave a
gap (e.g., Tier 2 engine specialists), add it to the known exceptions list.

### For Skill Changes

Verify the skill parses correctly, phases are executable, and cross-references are valid:

```bash
node tests/agents/validate.mjs        # Structural compliance
node tests/workflow/references.mjs    # Cross-reference integrity
node tests/workflow/paths.mjs         # Workflow path validation
```

### For Plugin Changes

Verify all existing plugin tests still pass:

```bash
node .opencode/plugins/tests/test-<name>.mjs
```

### For Workflow Changes

When modifying workflow definitions, phase gates, or skill/command references, run the full workflow integrity suite:

```bash
node tests/workflow/run-all.mjs
```

This validates:
- All `/command` references in skills map to real command files
- All `subagent_type` agent references map to real agent files
- Workflow paths (start → gate → phase) form valid chains
- Stage names are consistent across gate-check, start, and project-stage-detect
- Gate-check artifact references correspond to real project paths
- No orphan skills or missing frontmatter fields

### For Game Code

If you add gameplay code along with framework changes, write unit tests
following the patterns in `tests/` and verify with:

```bash
node tests/agents/validate-gdscript.mjs  # Lints GDScript snippets
```

## PR Process

All framework changes go through pull requests to `development`:

1. **Branch from `development`**: `feature/{issue-number}-{short-name}`
2. **One issue per branch**: Each branch addresses exactly one issue
3. **Commit convention**: Conventional Commits (`feat:`, `fix:`, `docs:`, etc.)
4. **Close issue reference**: Include `Closes #N` in the commit message
5. **CI must pass**: Agent validation, workflow integrity, and plugin tests
6. **Merge to `development`**: Fast-forward merge, push, close issue
7. **Release**: `development` merges to `master` at milestone completion

### Commit Message Format

```
type(scope): description

- Bullet list of key changes
- Include Closes #N at end

Closes #42
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `ci`, `chore`
