# Skill Authoring Guide

Every OCGS skill is a `SKILL.md` file inside a named directory in
`.opencode/skills/`. Skills define structured workflows that OpenCode
agents follow when a user invokes a slash command.

## Directory Structure

```
.opencode/skills/{skill-name}/
├── SKILL.md              # The skill workflow definition
└── [assets or templates] # Optional: templates the skill references
```

The directory name must match the `name` field in the SKILL.md frontmatter.

## Template

```markdown
---
name: skill-name
description: "One-sentence description shown in / command menu"
argument-hint: "[arguments]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Write, Edit, Bash, Task, question, TodoWrite
agent: primary-agent-name      # Optional: default agent for this skill
---

## Phase 1: [Name]

[Description of what happens in this phase]

Tool calls and logic:
- Use Glob/Grep to gather context
- Present findings to user

## Phase 2: [Name]

[Structured steps with concrete tool commands]

```gdscript
# Example code block showing a pattern
```

## ... (continue for each phase)

## Recommended Next Steps

- `/related-skill` — what to do after this skill completes
- `/other-command` — related workflow
```

## Required Frontmatter

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Slug matching directory name |
| `description` | Yes | Shown in / command menu |
| `user-invocable` | Yes | `true` for discoverable commands |
| `allowed-tools` | Yes | Comma-separated tool list |

### `allowed-tools` Reference

| Tool | When to Include |
|------|-----------------|
| `Read` | Reading files for context |
| `Glob` | Finding files by pattern |
| `Grep` | Searching file contents |
| `Write` | Creating new files |
| `Edit` | Modifying existing files |
| `Bash` | Shell commands, git operations |
| `Task` | Delegating to sub-agents |
| `question` | User decision points |
| `TodoWrite` | Task tracking |

## Workflow Structure Guidelines

### Phases

Break skills into numbered phases. Each phase should:
- Have a clear single purpose
- Specify which tools to use and when
- Include error handling (what to do if a file doesn't exist, etc.)
- End with a transition to the next phase

### Tool Usage

Use fenced code blocks to show concrete tool invocations:

```markdown
```
Glob pattern="design/gdd/*.md" → find all GDDs
Grep pattern="TODO" path="src/" → find outstanding work
```
```

### User Decisions

Use `question` for all user-facing decisions. Follow the Explain → Capture pattern:

```markdown
Use `question`:
- "Ready to start designing [system-name]?"
- Options: "Yes, let's go" / "Show me more context first" / "Design a dependency first"
```

### Agent Delegation

For domains requiring specialist expertise, delegate via `Task`:

```markdown
Spawn `systems-designer` via Task:
- Provide: system name, dependency GDD excerpts, formula requirements
- Ask: propose formulas with variable tables and output ranges
- Present their output to the user via `question`
```

### Output Templates

Include structured output formats as fenced code blocks:

````markdown
```markdown
## Balance Check: [System Name]

### Health Summary: [HEALTHY / CONCERNS / CRITICAL]

### Outliers Detected
| Item | Expected | Actual | Issue |
|------|----------|--------|-------|
```
````

## Skill Categories

Most skills fall into one of these patterns:

### Sequential Workflow

For step-by-step processes (design-system, qa-plan, sprint-plan):

```
Phase 1: Parse Arguments → Phase 2: Gather Context → Phase 3: Generate Output
→ Phase 4: Validate → Phase 5: Write → Phase 6: Next Steps
```

### Team Orchestration

For multi-agent coordination (team-combat, team-level, team-audio):

```
Step 1: Gather Context → Step 2: Delegate Specialists (parallel) →
Step 3: Synthesize → Step 4: Write Output
```

Use parallel Task calls where possible:

```markdown
Spawn all three agents simultaneously — issue all three Task calls
before waiting for any result.
```

### Analysis / Audit

For read-only diagnostic skills (security-audit, asset-audit, balance-check):

```
Phase 1: Identify Domain → Phase 2: Read Data → Phase 3: Analyze →
Phase 4: Delegate Specialist → Phase 5: Output Report
```

Do not write files unless explicitly asked.

## Error Handling

Every skill should handle common failure modes:

```markdown
If [file/dependency] is missing:
- Note the gap to the user
- Offer alternatives: "Do you want to proceed anyway or create the dependency first?"
- Do not silently invent missing content
```

#Always produce a partial report rather than crashing.

### Error Recovery Pattern

```markdown
If any spawned agent returns BLOCKED, errors, or cannot complete:

1. **Surface immediately**: Report "[AgentName]: BLOCKED — [reason]"
2. **Assess dependencies**: Is blocked agent's output needed for next steps?
3. **Offer options**: Skip / Retry / Stop
4. **Always produce a partial report**: Never discard work because one agent blocked
```

## Testing

After creating or modifying a skill:

1. Verify the frontmatter is valid YAML
2. Check all agent references (`subagent_type:` values) match `.opencode/agents/`
3. Check all command references match `.opencode/commands/`
4. Run the framework validator: `node tests/agents/validate.mjs`

The validator checks:
- Required frontmatter fields present
- Agent references match existing agent files
- Workflow structure detected (phases or step numbering)

## Common Patterns Reference

### Read Phase (Context Gathering)

```markdown
## Phase 1: Gather Context

### Required Reads

- **Game concept**: `design/gdd/game-concept.md`
- **Systems index**: `design/gdd/systems-index.md`

### Tool Pattern

```
Glob pattern="path/**/*.ext" → find relevant files
Grep pattern="TODO" path="path/" → find pending work
```
```

### Approval Gate

```markdown
### Gate: [Name]

Use `question`:
- "Approve the [item]?"
- Options: "Approve — proceed" / "Needs changes — describe" / "Block — stop"
```

### Next Steps

```markdown
## Recommended Next Steps

- `/skill-one` — what to do after this
- `/skill-two` — related workflow
- `/review-command` — validation/review step
```

## Cross-Reference Checklist

When adding a skill, update:
- [ ] Command file in `.opencode/commands/` (if new skill needs a slash command)
- [ ] Agent delegation: agents that reference this skill in their domain
- [ ] Rules that reference this skill's domain
- [ ] Framework validator exceptions (if any patterns intentionally differ)
