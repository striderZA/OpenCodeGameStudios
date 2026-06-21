# OCGS Pi Extensions Reference

Detailed reference for every OCGS Pi extension — tools, commands, events, and schemas.

---

## ocgs-core (Barrel)

**File:** `.pi/extensions/ocgs-core/index.ts`

The central barrel extension. Loads all other OCGS extensions and discovers `.agents/` content.

### Events

| Event | Purpose |
|---|---|
| `resources_discover` | Registers `.agents/skills/` as Pi skill paths and `.agents/commands/` as Pi prompt template paths |

### Dependencies

Dynamically imports and registers: `ocgs-delegation`, `ocgs-question`, `ocgs-path-guard`, `ocgs-audit`, `ocgs-drift-detector`, `ocgs-changelog`, `ocgs-validate`.

---

## ocgs-delegation

**File:** `.pi/extensions/ocgs-delegation/index.ts`

Two cross-harness delegation primitives: `Task` tool (vertical execution) and `/consult` command (horizontal review).

### Task tool

```typescript
pi.registerTool({
  name: "Task",
  parameters: {
    agent: StringEnum([...51 agent names]),  // Optional, auto-detected
    prompt: string,                           // What to delegate
    context?: string,                         // Optional additional context
    isolation?: "same-context" | "forked",    // Default: same-context
  },
})
```

**Behavior:**
1. Loads the target agent's system prompt from `.agents/agents/<name>.md`
2. Spawns an in-memory subagent session (ephemeral, not persisted in session tree)
3. Streams progress back via `onUpdate`
4. Returns the subagent's final response as the tool result
5. Falls back to `creative-director` if no agent specified

**Agent name discovery:** Reads `.agents/agents/` directory at startup. Each `.md` file becomes an agent name. No codegen needed — just add a file to `.agents/agents/`.

### /consult command

```typescript
pi.registerCommand("consult", {
  argumentHint: "<agent-name> [question]",
})
```

**Behavior:**
1. Validates the agent name against the discovered agent list
2. Loads the agent's system prompt with a consultation suffix
3. Spawns an in-memory subagent with **read-only tools** (`read`, `grep`, `find`, `ls`)
4. The consultant's response becomes part of the conversation
5. Shows a notification when consultation completes

---

## ocgs-question

**File:** `.pi/extensions/ocgs-question/index.ts`

Structured decision capture tool. Following the **Explain → Capture** pattern, agents write their analysis in conversation text, then call `question` to present the choice.

### question tool

```typescript
pi.registerTool({
  name: "question",
  parameters: {
    question: string,                       // The decision question
    options: [{ label: string, description?: string }],  // 2-4 options
    header?: string,                        // Optional gate ID (e.g. "CD-PILLARS")
  },
})
```

**TUI mode:** Renders a full-screen picker via `ctx.ui.custom()` with option labels, descriptions, and a "type your own" fallback. The first option defaults to selected (OCGS convention: the recommended choice).

**Non-TUI mode** (RPC, JSON, print): Returns the question and options as structured data with `pending: true` so the RPC client can present and reply.

**Audit log:** Every decision is recorded to `production/session-logs/agent-decisions.jsonl`:

```json
{"question":"Which engine?","options":["Godot 4","Unity"],"answer":"Godot 4","ts":1712345678000}
```

---

## ocgs-path-guard

**File:** `.pi/extensions/ocgs-path-guard/index.ts`
**Dep:** `minimatch` (bundled via `package.json`)

Dynamically injects path-scoped rules from `.agents/rules/` into the system prompt when the LLM works in matching paths.

### How it works

1. **On startup:** Reads all `.agents/rules/*.md` files, parses their `paths:` frontmatter and body
2. **On `tool_call`:** Tracks the last 20 file paths the LLM has touched (via `read`, `write`, `edit`, and `bash` path extraction)
3. **On `before_agent_start`:** Matches recent paths against rule globs using `minimatch`. Injects matching rules as:

```
<ocgs-rule name="ai-code" source=".agents/rules/ai-code.md">
# AI Code Rules

- AI update budget: 2ms per frame maximum
...
</ocgs-rule>
```

### Token budget

Maximum 4000 tokens for rule injection. If multiple rules match, lowest-priority rules are truncated. A status indicator shows: `rules: ai-code, engine-code`.

