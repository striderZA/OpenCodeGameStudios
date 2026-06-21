# Pi Agent Support for OpenCode Game Studios

**Status:** Draft (pending user review)
**Date:** 2026-06-21
**Context:** OpenCode Game Studios (OCGS) was ported from Claude Code Game Studios (CCGS) by replacing the 12 CCGS bash hooks with a TypeScript plugin (`ccgs-hooks.ts`) and adding 51 agents, 77 skills, 54 commands, and 11 path-scoped rules. This design adds Pi as a supported harness without breaking OpenCode compatibility, and structures the framework so future harnesses (Claude Code, Cursor, Windsurf, etc.) can be added similarly.

**Decisions captured (during brainstorm / design review):**
- **Approach:** Dual-harness parity (works in *both* OpenCode and Pi; not a port that abandons OpenCode).
- **Source of truth:** A new harness-agnostic `.agents/` directory. No codegen — each harness discovers `.agents/` content natively.
- **Frontmatter:** Agent/skill/command files are harness-neutral. Model routing, tool permissions, and runtime config live in harness-specific directories.
- **Directory structure:** `.agents/` = shared content. `.opencode/` = OpenCode-specific (plugins, config). `.pi/` = Pi-specific (extensions, settings). Future harnesses each get their own directory.
- **Delegation:** Two cross-harness primitives: `Task` tool (vertical execution) and `/consult` command (horizontal peer review), plus the `question` tool (structured decision capture). Named identically in both harnesses so agent prompts are written once.
- **Pi target:** `^0.79.0` (current latest).

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Repository Layout](#2-repository-layout)
3. [Migration Plan (.opencode/ → .agents/)](#3-migration-plan)
4. [Modular System](#4-modular-system)
5. [Delegation Mechanism](#5-delegation-mechanism)
6. [Question Tool and Other Custom Tools](#6-question-tool-and-other-custom-tools)
7. [Path-Scoped Rules Translation](#7-path-scoped-rules-translation)
8. [Plugin/Extension Port](#8-pluginextension-port)
9. [Phasing, Testing, and Open Questions](#9-phasing-testing-and-open-questions)
10. [Glossary](#10-glossary)
11. [Risks](#11-risks)
12. [Out of Scope](#12-out-of-scope)
13. [Acceptance Criteria](#13-acceptance-criteria)
14. [References](#14-references)

---

## 1. Architecture Overview

OCGS becomes a **multi-harness framework** with a single harness-agnostic canonical source. The `.agents/` directory is the canonical content (agents, skills, commands, rules, modules) — everything humans edit. Each harness consumes `.agents/` content through its own native mechanism, with harness-specific config and extensions in its own directory.

### Three architectural principles

1. **The OCGS prompt contract is harness-invariant.** "Use the `Task` tool" must mean the same thing in OpenCode and Pi. Tool names (`Task`, `question`), agent names (`creative-director`, `game-designer`), skill names, and command names are the cross-harness stability surface. If a name would differ between harnesses, we wrap and alias — never rename the OCGS-facing name.

2. **`.agents/` is canonical content; each harness owns its directory.** Agent, skill, command, rule, and module files in `.agents/` are harness-neutral — no model names, permission blocks, or harness-specific frontmatter. `.opencode/` has OpenCode plugins and config. `.pi/` has Pi extensions and settings. Future harnesses (`.claude/`, `.cursor/`, etc.) get their own directory. **No codegen step** — each harness discovers `.agents/` content at runtime through its own mechanism.

3. **Pi-only features are opt-in extensions, not core content.** Custom TUI for `/start`, `tool_result` mutation, hot-reload — these live in `.pi/extensions/` and are activated by Pi's configuration. Default modules work in both harnesses. The `.agents/` content stays clean and portable.

---

## 2. Repository Layout

```text
OpenCodeGameDesign/
├── AGENTS.md                    # Studio hierarchy, coordination rules, coding standards, available commands
├── .agents/                     # NEW CANONICAL SOURCE OF TRUTH (harness-agnostic, humans edit here)
│   ├── agents/                  # 51 agent .md files, harness-neutral frontmatter
│   │   ├── creative-director.md
│   │   ├── technical-director.md
│   │   ├── producer.md
│   │   └── ...
│   ├── skills/                  # 77 skill dirs with SKILL.md (already Agent Skills spec)
│   │   ├── brainstorm/
│   │   ├── test-setup/
│   │   └── ...
│   ├── commands/                # 54 command .md files, harness-neutral
│   │   ├── brainstorming.md
│   │   ├── code-review.md
│   │   └── ...
│   ├── rules/                   # 11 path-scoped rule .md files
│   │   ├── ai-code.md
│   │   ├── engine-code.md
│   │   └── ...
│   └── modules/                 # Module declarations (modulefile.yaml + assets)
│       ├── core/
│       │   └── modulefile.yaml
│       ├── engine-godot/
│       │   └── modulefile.yaml
│       └── ...

.opencode/                       # OpenCode-specific (unchanged for existing users)
├── plugins/                     # 3 TypeScript plugins
│   ├── ccgs-hooks.ts
│   ├── drift-detector.ts
│   ├── changelog-generator.ts
│   └── tests/
├── opencode.json                # OpenCode config: MCP entries, permission blocks, commands
├── commands/                    # (legacy, reads from .agents/ via plugin)
├── agents/                      # (legacy, removed after migration)
├── skills/                      # (legacy, removed after migration)
├── rules/                       # (legacy, removed after migration)
└── modules/                     # (legacy, removed after migration)

.pi/                             # NEW: Pi-specific extensions + settings
├── extensions/                  # Pi extensions (see Section 8)
│   ├── ocgs-core/
│   │   └── index.ts             # Umbrella: registers all OCGS extensions
│   ├── ocgs-delegation/         # Task tool + /consult command
│   ├── ocgs-question/           # question tool with TUI
│   ├── ocgs-path-guard/         # Dynamic rule injection
│   ├── ocgs-audit/              # Audit logging
│   ├── ocgs-drift-detector/     # Drift detection
│   ├── ocgs-changelog/          # Changelog generation
│   └── ocgs-validate/           # GDD/manifest validation
├── settings.json                # Pi settings: enableSkillCommands, scopedModels, etc.
├── installed.json               # Pi-side module install state

.claude/                         # FUTURE: Claude Code harness
├── rules/                       # Claude Code project rules pointing to .agents/ content
├── settings.json
└── ...
```

### 2.1 How each harness consumes `.agents/` content

**OpenCode:** OpenCode's plugin system reads `.opencode/plugins/` and existing `opencode.json`. After migration, OpenCode needs a way to discover `.agents/agents/` and `.agents/skills/` — either through `opencode.json` contextFiles config, or through the existing plugin scanning the `.agents/` directory. This is a one-time change to the OpenCode config/plugin. Existing `.opencode/` content is moved to `.agents/` and a compatibility shim or redirect is provided.

**Pi:** An `ocgs-core` Pi extension uses the `resources_discover` event to register `.agents/skills/` (as skills), `.agents/commands/` (as prompt templates), and `.agents/agents/` (as agents). Pi discovers extensions in `.pi/extensions/` automatically. The extension at `.pi/extensions/ocgs-core/index.ts` is the entry point.

**Future harnesses (Claude Code, Cursor, etc.):** Each gets its own directory with the harness-specific config needed to point to `.agents/`. For Claude Code, that means `.claude/rules/` with rules that import `.agents/rules/`. For Cursor, `.cursor/rules/` with similar.

### 2.2 Backward compatibility

Existing OCGS users see: their `.opencode/` is migrated to `.agents/` once. After the move, `opencode.json` is updated to reference `.agents/` content. The only new thing in their repo is a `.pi/` directory they can ignore until they install Pi. If a user doesn't have Pi installed, nothing breaks.

---

## 3. Migration Plan (.opencode/ → .agents/)

### 3.1 What moves

| Current Location | New Location | Rationale |
|---|---|---|
| `.opencode/agents/` | `.agents/agents/` | Harness-agnostic agent definitions |
| `.opencode/skills/` | `.agents/skills/` | Already Agent Skills spec format |
| `.opencode/commands/` | `.agents/commands/` | Harness-agnostic command definitions |
| `.opencode/rules/` | `.agents/rules/` | Path-scoped rules; frontmatter stays |
| `.opencode/modules/` | `.agents/modules/` | Module declarations (modulefile.yaml) |

### 3.2 What stays

| Path | Reason |
|---|---|
| `.opencode/plugins/` | OpenCode-specific TypeScript plugins |
| `.opencode/opencode.json` | OpenCode runtime config |

### 3.3 Frontmatter changes

Agent files lose harness-specific fields. The current frontmatter in `.opencode/agents/creative-director.md` might look like:

```yaml
---
name: creative-director
description: "Primary orchestrator for OCGS game development projects"
model: opencode-go/kimi-k2.6
mode: primary
permission:
  bash: allow
  write: allow
---
```

After migration to `.agents/agents/creative-director.md`, it becomes:

```yaml
---
name: creative-director
description: "Primary orchestrator for OCGS game development projects"
---
```

Model, mode, and permission fields are harness-specific and move to:
- **OpenCode:** `opencode.json` permission blocks + plugin-based model assignment
- **Pi:** `.pi/settings.json` scopedModels + `ocgs-path-guard` for permissions

### 3.4 OpenCode config update

`opencode.json` needs updating to discover `.agents/` content. The exact mechanism depends on OpenCode's capabilities:
- If OpenCode supports a `contextFiles` or `include` config → point at `.agents/agents/`, `.agents/skills/`
- If not → the existing plugin in `.opencode/plugins/ccgs-hooks.ts` is extended to scan `.agents/` at startup and register paths with OpenCode

### 3.5 Migration script

A one-time `tools/migrate-to-agents.mjs` script:
1. Copies `.opencode/{agents,skills,commands,rules,modules}/` → `.agents/{agents,skills,commands,rules,modules}/`
2. Strips harness-specific frontmatter from agent files
3. Updates `opencode.json` to reference `.agents/` instead of `.opencode/`
4. Adds a `.opencode/redirect.md` or similar for clarity
5. Optionally removes old `.opencode/{agents,skills,commands,rules,modules}/` after confirmation

---

## 4. Modular System

The module system stays, but modules live in `.agents/modules/` instead of `.opencode/modules/`.

### 4.1 Modulefile shape (unchanged from current design)

```yaml
name: engine-godot
version: "0.7.0"
description: "Godot 4 engine specialists and tooling"
depends: [core]

provides:
  agents: [godot-specialist, godot-gdscript-specialist, ...]
  skills: [automated-smoke-test]
  commands: []
  rules: [engine-code, shader-code]
  plugins: []
  docs: []

plugged-into:
  engines: [godot]
```

No `harnesses:` block needed — modules are harness-agnostic by default. Harness-specific behavior (like custom tools for a particular engine in Pi) can be added via module-level extensions in `.pi/extensions/` if desired, but that's a future enhancement.

### 4.2 Installers

**Existing `install.mjs` (OpenCode side):** Updated to install into `.agents/` (not `.opencode/`). Reads `.agents/modules/<name>/modulefile.yaml`, copies provided assets into `.agents/{agents,skills,...}`.

**No Pi installer needed initially.** Pi discovers all content in `.agents/` via the `ocgs-core` extension's `resources_discover` handler. Module-level Pi extensions are a future concern if/when modules need Pi-specific custom tools.

### 4.3 No npm packages

The earlier design proposed `@ocgs/core` npm packages for `pi install`. This is deferred — the initial Pi experience is git-clone-based, same as OpenCode. If demand emerges for Pi package distribution, it's a future addition.

---

## 5. Delegation Mechanism

The `Task` tool and `consult` slash command are the two cross-harness delegation primitives. Both live in a single `ocgs-delegation` Pi extension. OpenCode users get the same semantics through the `Task` tool they already use.

### 5.1 The two delegation primitives

| Primitive | Pattern | When to use | Implementation |
|---|---|---|---|
| **`Task` tool** | Vertical execution | "Do this work, return the result" (Tier 1 → Tier 2, Tier 2 → Tier 3) | Custom tool, registered with `pi.registerTool()` |
| **`consult` command** | Horizontal review | "Look at this, tell me your concerns" (peer-to-peer) | Custom command, registered with `pi.registerCommand()` |

**Why two primitives, not one:**
1. **Semantics differ.** Execution has a clear "do the work, return the artifact" lifecycle. Consultation is part of the message flow — the consulted agent's response becomes a new assistant turn the parent can react to.
2. **Tooling differs.** Task needs a tool schema (the LLM calls it inline). Consult works better as a slash command (the parent decides to break flow and ask).
3. **Pi's primitives match naturally.** `pi.registerTool()` for Task, `pi.registerCommand()` for consult. The Pi extension API maps cleanly.

### 5.2 The `Task` tool

**Schema (TypeBox):**

```typescript
import { StringEnum } from "@earendil-works/pi-ai";
import { Type } from "typebox";

// Agent list discovered at runtime by scanning .agents/agents/
const AgentNameSchema = StringEnum(
  loadAgentNames()  // returns all 51 agent names
);

const TaskParams = Type.Object({
  agent: Type.Optional(AgentNameSchema),
  prompt: Type.String({ description: "What to delegate" }),
  context: Type.Optional(Type.String({ description: "Optional context to pass" })),
  isolation: Type.Optional(StringEnum(["same-context", "forked"] as const)),
});

pi.registerTool({
  name: "Task",
  label: "Delegate to agent",
  description: "Delegate work to another OCGS agent. The target agent runs with its own system prompt and tool set, then returns a final assistant message as the result. Use for vertical delegation (Tier 1 → Tier 2 → Tier 3). For peer review, use the /consult command instead.",
  parameters: TaskParams,
  async execute(toolCallId, params, signal, onUpdate, ctx) {
    // 1. Resolve target agent (from params.agent OR orchestrator)
    const targetAgent = resolveAgent(params.agent, ctx);
    // 2. Build subagent session via SDK
    const subSession = await createAgentSession({ /* ... */ });
    // 3. Optionally pass context
    // 4. Stream the subagent's progress back via onUpdate
    // 5. Run the subagent to completion
    // 6. Return final assistant text as the tool result
    // 7. Record the delegation in the audit log
  },
});
```

**Key design choices:**

- **Agent list discovered at runtime.** The `loadAgentNames()` function reads `.agents/agents/` directory and extracts `name:` from each file's frontmatter. No codegen required. If a new agent is added to `.agents/agents/`, the Task tool picks it up on the next Pi session start.
- **In-memory subagent session** — the subagent's conversation is ephemeral, doesn't pollute the parent's session file. The parent's session is the source of truth.
- **Streaming via `onUpdate`** — the subagent's text appears in the parent's TUI as it streams. Feels like a single conversation even though it's structurally two.
- **Tool result is the final assistant text** — what the LLM "sees" is the subagent's final response. The LLM can react to it inline.
- **Audit log** — every delegation gets a record for debugging and session reconstruction.

### 5.3 The `consult` command

```typescript
pi.registerCommand("consult", {
  description: "Consult a peer OCGS agent for review or second opinion",
  argumentHint: "<agent-name> [question]",
  handler: async (args, ctx) => {
    // 1. Parse "<agent-name> [question]"
    // 2. Validate agent name
    // 3. Capture context from the current session (last 10 messages)
    // 4. Spawn consultation subagent (read-only tools, single turn)
    // 5. Display the consultation result in a TUI modal
  },
});
```

**Key design choices:**
- **Slash command, not a tool.** A consultation is a deliberate "break flow" decision. The slash command makes this visible and explicit.
- **Read-only tools.** A consultant is asked to *review*, not to *change*. The `[read, grep, find, ls]` allowlist enforces this.
- **Single-turn, no further delegation.** The consultant's system prompt adds "You are being consulted. Provide your concerns, then STOP. Do not delegate further." This prevents infinite delegation loops.

### 5.4 Cross-harness naming contract

The OCGS-facing names are the contract. The Pi extension registers tools/commands with **exactly the names OCGS agents reference**:

| OCGS prompt says... | Pi registers... | OpenCode uses... |
|---|---|---|
| "Use the `Task` tool" | `pi.registerTool({ name: "Task", ... })` | OpenCode's built-in `Task` tool |
| "Use the `/consult` command" | `pi.registerCommand("consult", ...)` | n/a (could be added later via plugin) |
| "Use the `question` tool" | `pi.registerTool({ name: "question", ... })` (Section 6) | Custom tool registered in OpenCode plugin |

**No case differences, no renaming.** OCGS agents are written once, work in both harnesses because the names match.

---

## 6. Question Tool and Other Custom Tools

The `question` tool is the third cross-harness primitive. It's heavily used in OCGS agents (every `creative-director` example ends with a `question` call).

### 6.1 The `question` tool

**Why this needs its own section.** The `question` tool is referenced in 30+ OCGS agent prompts. It powers the "Strategic Decision UI" pattern:

> "Use the `question` tool to present strategic decisions as a selectable UI. Follow the **Explain → Capture** pattern:
> 1. **Explain first** — Write full strategic analysis in conversation...
> 2. **Capture the decision** — Call `question` with concise option labels."

The pattern: agent explains its reasoning in text, then calls `question` to capture the user's choice from 2-4 options. This is a **structured decision capture** primitive — different from Pi's built-in `ctx.ui.select` (which is command-context only, not tool-callable from the LLM).

**Schema:**

```typescript
const OptionSchema = Type.Object({
  label: Type.String({ description: "Display label for the option (1-5 words)" }),
  description: Type.Optional(Type.String({ description: "One-sentence trade-off" })),
});

const QuestionParams = Type.Object({
  question: Type.String({ description: "The question to ask the user" }),
  options: Type.Array(OptionSchema, { minItems: 2, maxItems: 4 }),
  header: Type.Optional(Type.String({ description: "Optional short header" })),
});

pi.registerTool({
  name: "question",
  label: "Question",
  description: "Present a strategic decision to the user...",
  parameters: QuestionParams,
  async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
    // TUI picker via ctx.ui.custom()
    // Follows Pi's examples/extensions/question.ts pattern
  },
});
```

**TUI implementation:** uses `ctx.ui.custom()` for a full-screen picker. Adapts Pi's `examples/extensions/question.ts`. Key adaptations:
1. **Header support** — OCGS agents use gate IDs like `CD-PILLARS`. Renders as a colored prefix.
2. **OCGS audit log integration** — every question invocation logged to `production/session-logs/agent-decisions.jsonl`.
3. **Non-TUI mode handling** (RPC, JSON mode): returns structured question data so the RPC client can present it and reply.

### 6.2 Other custom tools

The `Task` and `question` tools cover most agent-prompt references. Plugin behaviors (audit logging, path protection, drift detection, changelog) are handled via Pi event hooks, not tools. See Section 8 for the full plugin-to-extension mapping.

### 6.3 Out of scope for v1

- Multi-select questions
- Image support in questions
- Skip/defer option (Esc key serves this purpose)

---

## 7. Path-Scoped Rules Translation

OCGS path-scoped rules become an `ocgs-path-guard` Pi extension that watches the LLM's working context and dynamically injects relevant rules into the system prompt. Rule files live in `.agents/rules/` (harness-agnostic).

### 7.1 Rule format (unchanged)

```markdown
---
paths:
  - "src/ai/**"
---

# AI Code Rules

- AI update budget: 2ms per frame maximum — profile to verify
- All AI parameters must be tunable from data files...
```

These are **guidance, not enforcement.** The LLM reads them and is expected to follow them.

### 7.2 The `ocgs-path-guard` extension

The Pi extension tracks which files the LLM touches and injects matching rules into the system prompt:

```typescript
// Rule catalog loaded from .agents/rules/ at startup
const RULES: Rule[] = loadRulesFromDisk(".agents/rules/");

const recentPaths: string[] = [];

pi.on("tool_call", async (event, _ctx) => {
  const path = extractPathFromToolCall(event);
  if (path) { recentPaths.push(path); /* ring buffer */ }
});

pi.on("before_agent_start", async (event, ctx) => {
  const matchedRules = matchRulesToContext(recentPaths, RULES);
  if (matchedRules.length === 0) return;

  const augmentation = matchedRules
    .map(r => `<ocgs-rule name="${r.name}">\n${r.body}\n</ocgs-rule>`)
    .join("\n\n");

  return { systemPrompt: event.systemPrompt + "\n\n## Active Rules\n\n" + augmentation };
});
```

### 7.3 Token budget enforcement

11 rules × ~50 lines × ~10 tokens/line = ~5500 tokens worst case. The extension budgets max 4000 tokens for rule injection, truncating lowest-priority rules if needed.

### 7.4 OpenCode side

OpenCode's existing rule mechanism continues to work — rules in `.opencode/rules/` were loaded by path glob matching. After migration, the OpenCode plugin is updated to scan `.agents/rules/` instead.

### 7.5 Future harnesses

Claude Code uses `.claude/rules/` with `--include` patterns. Cursor uses `.cursor/rules/`. Each harness implements rule injection through its own native mechanism, all referencing the same `.agents/rules/` source files.

---

## 8. Plugin/Extension Port

The three OpenCode plugins are hand-rewritten as Pi extensions. Each has a semantic-parity test suite. The OpenCode plugins stay in `.opencode/plugins/` unchanged — they still work for OpenCode users. Pi versions live in `.pi/extensions/`.

### 8.1 Port strategy

- **Hand-rewrite, not auto-translate.** OpenCode and Pi event shapes are too different for clean codegen.
- **No adapter layer.** Adapters would leak OpenCode semantics and prevent Pi-specific enhancements.
- **Parity tests** assert identical observable behavior (audit log content, drift reports, changelogs).

### 8.2 Plugin-to-extension mapping

| OpenCode Plugin | Pi Extension | Key Differences |
|---|---|---|
| `ccgs-hooks.ts` (679 lines) | `ocgs-audit` + `ocgs-runtime` | Session lifecycle, path protection, audit logging, compaction handling |
| `drift-detector.ts` | `ocgs-drift-detector` | Pi can mutate `tool_result` to append drift warnings inline (OpenCode: audit-only) |
| `changelog-generator.ts` | `ocgs-changelog` | Pi has a full TUI modal (preview → accept/edit/cancel); OpenCode: text-only |

### 8.3 Extension layout

```
.pi/extensions/
├── ocgs-core/              # Umbrella barrel: imports + registers all below
│   └── index.ts
├── ocgs-audit/             # Audit log writer (byte-identical to OpenCode format)
│   └── index.ts
├── ocgs-delegation/        # Task tool + /consult command
│   └── index.ts
├── ocgs-question/          # question tool with TUI
│   └── index.ts
├── ocgs-path-guard/        # Path-scoped rule injection
│   ├── index.ts
│   └── rules.ts            # Generated by scanning .agents/rules/ at startup
├── ocgs-drift-detector/    # Drift detection
│   └── index.ts
├── ocgs-changelog/         # Changelog generation
│   └── index.ts
└── ocgs-validate/          # GDD/manifest validation
    └── index.ts
```

### 8.4 Parity test strategy

The most important guarantee: after running an OCGS scenario in both harnesses, the audit log content should be equivalent.

- **Test 1: Audit log equivalence** — run scenario in both harnesses, normalize event names, assert same events, same tool calls, same prompts.
- **Test 2: Drift detection equivalence** — create malformed agent file, run drift detector in both, assert same drift detected.
- **Test 3: Changelog equivalence** — create series of conventional commits, run changelog generator in both, assert same output.

---

## 9. Phasing, Testing, and Open Questions

### 9.1 Phased release plan

#### Phase 1: Restructure (v0.8.0) — Move content to .agents/

**Goal:** Harness-neutral `.agents/` directory exists, OpenCode still works.

- [ ] Move `.opencode/{agents,skills,commands,rules,modules}/` → `.agents/{agents,skills,commands,rules,modules}/`
- [ ] Strip harness-specific frontmatter from agent files
- [ ] Update `opencode.json` to reference `.agents/` content
- [ ] Create `tools/migrate-to-agents.mjs` migration script
- [ ] Verify all OpenCode workflows still work
- [ ] Verify `.agents/` is discoverable by Pi (manual test)
- [ ] Write `ocgs-core` Pi extension that registers `.agents/skills/` and `.agents/commands/`

**Success criteria:**
- All 51 agents, 77 skills, 54 commands, 11 rules, and 17 modules are in `.agents/`
- OpenCode works identically to before the restructure
- `pi --list-skills` shows all 77 skills
- `pi --list-agents` shows all 51 agents (via `ocgs-core` extension)

**Estimate:** ~1-2 weeks.

#### Phase 2: Pi Extensions Core (v0.9.0) — Delegation + Question + Path-Guard

**Goal:** Core Pi extensions for the three most-used OCGS patterns: delegation, decision capture, and rules.

- [ ] `ocgs-delegation`: `Task` tool with runtime agent name discovery
- [ ] `ocgs-delegation`: `/consult` command
- [ ] `ocgs-question`: `question` tool with TUI
- [ ] `ocgs-path-guard`: dynamic rule injection from `.agents/rules/`
- [ ] `ocgs-audit`: audit logging (byte-identical to OpenCode format)
- [ ] Parity tests for delegation (`tests/e2e/test-delegation.test.ts`)
- [ ] Parity tests for path-guard (`tests/e2e/test-path-guard.test.ts`)

**Success criteria:**
- OCGS agent prompts referencing `Task`, `question`, and `/consult` work verbatim in Pi
- Path-scoped rules inject into system prompt when LLM touches matching paths
- Audit log format matches OpenCode

**Estimate:** ~3-4 weeks.

#### Phase 3: Plugin Parity (v0.10.0) — Drift, Changelog, Validation

**Goal:** Remaining OCGS plugins ported to Pi. Full behavioral parity.

- [ ] `ocgs-drift-detector` extension
- [ ] `ocgs-changelog` extension (with TUI modal)
- [ ] `ocgs-validate` extension
- [ ] All parity tests passing (`tests/e2e/test-parity.test.ts`)
- [ ] All 51 OCGS agent prompts verified in Pi

**Success criteria:**
- Drift detection produces same reports in both harnesses
- Changelog generation produces same output for same commits
- All parity tests pass

**Estimate:** ~3-4 weeks.

#### Phase 4: Polish + Docs (v0.11.0)

**Goal:** Documentation, CI integration, Pi-specific enhancements.

- [ ] `docs/pi-compatibility.md` — user-facing setup guide
- [ ] Updated `AGENTS.md` referencing `.agents/` directory
- [ ] CI: static validation for `.agents/` content
- [ ] Pi-specific enhancements (custom TUI for `/start`, etc. — optional)
- [ ] Sample `.claude/` or `.cursor/` config showing future-harness pattern
- [ ] Release notes and migration guide for existing users

**Success criteria:**
- A new user can clone the repo, run `pi`, and complete `/start` → `/brainstorm` flow
- Documentation covers both OpenCode and Pi flows
- CI validates `.agents/` content structure

**Estimate:** ~2-3 weeks.

### 9.2 Total timeline estimate

**~9-13 weeks** total (was 17-24 weeks in the codegen-heavy design), depending on:
- Complexity of the `Task` tool subagent spawning (Pi SDK integration)
- How much existing OCGS content (agent frontmatter, skill descriptions) needs cleanup during the move
- Testing effort for parity

### 9.3 Testing strategy

#### Test layers

| Layer | Tooling | What it tests | When it runs |
|---|---|---|---|
| **Static** | `tests/agents/validate.mjs` (extended) | All `.agents/` files valid, required sections present, cross-refs valid | Every PR, locally |
| **Plugin unit** | Existing `tests/plugins/test-*.mjs` | Each OpenCode plugin's helper functions | Every PR, locally |
| **Extension unit** | `tests/extensions/test-*.mjs` | Each Pi extension's pure functions (rule matching, audit formatting) | Every PR, locally |
| **E2E (OpenCode)** | Spawn `opencode` CLI, scripted scenario | Full OpenCode workflow | Nightly + pre-release |
| **E2E (Pi RPC)** | `pi --mode rpc`, JSON protocol | Full Pi workflow | Nightly + pre-release |
| **Parity** | Diff OpenCode + Pi outputs | Audit logs, drift reports, changelogs are equivalent | Pre-release |

#### The most important test: parity

`tests/e2e/test-parity.test.ts` runs an identical OCGS scenario in both harnesses and asserts:
- Same audit log entries (modulo event-name normalization)
- Same drift detections
- Same changelog entries
- Same tool call counts
- Same delegations

### 9.4 Open question

**Q: How does OpenCode discover `.agents/` content?** The exact mechanism depends on OpenCode's capabilities at the time of migration. Options:
- `opencode.json` contextFiles / include config (if supported)
- Plugin-based scanning (extend existing `ccgs-hooks.ts`)
- Symlinks from `.opencode/agents/` → `.agents/agents/` (simplest backward-compat)

Resolution: determined during Phase 1 implementation based on OpenCode's current API.

---

## 10. Glossary

| Term | Definition |
|---|---|
| **Harness** | The runtime that drives the LLM, registers tools/commands/agents, and manages sessions. OpenCode, Pi, Claude Code, Cursor are harnesses. |
| **Module** | A self-contained bundle of agents, skills, commands, rules. Examples: `core`, `engine-godot`, `art`, `design`. |
| **Agent** | A named persona with its own system prompt. OCGS has 3 tiers: Directors (Tier 1), Department Leads (Tier 2), Specialists (Tier 3). |
| **Skill** | A reusable workflow packaged as a `SKILL.md` file per the Agent Skills spec. OCGS has 77 skills. |
| **Command** | A user-invokable shortcut (slash command in OpenCode, prompt template or extension command in Pi). OCGS has 54 commands. |
| **Rule** | A path-scoped style guide that influences LLM behavior when working in matching paths. OCGS has 11 rules. |
| **Plugin** (OpenCode) | A TypeScript module that registers lifecycle hooks with the OpenCode runtime. OCGS has 3 plugins. |
| **Extension** (Pi) | A TypeScript module that registers tools, commands, and event handlers with the Pi runtime. Pi's equivalent of plugins. |
| **OCGS** | OpenCode Game Studios. The framework being extended to support Pi. |
| **Parity** | The property that an OCGS scenario produces the same observable behavior (audit log, drift reports, changelogs) in both OpenCode and Pi. |

---

## 11. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Pi API breaking changes** — Pi is pre-1.0 (0.79.x); extension API may shift. | High | High (rewrites needed) | Pin `^0.79.0` in `.pi/settings.json`; subscribe to Pi changelog; design extensions with small surface area |
| **OpenCode content discovery** — No straightforward way to have OpenCode scan `.agents/` instead of `.opencode/`. | Medium | Medium | Investigate during Phase 1; fallback to symlinks |
| **LLM API budget for parity tests** — Parity tests use real API calls; nightly CI may exceed budget. | High | Medium | Make parity tests opt-in; use cheaper models for smoke tests; cache responses |
| **Agent catalog drift** — Adding/removing agents without updating agent references in prompts. | Medium | Low | Runtime discovery from `.agents/agents/`; validate agent names referenced in task tool |
| **Path-scope rule false positives** — Injecting rules for paths the LLM isn't actually working in wastes context window. | Medium | Low | Ring buffer of recent paths; rules only inject for recently-touched paths |
| **MCP server compatibility** — OCGS uses MCP servers (aseprite). Pi's MCP support may differ. | Medium | Medium | Document MCP config in `opencode.json`; test in Pi early |
| **Long-term OpenCode abandonment** — If OpenCode loses momentum, we maintain two harnesses. | Low (current) | High (long-term) | Track adoption; `.agents/` structure makes future migrations straightforward |
| **Documentation fragmentation** — Pi-specific, OpenCode-specific, and shared docs out of sync. | High | Medium | One `docs/pi-compatibility.md`; cross-link from other docs |

---

## 12. Out of Scope

1. **OCGS-to-Pi session migration** — Defer until Pi adoption is significant.
2. **Multi-select `question` tool** — When a use case emerges.
3. **Image attachment in `question` tool** — Ditto.
4. **Path-guard rule enforcement** (blocking edits that violate rules) — High-friction, defer.
5. **OCGS module marketplace** — Defer until core is stable.
6. **Pi-native project templates** — A future `pi init` flow.
7. **New agents, skills, or commands specific to Pi** — Pi users get the same content as OpenCode users for now.
8. **`@ocgs/*` npm packages** for `pi install` distribution — Defer until git-clone-based usage is proven.
9. **Migration of existing CCGS projects directly to Pi** — They go through OCGS first.
10. **Performance optimization** — Initial implementation prioritizes correctness.
11. **Localization of OCGS content** — All content is English-only.

---

## 13. Acceptance Criteria

### Phase 1 (v0.8.0) — Restructure

- [ ] All 51 agents, 77 skills, 54 commands, 11 rules, and 17 modules live in `.agents/`
- [ ] Agent files have harness-neutral frontmatter (no `model:`, `mode:`, `permission:` fields)
- [ ] OpenCode works identically to before the restructure
- [ ] `tools/migrate-to-agents.mjs` script exists and is tested
- [ ] `pi --list-skills` shows all 77 OCGS skills
- [ ] `pi --list-agents` shows all 51 OCGS agents
- [ ] `tests/agents/validate.mjs` validates `.agents/` structure

### Phase 2 (v0.9.0) — Pi Extensions Core

- [ ] `ocgs-delegation` extension registers `Task` tool with all 51 agents discoverable at runtime
- [ ] `ocgs-delegation` extension registers `/consult` command
- [ ] `ocgs-question` extension registers `question` tool with TUI picker
- [ ] `ocgs-path-guard` extension injects rules from `.agents/rules/` into system prompt based on LLM context
- [ ] `ocgs-audit` extension produces byte-identical audit log to OpenCode's `ccgs-hooks.ts`
- [ ] Parity tests for delegation and path-guard pass

### Phase 3 (v0.10.0) — Plugin Parity

- [ ] `ocgs-drift-detector` produces same drift reports as OpenCode `drift-detector.ts`
- [ ] `ocgs-changelog` produces same changelog as OpenCode `changelog-generator.ts`
- [ ] `ocgs-validate` runs GDD/manifest validation
- [ ] All 51 OCGS agent prompts work verbatim in Pi
- [ ] All parity tests (`tests/e2e/test-parity.test.ts`) pass

### Phase 4 (v0.11.0) — Polish + Docs

- [ ] `docs/pi-compatibility.md` published, walks new user through Pi setup
- [ ] CI runs static validation on every PR
- [ ] Migration guide for existing users
- [ ] A sample `.claude/` or `.cursor/` config demonstrates the future-harness pattern

### Final v1.0 acceptance (post-Phase 4)

- [ ] All Phase 1-4 acceptance criteria are met
- [ ] A new user can complete `/start` → `/brainstorm` flow in both OpenCode and Pi with no degraded experience
- [ ] The audit log file is byte-identical for the same scenario run in both harnesses
- [ ] Documentation covers both flows and is navigable

---

## 14. References

### Existing OCGS documentation
- `AGENTS.md` — Project configuration, available commands, studio hierarchy
- `.opencode/docs/agent-roster.md` — Full list of 51 agents
- `.opencode/docs/agent-coordination-map.md` — Cross-agent delegation patterns
- `.opencode/docs/director-gates.md` — Strategic decision flow
- `.opencode/docs/hooks-reference.md` — CCGS-to-OpenCode plugin port documentation
- `.opencode/docs/skills-reference.md` — All 77 skills
- `.opencode/docs/commands-reference.md` — All 54 commands
- `docs/superpowers/specs/2026-05-09-modular-framework-design.md` — Prior modular framework design
- `docs/superpowers/specs/2026-05-11-modular-framework-fixes-design.md` — Prior fixes
- `docs/superpowers/specs/2026-06-17-pi-compatibility-design.md` — Earlier Pi design (superseded)

### Pi documentation
- Pi main documentation: `@earendil-works/pi-coding-agent/README.md`
- Pi extensions: `docs/extensions.md` — full extension API
- Pi skills: `docs/skills.md` — Agent Skills spec
- Pi RPC: `docs/rpc.md` — JSON protocol for headless use
- Pi settings: `docs/settings.md`
- Pi TUI: `docs/tui.md` — custom UI components
- Pi examples: `examples/extensions/` — 80+ working examples

### External references
- [Agent Skills specification](https://agentskills.io/specification) — cross-harness skill format
- [OpenCode documentation](https://opencode.ai/docs) — current OpenCode harness
- [Claude Code Game Studios (CCGS)](https://github.com/Donchitos/Claude-Code-Game-Studios) — the original framework
- [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) — for MCP integrations
