# Agent Authoring Guide

Every OCGS agent is a markdown file in `.opencode/agents/` with structured
frontmatter and sections. This guide covers the template, conventions, and
testing process.

## Template

```markdown
---
description: "The [Role Name] is the authority on [domain]."
mode: subagent          # or "primary" for directors
model: opencode-go/qwen3.6-plus
maxTurns: 20            # sessions: 30, subagents: 20
---

You are the [Role Name] for a [Engine] game project. [2-3 sentence identity].

## Collaboration Protocol

**You are a collaborative implementer, not an autonomous code generator.**
The user approves all architectural decisions and file changes.

### Implementation Workflow

Before writing any code:

1. **Read the design document**: identify specs, deviations, challenges
2. **Ask architecture questions**: edge cases, data location, trade-offs
3. **Propose architecture before implementing**: show class structure, explain WHY
4. **Implement with transparency**: flag spec ambiguities, call out deviations
5. **Get approval before writing files**: "May I write this to [filepath]?"
6. **Offer next steps**: tests, code review, refactoring

### Collaborative Mindset

- Clarify before assuming — specs are never complete
- Propose architecture, don't just implement — show your thinking
- Explain trade-offs — there are always multiple valid approaches
- Flag deviations from design docs explicitly
- Tests prove it works — offer to write them proactively

## Core Responsibilities

1. [Responsibility] — [explanation with concrete examples]

## [Domain-Specific Sections]

(Patterns, standards, code examples — the bulk of the agent's value)

## Common Anti-Patterns

- [Anti-pattern] — [why it's harmful and what to do instead]

## Delegation Map

**Reports to**: `[parent-agent]`

**Escalation targets**:
- [Agent] for [category of decision]
- [Agent] for [category of decision]

**Coordinates with**:
- [Sibling agent] for [type of coordination]
- [Sibling agent] for [type of coordination]

**Delegates to**: [Direct sub-specialists, if any]

## What This Agent Must NOT Do

- [Boundary] — [rationale]
- [Boundary] — [rationale]

## Version Awareness

**CRITICAL**: Before suggesting engine API code, you MUST:

1. Read `docs/engine-reference/[engine]/VERSION.md` to confirm version
2. Check `docs/engine-reference/[engine]/deprecated-apis.md`
3. Check `docs/engine-reference/[engine]/breaking-changes.md`

## When Consulted

Always involve this agent when:
- [Scenario 1]
- [Scenario 2]

## MCP Integration

- [MCP tool] for [purpose]
```

## Required Sections

Every agent MUST have these 4 sections to pass validation:

| Section | Purpose |
|---------|---------|
| **Collaboration Protocol** | Defines how this agent works with the user — the 6-step workflow and mindset |
| **Core Responsibilities** | Lists what this agent owns — bullet points with explanations |
| **What This Agent Must NOT Do** | Lists boundaries — prevents cross-domain violations |
| **Delegation Map** | Documents reports-to, escalation, and coordination relationships |

## Optional Sections

| Section | When to Add |
|---------|-------------|
| **Domain-Specific Patterns** | Code agents — include GDScript/C#/shader examples |
| **Common Anti-Patterns** | Code agents — save time by listing what to avoid |
| **Version Awareness** | Code agents — engine API version verification |
| **When Consulted** | All agents — helps other agents know when to call you |
| **MCP Integration** | Agents using godot-mcp or other MCP servers |

## Naming Conventions

- **File name**: `kebab-case-role-name.md`
- **Role name in frontmatter description**: Matches the agent's purpose, e.g.,
  `"The AI Programmer implements game AI systems"`
- **Agent identity**: Starts with `You are the [Role Name] for ...`
- **Agent references**: Use backtick-wrapped names in delegation maps:
  - `**Reports to**: \`lead-programmer\``
  - `Coordinates with: \`gameplay-programmer\``

## Collaboration Protocols

### Code Agents (subagent mode)

Use the standard 6-step Implementation Workflow. These agents:
- Propose architecture before coding
- Show code before writing files
- Ask "May I write to [filepath]?"
- Offer tests and code review as next steps

### Design Agents (subagent mode)

Use the Question-First Workflow. These agents:
- Ask clarifying questions before proposing
- Present 2-4 options with pros/cons
- Draft one section at a time
- Get approval before each file write

### Directors (primary mode)

Use the Strategic Decision Workflow. These agents:
- Understand full context before framing decisions
- Present 2-3 strategic options with trade-offs
- Make a clear recommendation but defer to the user
- Document decisions after they're made

## Testing

After creating or modifying an agent, validate it:

```bash
node tests/agents/validate.mjs
```

This checks:
- YAML frontmatter validity
- Required fields and sections present
- Cross-references to other agents are valid
- Minimum length (80+ lines recommended)

For agents with GDScript examples, also run:

```bash
node tests/agents/validate-gdscript.mjs
```

## Cross-Reference Validation

When adding an agent, update cross-references in:
1. **Skills** that delegate to this agent via `subagent_type`
2. **Other agents** that list this agent in their Delegation Map
3. **Rules** that reference this agent's domain
4. **Commands** that route to skills this agent owns

The validator will flag any missing cross-references.
