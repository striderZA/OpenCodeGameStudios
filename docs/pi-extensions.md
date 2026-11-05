# OCGS Pi Extensions Reference

Detailed reference for every OCGS Pi extension — tools, commands, events, and schemas.

---

## ocgs-core (content discovery)

**File:** `.pi/extensions/ocgs-core/index.ts`

Registers `.agents/` content with Pi's resource system. It does not import the
other extensions; Pi auto-discovers each `.pi/extensions/*/index.ts` module.

### Events

| Event | Purpose |
|---|---|
| `resources_discover` | Registers `.agents/skills/` as Pi skill paths and `.agents/commands/` as Pi prompt template paths |

---

## ocgs-tool-map (harness tool names)

**File:** `.pi/extensions/ocgs-tool-map/index.ts`

OCGS skills and commands use OpenCode's tool vocabulary (`Task`, `question`,
`/consult`). Pi and omp do not expose all of those names. This extension injects
a short mapping into the system prompt on `before_agent_start` instead of
rewriting canonical content.

### Mapping

| OCGS name | On Pi | On omp |
|---|---|---|
| `Task` / `subagent_type` | No `Task` tool. Use another delegation tool if installed; otherwise do the work directly and say delegation is unavailable | `task`, passing the agent name as `agent`. `task` also requires `task` and `solutionSpace`, and has no `prompt` field |
| `question` | `question` when registered; otherwise ask in plain text | `ask` |
| `/consult` | No equivalent | No equivalent |

Harness detection uses event markers: Pi 1.5.0 sends `systemPromptOptions`, omp
sends `reason`. The prompt shape (Pi string, omp `string[]`) is the fallback for
older Pi versions. The injected block carries an
`<!-- ocgs-tool-map:v1 -->` marker so it is not added twice.

### Why Pi delegation was retired

Pi's `ExtensionContext.sessionManager` is a `ReadonlySessionManager` in the
1.5.0 types: a `Pick` of read-only accessors with no sub-session constructor.
`newSession()` and `fork()` exist only on `ExtensionCommandContext`, and they
move the host session rather than spawning a subagent. The previous
`ocgs-delegation` extension called `sessionManager.inMemory(...)`, which does
not exist, so `Task` and `/consult` failed before any work started. See
`docs/pi-compatibility.md#delegation`.

The package root exports `createAgentSession()` and `SessionManager.inMemory()`,
so a nested-session implementation is plausible. It is unverified: runtime
package resolution from an extension, collecting the result of
`AgentSession.prompt()` (which returns `Promise<void>`), and extension
recursion were not tested. Retirement is a tradeoff, not a proof that delegation
is impossible.

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
**Dep:** none — uses its own glob matcher

Dynamically injects path-scoped rules from `.agents/rules/` into the system prompt when the LLM works in matching paths.

### How it works

1. **On startup:** Reads all `.agents/rules/*.md` files, parses their `paths:` frontmatter and body
2. **On `tool_call`:** Tracks the last 20 file paths the LLM has touched (via `read`, `write`, `edit`, and `bash` path extraction)
3. **On `before_agent_start`:** Matches recent paths against rule globs using its own matcher. Injects matching rules as:

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

On `session_start` and on `resources_discover` with `reason: "startup"`, scans:
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

### `/generate-changelog` command

```typescript
pi.registerCommand("generate-changelog", {
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

After each agent turn, checks for unreleased commits. If found and `CHANGELOG.md` doesn't exist yet, shows a persistent widget: `"## Unreleased Changes Detected\n...\nRun /generate-changelog to generate."`

---

## ocgs-validate

**File:** `.pi/extensions/ocgs-validate/index.ts`

Validates `.agents/` content for structural conformance.

### Startup scan

On `session_start` and on `resources_discover`, validates all files in `.agents/{agents,skills,rules}/`:
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

## ocgs-hooks

**File:** `.pi/extensions/ocgs-hooks/index.ts` (wiring), `core.ts` (logic, no harness imports)

The 12 hooks from the Claude Code original (listed under "Hooks Mapping" in the root README), wired for Pi and oh-my-pi. Each harness emits only some of the events below. A handler for an event the running harness never emits never fires.

### Events

| Original hook | Pi event | omp event | Behavior |
|---|---|---|---|
| `session-start.sh`, `detect-gaps.sh` | `session_start` | `session_start` | Branch, recent commits, active sprint and milestone, open bugs, TODO counts, documentation gaps |
| `session-stop.sh` | `agent_settled` | `session_stop` | Archives `active.md` and the session's commits to `session-log.md` |
| `pre-compact.sh` | `session_before_compact` (audit), `session_compact` (context message) | `session.compacting` (context added to the summary) | Logs each compaction; restores `active.md`, git state, and WIP markers |
| `post-compact.sh` | `session_compact` | `session_compact` | Restore notice |
| `validate-commit.sh` | `tool_call` on `bash` `git commit` | `tool_call` | Blocks invalid asset JSON; warns on missing design sections, hardcoded gameplay values, untagged TODOs |
| `validate-push.sh` | `tool_call` on `bash` `git push` | `tool_call` | Warns on pushes to `main`, `master`, `develop` (not blocked) |
| `validate-assets.sh` | `tool_result` (`write`, `edit`) | `tool_result` | Asset naming and JSON validity; errors are appended to the tool result |
| `validate-skill-change.sh` | `tool_result` (`write`, `edit`) | `tool_result` | Audit line advising `/skill-test` |
| `log-agent.sh`, `log-agent-stop.sh` | `tool_call` / `tool_result` on `Task` | `tool_call` / `tool_result` on `task` | Agent start and completion in `agent-audit.log` |
| `notify.sh` | `ui_prompt_start` | `tool_approval_requested` | OS notification when the agent waits for input |

### Differences from the bash originals

- Pi has no hook that runs before the summary is written. On Pi the context is sent as a hidden message after compaction. On omp it goes into the summary through `session.compacting`, and `session_compact` skips the message when omp already injected it.
- `agent_settled` fires after every agent run, so `session-log.md` gets one entry per run.
- Session-start, session-stop, and compaction-context handlers skip subagent sessions when the harness sets `ctx.agent.kind === "sub"`. omp does. Pi 0.85.1's `ExtensionContext` has no `agent` field, so on Pi subagent sessions are not detected.
- Not ported: the upstream hooks outside the 12 listed (`validate-read`, `validate-write`, `validate-registry`, `validate-agent-artifact`, `update-check`, `log-instructions`).

### Logs

Writes to `production/session-logs/agent-audit.log`, `session-log.md`, and `compaction-log.txt`.

---

## Glossary

| Term | Definition |
|---|---|
| **Barrel** | An extension that imports and registers other extensions. OCGS no longer uses one; `ocgs-core` only registers content paths. |
| **Harness tool map** | A short system-prompt block injected by `ocgs-tool-map` that translates OCGS/OpenCode tool names to the running harness's names, or states that no equivalent exists. |
| **Harness-neutral frontmatter** | Agent frontmatter without `model:`, `mode:`, or `permission:` fields. Model choice and tool permissions belong to the harness; this repository does not assign models. |
| **OCGS tool name** | A tool name used in canonical `.agents/` content. `Task`, `question`, and `/consult` are OCGS names; `ocgs-tool-map` translates them per harness. |