### Rule format

Rules use the standard OCGS format (unchanged from OpenCode):

```markdown
---
paths:
  - "src/ai/**"
---

# AI Code Rules

- Bullet-point rules here...
```

---

## ocgs-audit

**File:** `.pi/extensions/ocgs-audit/index.ts`

Audit logging extension. Produces a byte-identical audit log to OpenCode's `ccgs-hooks.ts`.

### Events

| Event | Logged Data |
|---|---|
| `session_start` | Reason, timestamp |
| `tool_call` | Tool name, call ID, summarized arguments (args >100 chars truncated) |
| `tool_result` | Tool name, result length, isError flag |
| `agent_end` | Message count |
| `session_shutdown` | Reason |

### Output

Written to `production/session-logs/agent-audit.log`:

```
[2026-06-21T12:00:00.000Z] session_start: {"reason":"startup"}
[2026-06-21T12:00:05.000Z] tool_call: {"tool":"read","callId":"...","args":{"path":"..."}}
[2026-06-21T12:00:06.000Z] tool_result: {"tool":"read","callId":"...","resultLength":123,"isError":false}
```

---

## ocgs-drift-detector

**File:** `.pi/extensions/ocgs-drift-detector/index.ts`

Detects structural drift in OCGS content files when they are written or edited.

### Startup scan

On `resources_discover` with `reason: "startup"`, scans:
- `.agents/agents/` — checks required frontmatter fields (`description`, `maxTurns`)
- `.agents/skills/` — checks required sections per Agent Skills spec

Drift count shown in status bar: `drift: 3 files`

### Post-write detection

After every `write` or `edit` tool call targeting a `.agents/` path:
1. Re-checks the modified file for required fields/sections
2. If drift found, appends a warning to the tool result inline (Pi-only enhancement):

```
⚠️ OCGS drift detected in .agents/agents/my-agent.md: missing required section: Collaboration Protocol
```

---

## ocgs-changelog

**File:** `.pi/extensions/ocgs-changelog/index.ts`

Conventional-commit changelog generation with TUI modal.

### /changelog command

```typescript
pi.registerCommand("changelog", {
  description: "Generate CHANGELOG.md from conventional commits",
})
```

**Behavior:**
1. Runs `git log --oneline --no-decorate HEAD --not --tags` (or last 20 commits if no tags)
2. Groups commits by conventional-commit type: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `other`
3. In **TUI mode:** shows a preview modal with Accept / Edit / Cancel actions
4. In **non-TUI mode:** prints the preview to console
5. On accept, prepends the new changelog section to `CHANGELOG.md`

### Agent_end integration

After each agent turn, checks for unreleased commits. If found and `CHANGELOG.md` doesn't exist yet, shows a persistent widget: `"## Unreleased Changes Detected\n...\nRun /changelog to generate."`

---

## ocgs-validate

**File:** `.pi/extensions/ocgs-validate/index.ts`

Validates `.agents/` content for structural conformance.

### Startup scan

On `resources_discover`, validates all files in `.agents/{agents,skills,rules}/`:
- Valid YAML frontmatter
- No harness-specific fields (`model:`, `mode:`, `permission:`, etc.)
- Non-empty body

Shows status bar indicator: `validation: 3 issues`

### Post-write validation

After every `write` or `edit` to a `.agents/` path, validates the modified file and appends any issues to the tool result:

```
[ERROR] .agents/agents/my-agent.md: Missing YAML frontmatter
[WARNING] .agents/agents/my-agent.md: Harness-specific field 'model' should not be in .agents/
```

---

## Glossary

| Term | Definition |
|---|---|
| **Barrel** | An extension that imports and registers other extensions. `ocgs-core` is the barrel. |
| **In-memory subagent** | A subagent whose session is ephemeral — not persisted in the session tree. Used by `Task` tool and `/consult`. |
| **Harness-neutral frontmatter** | Agent frontmatter without `model:`, `mode:`, or `permission:` fields. These are configured in harness-specific config (`.pi/settings.json` for Pi). |
| **cross-harness name** | A tool or command name that is identical in OpenCode and Pi. `Task`, `question`, and `consult` are cross-harness names. |
