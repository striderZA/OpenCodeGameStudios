# Pi Agent Compatibility for OpenCode Game Studios

**Status:** Draft (pending user review)
**Date:** 2026-06-17
**Context:** OpenCode Game Studios (OCGS) was ported from Claude Code Game Studios (CCGS) by replacing the 12 CCGS bash hooks with a TypeScript plugin (`ccgs-hooks.ts`) and adding 51 agents, 77 skills, 54 commands, and 11 path-scoped rules. Some Claude Code capabilities — custom TUI components, full lifecycle event hooks, tool-result mutation, hot-reload, RPC mode, in-process subagent tooling — were not portable to OpenCode. Pi (a separate, more expressive coding agent harness) reintroduces those capabilities. This design adds Pi as a second supported harness without breaking OpenCode compatibility.

**Decisions captured (during brainstorming):**
- **Approach:** Dual-harness parity (work in *both* OpenCode and Pi; not a port that abandons OpenCode).
- **Coverage:** Full parity for skills, agents, commands, plugins, rules, and modules. Plus Pi-only enhancements where Pi's richer event model allows (custom TUI, `tool_result` mutation, hot-reload, RPC).
- **Distribution:** Single repo. `.opencode/` is the canonical source of truth. A deterministic codegen step (`tools/generate-pi.mjs`) produces `.pi/`. Both ship in the repo. Pi packages (`@ocgs/*`) are also published to npm for `pi install` distribution as a secondary channel.
- **Delegation:** Two cross-harness primitives. `Task` tool for vertical execution (Tier 1 → Tier 2 → Tier 3). `/consult` command for horizontal peer review. Both registered as a `ocgs-delegation` Pi extension; OCGS agent prompts that say "Use the `Task` tool" work verbatim in both harnesses.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Repository Layout](#2-repository-layout)
3. [Source of Truth and Codegen Pipeline](#3-source-of-truth-and-codegen-pipeline)
4. [Modular System Redesign](#4-modular-system-redesign)
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

OCGS becomes a **dual-harness framework** with a single canonical source of truth. The `.opencode/` directory is canonical content (agents, skills, commands, plugins, rules, modules) — everything humans edit. A new deterministic codegen step (`tools/generate-pi.mjs`) reads `.opencode/` and produces `.pi/` artifacts that Pi consumes natively. The existing `install.mjs` (OpenCode installer) is paired with a new `install-pi.mjs` (Pi installer); both read the same harness-neutral `modulefile.yaml`. OCGS modules additionally publish as npm packages so Pi users can `pi install npm:@ocgs/godot` directly. A new `ocgs-core` Pi extension umbrella registers the cross-harness `Task` tool (delegation), `consult` command (peer review), and `question` tool (structured decision UI) so the existing 51 OCGS agent prompts work verbatim in both harnesses. Path-scoped rules (`.opencode/rules/*.md`) are compiled into a Pi `ocgs-path-guard` extension that enforces them via `tool_call` interception. Plugins (`ccgs-hooks`, `drift-detector`, `changelog-generator`) are ported to Pi extensions with semantic parity plus targeted Pi-only enhancements. A unified validation suite (`node tests/agents/validate.mjs`) checks both `.opencode/` and `.pi/` artifacts, and a new e2e harness (Pi RPC mode) tests end-to-end agent delegation flows. Phased rollout: v1 = skills + agents + codegen skeleton; v2 = commands + modular system; v3 = plugins + Pi-only enhancements; v4 = RPC/CI integration.

### Three architectural principles

1. **The OCGS prompt contract is sacred.** "Use the `Task` tool" must mean the same thing in OpenCode and Pi. Tool names (`Task`, `question`), agent names (`creative-director`, `game-designer`), skill names, and command names are the cross-harness stability surface. If a name would differ between harnesses, we wrap and alias — never rename the OCGS-facing name.
2. **`.opencode/` is canonical, `.pi/` is derived, both are git-tracked.** Codegen is deterministic. If you change `.opencode/`, `generate-pi.mjs` regenerates `.pi/`. CI fails if the two are out of sync. No "build step required for users" — they `git clone` and have both sides. Pi packages (npm) are produced by a separate `tools/package-pi.mjs` step that runs on release, not on every commit.
3. **Pi-only features are opt-in modules, not core.** Custom TUI for `/start`, `tool_result` mutation, hot-reload, RPC integration — these live in `.opencode/extensions/ocgs-pi-enhancements/` (a new asset class) and are activated by a `pi: true` flag in `modulefile.yaml`. Default modules work in both harnesses.

---

## 2. Repository Layout

```text
OpenCodeGameDesign/
├── AGENTS.md                    # unchanged; describes dual-harness support
├── opencode.json                # unchanged; OpenCode config
├── pi.json                      # NEW: Pi settings, generated from opencode.json + modulefile state
├── .opencode/                   # CANONICAL SOURCE OF TRUTH (humans edit here)
│   ├── agents/                  # 51 agent .md files, format unchanged
│   ├── skills/                  # 77 skill dirs with SKILL.md, format unchanged
│   ├── commands/                # 54 command .md files, format unchanged
│   ├── plugins/                 # 3 plugin .ts files (ccgs-hooks, drift-detector, changelog-generator)
│   ├── rules/                   # 11 path-scoped rule .md files
│   ├── modules/                 # MODULE DECLARATIONS (see Section 4)
│   │   ├── core/modulefile.yaml + assets
│   │   ├── engine-godot/modulefile.yaml + assets
│   │   ├── ...
│   │   └── installed.json       # tracks user's installed module set (OpenCode side)
│   └── extensions/              # NEW ASSET CLASS: Pi-only extensions
│       ├── ocgs-delegation/     # Task tool + consult command
│       ├── ocgs-question/       # Question tool
│       ├── ocgs-pi-enhancements/# Custom TUI, tool_result mutation, hot-reload glue
│       └── ocgs-path-guard/     # Path-scoped rules enforcement
├── .pi/                         # GENERATED (committed, git-tracked, CI-validated)
│   ├── agents/                  # 51 files: frontmatter translated from OCGS format
│   ├── skills/                  # 77 files: identical content (already Agent Skills spec)
│   ├── prompts/                 # 54 files: translated from .opencode/commands/
│   ├── extensions/              # 1 main entry extension that loads everything
│   │   └── index.ts             # imports & registers ocgs-delegation, ocgs-question, etc.
│   ├── packages/                # GENERATED RELEASE ARTIFACTS (gitignored, produced by package-pi.mjs)
│   │   ├── ocgs-core/
│   │   ├── ocgs-godot/
│   │   └── ...
│   ├── installed.json           # Pi-side install state (separate from .opencode/modules/installed.json)
│   └── settings.json            # Pi-side settings: enableSkillCommands, scopedModels, etc.
├── tools/
│   ├── lib/                     # existing parse-modulefile.mjs etc.
│   ├── generate-pi.mjs          # NEW: reads .opencode/ → writes .pi/
│   ├── install-pi.mjs           # NEW: Pi-side installer (parallels install.mjs)
│   ├── package-pi.mjs           # NEW: builds .pi/packages/ocgs-*/ npm tarballs
│   ├── validate.mjs             # existing, extended to also check .pi/
│   └── tests/                   # codegen + install-pi unit tests
├── tests/
│   ├── agents/                  # existing validation suite
│   ├── codegen/                 # NEW: snapshot tests for generate-pi.mjs output
│   ├── extensions/              # NEW: Pi extension unit tests
│   ├── e2e/                     # NEW: Pi RPC-mode end-to-end tests
│   └── plugins/                 # existing
├── docs/
│   ├── ...existing...
│   ├── pi-compatibility.md      # NEW: user-facing Pi setup guide
│   ├── authoring-agents.md      # updated: "agent names must be stable across harnesses"
│   └── authoring-skills.md      # updated: minimal changes (Agent Skills spec already aligned)
├── production/                  # unchanged
├── src/ assets/ design/         # unchanged: user's game project
└── prototype/                   # unchanged
```

### 2.1 Three small but important details

1. **`.pi/agents/` is committed but mechanically generated.** No one edits `.pi/` by hand. The generated frontmatter looks like:
   ```markdown
   ---
   name: creative-director
   description: "..."          # from OCGS frontmatter
   model: opencode-go/kimi-k2.6 # from OCGS frontmatter
   tools: [read, bash, edit, write, Task, question, consult] # synthesized: OCGS permissions + cross-harness tools
   ---

   [body identical to .opencode/agents/creative-director.md]
   ```
   The `tools:` allowlist is the *only* new field Pi needs. The OCGS `permission:` block in OpenCode is encoded into the `tools:` set (allow = listed, deny = omitted) plus a separate `ocgs-path-guard` extension for the path/branch protections that don't fit tools.

2. **`.pi/extensions/index.ts` is the single Pi extension entry point.** It imports and registers all the OCGS extensions. When `generate-pi.mjs` runs, it writes a barrel file that imports each module's extension via standard `npm`-style paths so module authors can use deps in their extensions.

3. **`pi.json` is for runtime Pi settings only, not assets.** Things like `enableSkillCommands: true`, `scopedModels` (for `/model` cycling between creative-director and qa-tester models), `enableCustomTui: true`. Generated by `install-pi.mjs` from the user's installed module set. NOT a copy of `opencode.json`.

### 2.2 Backward compatibility

Existing OCGS users see: their `.opencode/` is unchanged, their `opencode.json` is unchanged, the only new thing in their repo (after a `node tools/generate-pi.mjs` run) is a `.pi/` directory they can ignore until they install Pi. The `install.mjs` script gains a new `--with-pi` flag that also runs the Pi side. If a user doesn't have Pi installed, nothing breaks.

---

## 3. Source of Truth and Codegen Pipeline

`.opencode/` is canonical. A deterministic codegen step derives `.pi/`. The pipeline has three stages: parse, translate, emit. Each stage is independently testable.

### 3.1 Pipeline overview

```
.opencode/                  tools/generate-pi.mjs              .pi/
─────────────               ─────────────────────              ──────
agents/*.md          ──┐
skills/*/SKILL.md    ──┤
commands/*.md        ───┼──>  [parse]  ──>  [translate]  ──>  agents/*.md
plugins/*.ts         ──┤                                       skills/*/SKILL.md
rules/*.md           ──┤                                       prompts/*.md
modules/*/modulefile ──┘                                       extensions/index.ts
                                                                settings.json
```

### 3.2 Stage 1: Parse (lossless, no decisions)

Read every asset in `.opencode/`. Produce a normalized intermediate representation (IR) — a single JSON object describing every file, its frontmatter, its body, its dependencies. This stage is **pure**: same input → same IR, byte-for-byte. The IR shape:

```typescript
interface IrFile {
  sourcePath: string;          // ".opencode/agents/creative-director.md"
  type: "agent" | "skill" | "command" | "plugin" | "rule" | "extension" | "doc";
  frontmatter: Record<string, unknown>;
  body: string;                // markdown body
  referencedAssets: string[];  // names referenced in the body (Task, question, other agent names)
}

interface Ir {
  files: IrFile[];
  modules: Record<string, IrModule>;   // parsed modulefile.yaml + assets
  crossReferences: Map<string, string[]>; // agent "delegates to" → agent names
}
```

The IR is held in memory; we can also write it to `tools/.cache/ir.json` for debugging and for tests to assert against.

### 3.3 Stage 2: Translate (where the decisions live)

For each asset type, a dedicated translator maps OCGS → Pi. Each translator is a pure function `(ir: IrFile) => PiFile`:

| Source | Translator | Output |
|---|---|---|
| `.opencode/agents/*.md` | `translateAgent` | `.pi/agents/<name>.md` with `name`/`description`/`model`/`tools` frontmatter; body unchanged |
| `.opencode/skills/*/SKILL.md` | `translateSkill` | `.pi/skills/<name>/SKILL.md` (mostly identity) |
| `.opencode/commands/*.md` | `translateCommand` | Either `.pi/prompts/<name>.md` (simple cases) OR registration in `.pi/extensions/ocgs-commands/index.ts` (complex cases with args/TUI) |
| `.opencode/plugins/*.ts` | `translatePlugin` | `.pi/extensions/ocgs-<name>/index.ts` with `Plugin` → `ExtensionAPI` adapter |
| `.opencode/rules/*.md` | `translateRule` | Compiled into `ocgs-path-guard` extension's rule table |
| `.opencode/extensions/*.ts` | `translateExtension` | Re-emitted with possibly rewritten import paths; passed through to `.pi/extensions/` |
| `.opencode/modules/*/modulefile.yaml` | `translateModule` | Updates `.pi/settings.json` `packages` array; updates `.pi/extensions/index.ts` barrel |

**The decision of "is a command a prompt or an extension?"** is a rule:
- If the OCGS command's body is pure markdown with `$ARGUMENTS` interpolation → emit as `.pi/prompts/<name>.md` (Pi auto-discovers it as a prompt template).
- If the OCGS command needs arguments parsing, async work, custom UI, or state → emit as `pi.registerCommand()` registration inside the `ocgs-commands` extension.

This is detected by looking at the command's `argument-hint:` frontmatter + body structure. A `command-type: prompt|extension` override in frontmatter is available for edge cases.

**Cross-references get resolved at translate time.** If `creative-director.md` says "Use the `Task` tool to delegate to `game-designer`", the translator:
1. Looks up `game-designer` in the agent catalog.
2. Generates a TypeBox `StringEnum` of all valid agent names for the `Task` tool's `agent` parameter.
3. Ensures `game-designer` is in the appropriate harness-side allowlist (Pi handles subagent tool sets via the SDK at delegation time, not via per-agent `tools:` fields).

### 3.4 Stage 3: Emit (deterministic write)

Walk the IR, write each `PiFile` to disk. **Files are written in a fixed order** (sorted by path). **File contents are deterministic**: no timestamps, no build IDs, no random IDs in the output. Re-running `generate-pi.mjs` on the same input produces a byte-identical `.pi/`. This is what makes the codegen testable with snapshot tests.

After emit, `generate-pi.mjs` runs a **verification pass**: re-parse the emitted `.pi/`, assert that the round-trip is stable (Pi can read it, names match OCGS names, no orphans). Failure here = bug in the translator.

### 3.5 What about plugin source code (TypeScript)?

`ccgs-hooks.ts` is 600+ lines of TypeScript. It uses the OpenCode `Plugin` interface. The Pi version uses `ExtensionAPI` with different event names and a different tool interception API. There are three ways to handle this:

| Approach | Pros | Cons |
|---|---|---|
| **Hand-rewrite each plugin to Pi idioms** (chosen) | Cleanest, uses Pi's full feature set | Three full rewrites; risk of behavior drift |
| **Adapter layer (`@ocgs/plugin-compat`)** | Single port, plugins stay as-is | Adapter leaks OpenCode semantics; Pi-specific features can't be added without escaping the adapter |
| **Codegen translation of plugin code** | Automated | TS-to-TS codegen is brittle; OpenCode and Pi event shapes are too different for clean codegen |

The hand-rewrite approach mirrors what was done when CCGS bash hooks were ported to OpenCode: the original scripts were translated to TypeScript, not auto-converted. Section 8 details the per-plugin rewrite plan.

### 3.6 `tools/generate-pi.mjs` CLI

```bash
# Default: regenerates .pi/ from .opencode/
node tools/generate-pi.mjs

# Check mode: exit 1 if .pi/ is out of date (used in CI)
node tools/generate-pi.mjs --check

# Verbose: print what changed
node tools/generate-pi.mjs --verbose

# Single asset type (for debugging)
node tools/generate-pi.mjs --only agents
```

The `--check` mode is what CI runs on every PR. The `--verbose` mode is what contributors run when adding new agents/skills.

### 3.7 Snapshot tests for codegen

`tests/codegen/` holds the snapshot test suite. For each known-good input fixture (a representative agent, skill, command, plugin, rule, modulefile), the test:
1. Runs the translator on the fixture.
2. Compares the output to a checked-in `.snap` file.
3. Fails if they differ.

Adding a new agent to `.opencode/agents/` regenerates the snapshot as part of the PR — the snapshot file is committed alongside the agent file. This is the same pattern as Jest/Vitest snapshot tests, applied to codegen.

### 3.8 Edge cases worth flagging

1. **OCGS agents with `mode: primary` and `mode: subagent`.** Pi's agent system doesn't have this distinction (Pi agents are all invokable). The translator drops the `mode` field and registers the agent either way. For `subagent` agents, the translator ensures they appear in the `delegate_to_*` enum of agents that reference them.
2. **OCGS `permission:` blocks.** Pi doesn't have per-agent permission blocks. The translator maps them to either: (a) the agent's `tools:` allowlist, or (b) a per-agent config in the `ocgs-path-guard` extension. See Section 7 for the path-guard details.
3. **`$ARGUMENTS` in commands.** Pi prompt templates use `{{args}}` instead. The translator does a search-replace at emit time. Simple but error-prone if `$ARGUMENTS` appears in code blocks (escape correctly).
4. **Plugin TS imports.** OCGS plugins import from `@opencode-ai/plugin`. Pi extensions import from `@earendil-works/pi-coding-agent`. The translator rewrites import paths. For plugins that also import npm packages, `package-pi.mjs` (Section 4) handles the bundling.

---

## 4. Modular System Redesign

The `modulefile.yaml` stays the source of truth, but it grows a `harnesses:` block so module authors can declare per-harness behavior. Two installers read the same file. A new `package-pi.mjs` builds npm tarballs for `pi install` distribution.

### 4.1 New `modulefile.yaml` shape (additive, OCGS-compatible)

The existing fields stay exactly as they are. New optional fields:

```yaml
name: engine-godot
version: "0.7.0"                     # bumped because format grew
description: "Godot 4 engine specialists..."
depends: [core]

provides:                              # UNCHANGED — harness-neutral asset list
  agents: [godot-specialist, godot-gdscript-specialist, godot-csharp-specialist,
           godot-shader-specialist, godot-gdextension-specialist]
  skills: [automated-smoke-test]
  commands: []
  rules: [engine-code, shader-code]
  plugins: []
  extensions: [godot-mcp]             # NEW: Pi-only extensions
  docs: []

plugged-into:                          # UNCHANGED
  engines: [godot]

harnesses:                             # NEW: per-harness behavior
  opencode:                            # explicit, but mostly identity
    # nothing special — the installer copies as-is
  pi:
    packages:                          # npm packages to install for Pi users
      - "npm:@earendil-works/pi-coding-agent@^1.0.0"
    skills:                            # Pi-specific skill assets (rare)
      godot-pi-tips: "extensions/godot-pi-tips"
    commands:                          # Pi-specific command registrations
      - name: setup-godot-pi
        type: extension                # vs 'prompt'
        path: commands/setup-godot-pi.ts
    customTools:                       # Custom tools this module contributes
      - name: godot_run
        path: tools/godot-run.ts
        description: "Run a Godot scene with MCP"
    scopedModels:                      # Optional: per-agent model preferences
      "godot-specialist": "anthropic/claude-sonnet-4"
    piSettings:                        # Free-form entries into .pi/settings.json
      enableSkillCommands: true
```

**The `provides:` block stays harness-neutral** because most modules *do* want the same assets in both harnesses. The `harnesses:` block exists for the **exceptions**: a Godot-specific Pi TUI wizard, a Unity MCP custom tool, etc.

### 4.2 Two installers, one modulefile

**Existing `install.mjs` (OpenCode side) — unchanged behavior, new flag:**
```bash
node .opencode/modules/install.mjs add godot            # OCGS-only (current behavior)
node .opencode/modules/install.mjs add godot --with-pi  # also runs install-pi
```

**New `install-pi.mjs` (Pi side):**
```bash
node tools/install-pi.mjs add godot
```

The two installers share a common library at `tools/lib/install-shared.mjs`:
- `readModulefile(name)` — already exists
- `resolveModuleAssets(name, harness)` — returns the file list to copy
- `copyAssets(src, dst)` — file copy with progress
- `updateInstalledState(name, harness, status)` — writes `installed.json` (or `.pi/installed.json`)

The two installers diverge only in their per-harness behavior: which files to copy, which `settings.json` keys to write, which npm packages to declare.

### 4.3 The `installed.json` problem

We have two state files:
- `.opencode/modules/installed.json` (OpenCode side, unchanged)
- `.pi/installed.json` (Pi side, new)

**Rationale for two state files:**
- An OpenCode-only user shouldn't see a `.pi/installed.json` appear in their repo.
- A Pi-only user shouldn't have to commit `.opencode/modules/installed.json` they don't read.
- The two state files can drift (a user can `install.mjs add godot` without `--with-pi` and have only OpenCode state). This is a feature, not a bug — it represents actual user choice.
- `install.mjs add godot --with-pi` writes to both.

The "list" command in `install.mjs` reports OpenCode state; the "list" command in `install-pi.mjs` reports Pi state. Each is self-contained.

### 4.4 The `package-pi.mjs` step: building npm tarballs

The Pi ecosystem has `pi install npm:@ocgs/godot` and `pi install git:...`. For this to work, OCGS publishes npm packages. The shape:

```text
.pi/packages/ocgs-godot/         # one npm package per OCGS module
├── package.json
├── README.md
├── extensions/                  # Pi extensions
│   └── index.ts                 # barrel that registers godot-pi-tips skill + setup-godot-pi command
├── skills/                      # skill assets (Agent Skills spec)
├── prompts/                     # if any
└── agents/                      # if any
```

`package.json` declares the Pi package metadata:

```json
{
  "name": "@ocgs/godot",
  "version": "0.7.0",
  "description": "OCGS Godot 4 engine specialists — Pi side",
  "keywords": ["ocgs", "godot", "game-development", "pi-package"],
  "pi": {
    "extensions": ["./extensions/index.ts"],
    "skills": ["./skills"],
    "prompts": ["./prompts"],
    "agents": ["./agents"]
  },
  "dependencies": {
    "@earendil-works/pi-coding-agent": "^1.0.0"
  },
  "peerDependencies": {
    "@earendil-works/pi-ai": "*",
    "@earendil-works/pi-agent-core": "*",
    "@earendil-works/pi-coding-agent": "*",
    "@earendil-works/pi-tui": "*",
    "typebox": "*"
  }
}
```

`tools/package-pi.mjs` produces this tree from a module's `modulefile.yaml` + `harnesses.pi:` block. The output is gitignored under `.pi/packages/` — it's a release artifact, not source. Published via `npm publish` on tag.

### 4.5 What the user sees

**OpenCode-only user (today's workflow, unchanged):**
```bash
git clone https://github.com/.../OpenCodeGameDesign
cd my-game
node .opencode/modules/install.mjs add godot
# → copies agents, skills, rules from .opencode/modules/godot/ to .opencode/
# → updates opencode.json, installed.json
# → no .pi/ side effects
```

**OpenCode + Pi user (new):**
```bash
git clone https://github.com/.../OpenCodeGameDesign
cd my-game
node .opencode/modules/install.mjs add godot --with-pi
# → does the OpenCode install
# → also runs install-pi.mjs add godot
# → adds Pi packages to .pi/settings.json
# → copies Pi extensions to .pi/extensions/
# → updates .pi/installed.json
```

**Pi-only user (npm distribution):**
```bash
mkdir my-game && cd my-game
# copy in AGENTS.md, opencode.json (or just AGENTS.md if they don't care about OpenCode at all)
pi install npm:@ocgs/core
pi install npm:@ocgs/godot
# → modules installed; no .opencode/ side effects
# → user might not even have a .opencode/ directory
```

The Pi-only path is the **primary growth path** for new users who don't know OCGS history. They install OCGS via Pi's package system without ever touching `.opencode/`. The `.opencode/` directory only exists for users who want to develop the framework itself or who use the OpenCode harness.

### 4.6 Migration for existing OCGS users

Their existing `installed.json` and `.opencode/` files don't change. The first time they upgrade to a Pi-compatible OCGS version:
1. `node tools/generate-pi.mjs` runs automatically (or they run it manually).
2. `.pi/` is generated.
3. `node .opencode/modules/install.mjs reapply` is a new command that re-derives `.pi/` from the user's currently installed module set. (For users who don't run `--with-pi` at install time but want to add Pi later.)
4. They commit `.pi/`. Existing OCGS workflows keep working.

A `pi-migrate` command on `install.mjs` walks the user through the upgrade: "OCGS 0.7 has Pi support. Run `generate-pi.mjs` now? [Y/n]".

---

## 5. Delegation Mechanism

The `Task` tool and `consult` slash command are the two cross-harness delegation primitives. Both live in a single `ocgs-delegation` Pi extension. OpenCode users get the same semantics through the `Task` tool they already use (no changes needed).

### 5.1 The two delegation primitives

OCGS agent prompts use the `Task` tool for two distinct patterns. Naming them differently makes prompts clearer and matches OCGS's actual usage:

| Primitive | Pattern | When to use | Implementation |
|---|---|---|---|
| **`Task` tool** | Vertical execution | "Do this work, return the result" (Tier 1 → Tier 2, Tier 2 → Tier 3) | Custom tool, registered with `pi.registerTool()` |
| **`consult` command** | Horizontal review | "Look at this, tell me your concerns" (peer-to-peer) | Custom command, registered with `pi.registerCommand()` |

**Why two primitives, not one?** Three reasons:
1. **Semantics differ.** Execution has a clear "do the work, return the artifact" lifecycle. Consultation is part of the message flow — the consulted agent's response becomes a new assistant turn the parent can react to.
2. **Tooling differs.** Task needs a tool schema (the LLM calls it inline). Consult works better as a slash command (the parent decides to break flow and ask).
3. **Pi's primitives match naturally.** `pi.registerTool()` for Task (the LLM calls it during a turn). `pi.registerCommand()` for consult (the LLM issues it as a subcommand). The Pi extension API maps cleanly.

### 5.2 The `Task` tool

**Schema (TypeBox):**

```typescript
import { StringEnum } from "@earendil-works/pi-ai";
import { Type } from "typebox";

const AgentNameSchema = StringEnum(
  ["creative-director", "technical-director", "producer",
   "game-designer", "lead-programmer", "art-director",
   // ...all 51 agent names, generated at codegen time
  ] as const
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
  promptSnippet: "Delegate work to another OCGS agent and return the result",
  promptGuidelines: [
    "Use the Task tool when you need another agent to DO WORK on your behalf and report back with a result.",
    "Pass `agent` as the target agent's name; if omitted, the orchestrator will pick.",
    "Pass `prompt` as clear, self-contained instructions for the target agent.",
    "Pass `context` only if the target agent needs information not in its own system prompt.",
    "Do NOT use Task for peer review — use the /consult command for that.",
  ],
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
  renderCall(args, theme) { /* ... */ },
  renderResult(result, options, theme) { /* ... */ },
});
```

**Key design choices:**

- **In-memory subagent session** (`SessionManager.inMemory()`) — the subagent's conversation is ephemeral, doesn't pollute the parent's session file, doesn't need a separate entry in the session tree. The parent's session is the source of truth.
- **Streaming via `onUpdate`** — the subagent's text appears in the parent's TUI as it streams. Feels like a single conversation even though it's structurally two.
- **Tool result is the final assistant text** — what the LLM "sees" is the subagent's final response, wrapped in the tool result. The LLM can react to it inline (continue the conversation, ask a follow-up, etc.).
- **Audit log** — every delegation gets a record. Used for the same purposes as OCGS's existing audit log: debugging, "what did the game-designer say about this sprint?", session reconstruction.
- **`isolation: "forked"` option** — for cases where the parent wants the subagent to have a fully isolated session (its own file, can be inspected later). Used rarely, mostly for debugging.
- **TypeBox `StringEnum` for `agent`** — generated from the agent catalog at codegen time. The LLM gets a dropdown of valid agents, no typos.

### 5.3 The `consult` command

**Implementation sketch:**

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

- **Slash command, not a tool.** A consultation is a deliberate "break flow" decision by the parent agent. The slash command pattern makes this visible and explicit. The LLM only invokes it when it really wants a second opinion.
- **Read-only tools.** A consultant is asked to *review*, not to *change*. The `["read", "grep", "find", "ls"]` allowlist enforces this. The consultant can't accidentally edit a file mid-review.
- **Context from recent session.** The parent agent's recent conversation is passed as context. The consultant can refer to "your previous turn where you said X" without the parent having to repeat itself.
- **Single-turn, no further delegation.** The consultant's system prompt adds "You are being consulted. Provide your concerns, then STOP. Do not delegate further." This prevents infinite delegation loops.
- **TUI modal display.** Pi's `ctx.ui.custom()` shows the consultation result in a full-screen modal. The parent agent sees the response and can continue. The user also sees the consultation result clearly.

### 5.4 Cross-harness naming contract

The OCGS-facing names are the contract. The Pi extension registers tools/commands with **exactly the names OCGS agents reference**:

| OCGS prompt says... | Pi registers... | OpenCode uses... |
|---|---|---|
| "Use the `Task` tool" | `pi.registerTool({ name: "Task", ... })` | OpenCode's built-in `Task` tool |
| "Use the `/consult` command" | `pi.registerCommand("consult", ...)` | n/a (OpenCode agents don't have horizontal peer review yet — could be added later) |
| "Use the `question` tool" | `pi.registerTool({ name: "question", ... })` (Section 6) | Custom tool registered in OpenCode plugin |
| "Use the `Read` / `Write` / `Edit` / `Bash` tools" | Pi built-ins | OpenCode built-ins |

**No `Task`/`task` case differences. No renaming for harness clarity.** OCGS agents are written once, work in both harnesses because the names match.

### 5.5 Audit log integration

The delegation events are recorded in `.opencode/extensions/ocgs-audit/` (a new extension that subscribes to `tool_call`, `tool_result`, `command_executed` events). The audit log shape:

```typescript
type AuditEvent =
  | { type: "delegation"; from: string; to: string; prompt: string; resultLength: number; ts: number }
  | { type: "consultation"; from: string; to: string; question: string; response: string; ts: number }
  | { type: "tool_call"; tool: string; args: unknown; resultLength?: number; isError?: boolean; ts: number }
  | { type: "session_start"; reason: string; ts: number }
  | { type: "session_end"; reason: string; ts: number };
```

Written to `production/session-logs/audit.jsonl` (newline-delimited JSON, one event per line). The existing OCGS `logAudit()` function is ported to the Pi extension.

### 5.6 Tests for delegation

**Unit tests (`tests/codegen/test-delegation-translator.test.mjs`):**
- Translator correctly maps OCGS agent names to TypeBox `StringEnum` values
- Generated `Task` tool schema includes all delegatable agents
- Generated `consult` command's argument hint matches OCGS

**Integration tests (`tests/e2e/test-delegation.test.ts`):**
- Spawn a parent agent, mock the `Task` tool, verify the subagent is invoked with the right system prompt
- Test `consult` command end-to-end via Pi RPC mode
- Test the audit log records delegation events correctly

**Behavior-parity tests (`tests/e2e/test-parity.test.ts`):**
- Run an OCGS scenario in OpenCode, capture audit log
- Run the same scenario in Pi (via RPC mode), capture audit log
- Assert the audit logs are equivalent (delegation counts, agent names, prompt lengths match within tolerance)

---

## 6. Question Tool and Other Custom Tools

The `question` tool is the third cross-harness primitive. It's heavily used in OCGS agents (every `creative-director` example ends with a `question` call) and it has the biggest design surface. We also identify a small set of other custom tools Pi needs to fully replace OCGS's OpenCode plugin surface.

### 6.1 The `question` tool

**Why this needs its own section.** The `question` tool is referenced in 30+ OCGS agent prompts. It powers the "Strategic Decision UI" pattern from `creative-director.md`:

> "Use the `question` tool to present strategic decisions as a selectable UI. Follow the **Explain → Capture** pattern:
> 1. **Explain first** — Write full strategic analysis in conversation...
> 2. **Capture the decision** — Call `question` with concise option labels."

The pattern: agent explains its reasoning in text, then calls `question` to capture the user's choice from 2-4 options. This is a **structured decision capture** primitive — different from Pi's built-in `ctx.ui.select` (which is command-context only, not tool-callable from the LLM).

**Schema:**

```typescript
import { StringEnum } from "@earendil-works/pi-ai";
import { Type } from "typebox";

const OptionSchema = Type.Object({
  label: Type.String({ description: "Display label for the option (1-5 words)" }),
  description: Type.Optional(Type.String({ description: "One-sentence trade-off shown below label" })),
});

const QuestionParams = Type.Object({
  question: Type.String({ description: "The question to ask the user" }),
  options: Type.Array(OptionSchema, { minItems: 2, maxItems: 4 }),
  header: Type.Optional(Type.String({ description: "Optional short header (e.g. 'CD-PILLARS')" })),
});

pi.registerTool({
  name: "question",
  label: "Question",
  description: "Present a strategic decision to the user. Write your full analysis in conversation first, then call this tool with concise options. The user picks one or types a custom answer. Use for any decision point where you need user input to proceed.",
  promptSnippet: "Present a strategic decision with options and capture the user's choice",
  promptGuidelines: [
    "Use the question tool when you need the user to make a strategic choice between 2-4 options.",
    "ALWAYS write your full reasoning in conversation text BEFORE calling the question tool — explain the trade-offs, your recommendation, and why.",
    "Add '(Recommended)' to your preferred option's label.",
    "Labels: 1-5 words. Descriptions: 1 sentence with the key trade-off.",
    "Do NOT use the question tool for yes/no questions or open-ended input — use AskUserQuestion or just continue the conversation.",
  ],
  parameters: QuestionParams,
  async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
    // ... full TUI implementation (see below)
  },
  renderCall(args, theme) { /* ... */ },
  renderResult(result, options, theme) { /* ... */ },
});
```

**TUI implementation:** uses `ctx.ui.custom()` for a full-screen picker. The implementation closely follows Pi's `examples/extensions/question.ts` (which is a near-perfect starting point). Key adaptations for OCGS:

1. **Header support** — OCGS agents use gate IDs like `CD-PILLARS`, `CD-GDD-ALIGN`, `CD-NARRATIVE-FIT`. The `header` parameter renders as a colored prefix at the top of the picker, so the user knows which decision they're making.
2. **OCGS audit log integration** — every `question` invocation is logged with: agent name, question text, options, answer, wasCustom. Goes into `production/session-logs/agent-decisions.jsonl` (separate from delegation audit).
3. **Deterministic option ordering** — Pi's example uses a hash of the question to set the default selection. We use option index 0 (which OCGS agents are instructed to mark as "Recommended") for predictability.
4. **No "Type something" option in tool definition** — the LLM provides 2-4 options; the "Type something" fallback is added by the TUI at render time.

**Non-TUI mode handling** (RPC, JSON, print modes):

```typescript
if (ctx.mode !== "tui") {
  // In RPC mode, return the question + options as a structured response.
  // The RPC client is expected to present the question and call prompt() with the answer.
  return {
    content: [{ type: "text", text: `Question (${ctx.mode} mode): ${params.question}\nOptions: ${params.options.map(o => o.label).join(", ")}` }],
    details: {
      question: params.question,
      options: params.options.map(o => o.label),
      answer: null,
      pending: true,   // signals the RPC client to handle this
    } as QuestionDetails,
  };
}
```

This is critical for CI/headless use. An OCGS scenario that uses `question` can run in RPC mode, the test harness receives the structured question, dispatches it to a test fixture, and replies with a chosen answer.

### 6.2 Other custom tools

The `Task` and `question` tools cover most agent-prompt references. But OCGS's plugins also register behaviors that map to tools. A small survey:

| OCGS behavior (from `ccgs-hooks.ts`) | OCGS-side implementation | Pi implementation | Cross-harness? |
|---|---|---|---|
| `handleSessionCreated` (audit log, version check) | `session.created` event | `pi.on("session_start", ...)` | Yes (semantic) |
| `handleSessionIdle` (commit validation) | `session.idle` event | `pi.on("agent_end", ...)` + custom tool | Yes (semantic) |
| `handleToolExecuteBefore` (path protection) | `tool.execute.before` | `pi.on("tool_call", ...)` (blocks) | Yes (semantic) |
| `handleToolExecuteAfter` (drift detection) | `tool.execute.after` | `pi.on("tool_result", ...)` | Yes (semantic) |
| `handleCompaction` (recovery context) | `experimental.session.compacting` | `pi.on("session_before_compact", ...)` returning custom summary | Yes (semantic) |
| `handleAutoContinue` (post-compaction guidance) | `experimental.compaction.autocontinue` | `pi.on("session_compact", ...)` + `pi.sendUserMessage()` | Yes (semantic) |
| `handleAssetCheck` (validate GDD/manifest files) | `tool.execute.after` on `write` | `pi.on("tool_result", ...)` mutation | Yes (semantic) |
| `handleAskUserQuestion` (the `question` tool) | Custom tool | `pi.registerTool({ name: "question", ... })` | Yes (contract) |
| `handleAgentAudit` (record agent calls) | `tool.execute.before` | `pi.on("tool_call", ...)` + audit extension | Yes (semantic) |

**Most of these map cleanly to Pi events with semantic parity.** The plugin port in Section 8 goes through these one by one.

**The interesting design question is: do we put them in the OCGS-specific extensions, or in a single `ocgs-runtime` extension?**

**Recommendation:** a small number of focused extensions, not one mega-extension. Reasons:
- Each extension is independently testable.
- Module authors can override individual extensions.
- Hot-reload via `/reload` works per-extension.
- Pi's extension API encourages small focused extensions.

Proposed split:
- **`ocgs-delegation`** — `Task` tool + `consult` command (Section 5)
- **`ocgs-question`** — `question` tool (Section 6.1)
- **`ocgs-audit`** — session/delegation/decision logging
- **`ocgs-path-guard`** — path-scoped rules + protected branches (Section 7)
- **`ocgs-validate`** — GDD/manifest validation hooks
- **`ocgs-runtime`** — umbrella barrel that imports + registers all of the above

The first five are the actual implementation. The sixth is a convenience extension that a Pi user installs as a single package (`pi install npm:@ocgs/core` includes all five).

### 6.3 Tool-result mutation: a Pi-only enhancement

OCGS's `drift-detector.ts` plugin (when an agent edits a skill file, detect that and warn) currently uses `tool.execute.after` to check the result. In Pi, this is much richer:

```typescript
pi.on("tool_result", async (event, ctx) => {
  if (isEditToolResult(event) || isWriteToolResult(event)) {
    const path = event.input.path;
    if (path.includes(".opencode/skills/") || path.includes(".pi/skills/")) {
      const driftReport = await checkSkillDrift(path);
      if (driftReport.hasDrift) {
        return {
          content: [
            ...event.content,
            { type: "text", text: `\n\n⚠️ OCGS drift detected: ${driftReport.message}` },
          ],
          details: { ...event.details, drift: driftReport },
        };
      }
    }
  }
});
```

This is **Pi-only** because OpenCode's `tool.execute.after` can't modify the result. In OpenCode, the same warning has to be surfaced in a different way (audit log only, no LLM feedback). Pi users get a better experience; OpenCode users get semantic parity.

**A note on parity testing.** When OCGS's drift-detector fires in OpenCode vs Pi, the *audit log* must be identical. The *user-visible warning* may differ (Pi: inline; OpenCode: audit-only). This is a documented, tested difference, not a bug.

### 6.4 Custom tools contributed by modules

The `modulefile.yaml` `harnesses.pi.customTools:` block (Section 4) lets modules contribute custom tools. The codegen turns this into:

```typescript
// In .pi/extensions/ocgs-godot/index.ts (generated)
import godotRun from "../../.opencode/modules/engine-godot/tools/godot-run.js";

pi.registerTool({
  name: "godot_run",
  label: "Run Godot Scene",
  description: "Run a Godot scene and return debug output",
  parameters: godotRun.parameters,
  execute: godotRun.execute,
});
```

The tool's TypeScript source lives in the module's directory. The Pi side bundles it; the OpenCode side either registers it the same way (if OpenCode supports it) or skips it.

**Recommendation for Phase 1: Pi-only custom tools from modules.** OpenCode users don't get the `godot_run` tool in v1. The OpenCode harness's plugin API is more restrictive, and the value of cross-harness parity for engine-specific tools is low. If demand emerges, OpenCode support is a follow-up.

### 6.5 Question tool — design questions to flag

1. **Multi-select?** OCGS agents don't use multi-select today, and adding it changes the schema. **No, single-select only in v1.**
2. **Skip option?** Some OCGS scenarios want to let the user defer a decision. **No, "Skip" is the Esc key (cancels the question and lets the conversation continue).**
3. **Image support?** Pi supports image attachments. OCGS's strategic decisions are text-only. **No, text-only in v1.**

---

## 7. Path-Scoped Rules Translation

OCGS path-scoped rules become a `ocgs-path-guard` extension that watches the LLM's working context and dynamically injects relevant rules into the system prompt per turn.

### 7.1 What the rules actually are

The 11 OCGS rule files in `.opencode/rules/` have a consistent shape:

```yaml
---
paths:
  - "src/ai/**"        # glob list, applied with AND logic
---

# AI Code Rules

- AI update budget: 2ms per frame maximum — profile to verify
- All AI parameters must be tunable from data files...
- ... 10-15 bullets total

## Examples

**Correct** (some code example)
**Incorrect** (some code example)
```

These are **guidance, not enforcement**. The LLM reads them and is *expected* to follow them. There's no "rule violation blocked" in OCGS's current OpenCode implementation — they influence the LLM's behavior by being present in context.

### 7.2 Why a direct AGENTS.md translation doesn't fully work

The first instinct is to translate each rule to `AGENTS.md` in the matching path. But Pi's context-file loading is **cwd-walking**, not **file-scoped**:

- `pi` is run from the project root → loads `./AGENTS.md` only
- `pi` is run from `src/ai/` → loads `./AGENTS.md` and `../../AGENTS.md` and `../../../AGENTS.md`

A rule for `src/ai/**` placed at `src/ai/AGENTS.md` only loads when the user happens to be running pi from inside `src/ai/`. That's the wrong semantic — OCGS users expect the rules to load *whenever the LLM is working in that path*, regardless of cwd.

### 7.3 The `ocgs-path-guard` extension: dynamic scope detection

The solution: an extension that tracks the LLM's working context (which files it's been reading/editing) and injects matching rules into the system prompt at the start of each turn.

**Rule catalog (compiled at codegen time):**

```typescript
// Generated into .pi/extensions/ocgs-path-guard/rules.ts
import { minimatch } from "minimatch";

export interface Rule {
  name: string;
  paths: string[];                      // glob list
  body: string;                         // markdown body
  source: string;                       // original path: ".opencode/rules/ai-code.md"
}

export const RULES: Rule[] = [
  {
    name: "engine-code",
    paths: ["src/core/**"],
    body: "# Engine Code Rules\n\n- ZERO allocations in hot paths...",
    source: ".opencode/rules/engine-code.md",
  },
  // ... 11 rules total
];
```

**Scope tracker (extension state):**

```typescript
// In ocgs-path-guard extension
const recentPaths: string[] = [];       // ring buffer of paths the LLM has touched
const MAX_TRACKED = 20;

pi.on("tool_call", async (event, _ctx) => {
  const path = extractPathFromToolCall(event);
  if (path) {
    recentPaths.push(path);
    if (recentPaths.length > MAX_TRACKED) recentPaths.shift();
  }
});

function extractPathFromToolCall(event: ToolCallEvent): string | null {
  if (isReadToolCall(event) || isEditToolCall(event) || isWriteToolCall(event)) {
    return event.input.path;
  }
  if (isBashToolCall(event)) {
    const match = event.input.command.match(/(?:^|\s)(src|design|assets|tests|prototypes)\/[\w\-./]+/);
    return match ? match[0] : null;
  }
  return null;
}
```

**System prompt injection (`before_agent_start`):**

```typescript
pi.on("before_agent_start", async (event, ctx) => {
  const matchedRules = matchRulesToContext(recentPaths, RULES);
  if (matchedRules.length === 0) return undefined;

  const augmentation = matchedRules
    .map(r => `<ocgs-rule name="${r.name}" source="${r.source}">\n${r.body}\n</ocgs-rule>`)
    .join("\n\n");

  if (ctx.hasUI) {
    ctx.ui.setStatus("ocgs-rules", `rules: ${matchedRules.map(r => r.name).join(", ")}`);
  }

  return {
    systemPrompt: event.systemPrompt + "\n\n## Active OCGS Path-Scoped Rules\n\n" + augmentation,
  };
});

function matchRulesToContext(paths: string[], rules: Rule[]): Rule[] {
  const matched = new Map<string, Rule>();
  for (const path of paths) {
    for (const rule of rules) {
      if (rule.paths.some(glob => minimatch(path, glob))) {
        matched.set(rule.name, rule);
      }
    }
  }
  return Array.from(matched.values());
}
```

### 7.4 Token budget enforcement

11 rules × ~50 lines each × ~10 tokens/line = ~5500 tokens worst case. If multiple rules match (e.g., the LLM is working on an AI behavior that has tests), the augmentation can grow. We need a budget:

```typescript
const MAX_RULE_TOKENS = 4000;        // ~25% of a typical 16K context window

function buildAugmentation(matched: Rule[]): string {
  let totalTokens = 0;
  const included: Rule[] = [];

  matched.sort((a, b) => b.lastMatched - a.lastMatched);

  for (const rule of matched) {
    const ruleTokens = estimateTokens(rule.body);
    if (totalTokens + ruleTokens > MAX_RULE_TOKENS) {
      const remainingBudget = MAX_RULE_TOKENS - totalTokens;
      if (remainingBudget > 200) {
        rule.body = truncateToTokens(rule.body, remainingBudget);
        included.push(rule);
      }
      break;
    }
    included.push(rule);
    totalTokens += ruleTokens;
  }

  return included.map(r => ...).join("\n\n");
}
```

When truncation happens, the extension shows a status indicator: `rules: engine-code (truncated), ai-code` — gives the user transparency.

### 7.5 Cross-references in rules

OCGS rules reference each other and external docs (e.g., `design-docs.md` says "Every design document MUST contain these 8 sections"). The translated rule bodies preserve these references verbatim — they're already plain markdown. The LLM understands them. No special handling needed.

### 7.6 What about OpenCode-side parity?

OpenCode's rule mechanism is **also** implicit (rules are loaded into context for the relevant path glob). OCGS's existing `validate.mjs` checks the rules files for structure but doesn't enforce the rules. So:

- **OpenCode users keep getting the same behavior** — rules in `.opencode/rules/*.md` are picked up by OpenCode's mechanism.
- **Pi users get the `ocgs-path-guard` extension** — same effective behavior, different mechanism.
- **No changes to the rule files** — they're the canonical source for both harnesses.
- **The `validate.mjs` suite gets one new test**: assert that every rule's `paths:` globs match at least one file in `src/` (catches stale rules).

### 7.7 Tests for `ocgs-path-guard`

**Unit tests (`tests/codegen/test-path-guard.test.mjs`):**
- `matchRulesToContext(["src/ai/patrol.gd"], RULES)` returns `[ai-code]`
- `matchRulesToContext(["src/ai/patrol.gd", "tests/test_patrol.gd"], RULES)` returns `[ai-code, test-standards]`
- `matchRulesToContext(["prototypes/foo.gd"], RULES)` returns `[prototype-code]`
- `matchRulesToContext(["README.md"], RULES)` returns `[]`

**Integration tests (`tests/e2e/test-path-guard.test.ts`):**
- Run a Pi session via RPC, simulate a `read` tool call on `src/ai/patrol.gd`
- Inspect the next `before_agent_start` event's `event.systemPrompt`
- Assert it contains the AI Code Rules
- Assert the status bar shows `rules: ai-code`

**Behavior-parity tests (`tests/e2e/test-parity.test.ts`):**
- Run an OCGS scenario in OpenCode, capture the effective system prompt at multiple points
- Run the same scenario in Pi via RPC, capture the system prompt at the same points
- Assert the rules content is present in both

### 7.8 What the rule files look like after codegen

`.opencode/rules/ai-code.md` (canonical, unchanged):

```markdown
---
paths:
  - "src/ai/**"
---

# AI Code Rules

- AI update budget: 2ms per frame maximum — profile to verify
- All AI parameters must be tunable from data files...
```

`.pi/extensions/ocgs-path-guard/rules.ts` (generated):

```typescript
{
  name: "ai-code",
  paths: ["src/ai/**"],
  body: "# AI Code Rules\n\n- AI update budget: 2ms per frame maximum — profile to verify\n- All AI parameters must be tunable from data files...",
  source: ".opencode/rules/ai-code.md",
}
```

**Same source content. Different consumption mechanism.**

### 7.9 Open question: should we generate `AGENTS.md` files too?

Some users might want both: `ocgs-path-guard` for dynamic detection (works when cwd is project root), AND `AGENTS.md` files in scoped paths (works when user cd's into a subdirectory). The cost is small (the codegen just emits one more file per rule), the value is "Pi behavior matches OpenCode behavior in all cwd configurations."

**Recommendation: yes, generate both.** Each rule becomes:
1. An entry in `ocgs-path-guard/rules.ts` (for dynamic detection)
2. An `AGENTS.md` file at the rule's first matching path (for cwd-walking)

The AGENTS.md is shorter (just the body, no frontmatter) and gets a header comment: `<!-- Generated from .opencode/rules/ai-code.md by OCGS codegen. Do not edit. -->`.

---

## 8. Plugin/Extension Port

The three OpenCode plugins (`ccgs-hooks.ts`, `drift-detector.ts`, `changelog-generator.ts`) are hand-rewritten as Pi extensions. Each has a semantic-parity test suite that asserts identical behavior in both harnesses. Pi extensions add targeted enhancements where Pi's richer event model allows.

### 8.1 Port strategy: hand-rewrite, not auto-translate

We considered three approaches in Section 3.5:
- ❌ Auto codegen (TS-to-TS): OpenCode and Pi event shapes are too different
- ❌ Adapter layer: leaks OpenCode semantics, prevents Pi enhancements
- ✅ **Hand-rewrite with semantic-parity tests**

**The process for each plugin:**
1. **Catalog** the OpenCode plugin's behaviors (every event handler, every side effect).
2. **Map** each behavior to the equivalent Pi event(s).
3. **Rewrite** in Pi idioms, using Pi's full feature set.
4. **Write parity tests** that run an OCGS scenario in both harnesses and assert identical observable behavior (audit log content, audit log structure, error messages).
5. **Identify Pi-only enhancements** (e.g., `tool_result` mutation, custom TUI) and add them as opt-in.

### 8.2 Plugin #1: `ccgs-hooks.ts` → `ocgs-runtime` extension

**Source**: `.opencode/plugins/ccgs-hooks.ts` (679 lines, the most complex plugin — ports 12 CCGS bash hooks).

**Catalog of OpenCode behaviors**:

| # | OpenCode handler | Behavior |
|---|---|---|
| 1 | `session.created` | Log session start, run framework version check, surface session banner |
| 2 | `session.idle` | Commit validation (warn if working tree is dirty + on protected branch) |
| 3 | `tool.execute.before` on `write`/`edit` | Path protection (block writes to `.env`, `node_modules`, `production/`) |
| 4 | `tool.execute.before` on `bash` | Branch protection (block `git push` to `main`/`master`/`develop`) |
| 5 | `tool.execute.before` on `bash` | Agent audit log (record every bash call) |
| 6 | `tool.execute.after` on `write`/`edit` | Asset validation (run GDD/manifest checks on design/ files) |
| 7 | `tool.execute.after` on `write`/`edit` | Skill drift detection (warn if a skill file was modified) |
| 8 | `tool.execute.after` | Agent completion audit (log who finished what) |
| 9 | `experimental.session.compacting` | Recovery context injection (current task, key decisions) |
| 10 | `experimental.compaction.autocontinue` | Post-compaction guidance ("resume from production/session-state/active.md") |
| 11 | (cross-cutting) | Custom `ask_user_question` tool registration (the `question` tool) |
| 12 | (cross-cutting) | `AGENT_LOG_PATH` env var support for testing |

**Pi implementation map:**

| # | Pi event | Notes |
|---|---|---|
| 1 | `session_start` | Direct map. Run version check, surface banner via `ctx.ui.notify` |
| 2 | `agent_end` | Different shape — OpenCode `session.idle` is "session about to go idle"; Pi `agent_end` is "agent finished a turn". For commit validation, hook into `tool_call` on `bash` (check for `git commit`) instead. |
| 3 | `tool_call` on `write`/`edit` | Direct map. Return `{ block: true, reason: "..." }` |
| 4 | `tool_call` on `bash` | Direct map. Inspect `event.input.command` for `git push` patterns |
| 5 | `tool_call` on `bash` | Direct map. Write to audit log |
| 6 | `tool_result` on `write`/`edit` | **Pi enhancement**: can mutate result to add a warning if validation fails |
| 7 | `tool_result` on `write`/`edit` | **Pi enhancement**: can append drift warning to the result the LLM sees |
| 8 | `agent_end` | Direct map. Log who finished what |
| 9 | `session_before_compact` | **Pi enhancement**: can return a *custom* compaction summary (vs OpenCode's push-only) |
| 10 | `session_compact` | **Pi enhancement**: can `pi.sendUserMessage()` to inject post-compaction guidance |
| 11 | `pi.registerTool({ name: "question", ... })` | The `question` tool from Section 6.1 |
| 12 | n/a | Pi has its own way to pass env vars; mapped to settings.json |

**Audit log shape (port from OpenCode's `logAudit()` to Pi):**

```typescript
// In ocgs-audit extension
const AUDIT_LOG = path.join(process.cwd(), "production", "session-logs", "agent-audit.log");

pi.on("tool_call", async (event, _ctx) => {
  fs.appendFileSync(AUDIT_LOG, formatEntry({
    type: "tool_call",
    tool: event.toolName,
    args: summarizeArgs(event.input),
    ts: Date.now(),
  }));
});

// ... similar for tool_result, session_start, agent_end
```

The format is **byte-identical** to the OpenCode `logAudit()` output. Parity tests can diff the two log files directly.

### 8.3 Plugin #2: `drift-detector.ts` → `ocgs-drift-detector` extension

**Source**: `.opencode/plugins/drift-detector.ts`.

**OpenCode behavior:**
- On `session.created`: scan all `.opencode/agents/*.md`, `.opencode/skills/*/SKILL.md`, `.opencode/commands/*.md` for missing required sections
- On `tool.execute.after` on `write`/`edit`: check the specific file that was just written for drift

**Pi implementation:**

```typescript
// In ocgs-drift-detector extension
pi.on("resources_discover", async (event, _ctx) => {
  if (event.reason === "startup") {
    const drift = await scanAllAssets();
    if (drift.length > 0) {
      _ctx.ui.setStatus("ocgs-drift", `drift: ${drift.length} issues`);
    }
  }
});

pi.on("tool_result", async (event, _ctx) => {
  if (isEditToolResult(event) || isWriteToolResult(event)) {
    const path = event.input.path;
    const drift = await checkFileForDrift(path);
    if (drift.length > 0) {
      return {
        content: [
          ...event.content,
          { type: "text", text: `\n\n⚠️ OCGS drift detected in ${path}: ${drift.join("; ")}` },
        ],
        details: { ...event.details, drift },
      };
    }
  }
});
```

**The status bar indicator** (`ocgs-drift: 3 issues`) is a **Pi-only enhancement** — OpenCode users don't get persistent UI feedback about drift, they only see it in the audit log.

### 8.4 Plugin #3: `changelog-generator.ts` → `ocgs-changelog` extension

**Source**: `.opencode/plugins/changelog-generator.ts`.

**OpenCode behavior:**
- On `session.idle`: detect unreleased commits, generate a preview
- On `tool.execute.before` on `bash`: detect when the user is about to run a version-bump or release command, generate the changelog

**Pi implementation:**

```typescript
pi.on("agent_end", async (event, _ctx) => {
  const unreleased = await getUnreleasedCommits();
  if (unreleased.length > 0 && !existsToday("CHANGELOG.md")) {
    const preview = generateChangelogPreview(unreleased);
    if (_ctx.hasUI) {
      _ctx.ui.setWidget("ocgs-changelog", [
        "## Unreleased Changes Detected",
        "",
        preview.slice(0, 500) + (preview.length > 500 ? "..." : ""),
        "",
        "Run /changelog to generate the full entry.",
      ]);
    }
  }
});

pi.registerCommand("changelog", {
  description: "Generate CHANGELOG.md from conventional commits",
  handler: async (args, ctx) => {
    // ... generate, preview in TUI modal, accept/edit/cancel
  },
});
```

**Pi-only enhancements:**
- The `/changelog` slash command with full TUI modal (preview + accept/edit/cancel) — **richer than OpenCode's text-only output**.
- The `setWidget` integration shows unreleased changes persistently above the editor.

### 8.5 Cross-plugin concerns

Three shared subsystems emerge:

1. **Audit log writer** (used by all three) — extracted to `ocgs-audit` extension. The format is byte-identical to OpenCode.
2. **Status bar integration** (used by all three) — `ctx.ui.setStatus("ocgs-runtime", "...")` shows framework state. OpenCode has no equivalent; parity is "audit log only" for OpenCode users.
3. **TUI modal helpers** (used by changelog + question + consult) — extracted to a shared `ocgs-ui` module. Pi-only enhancement; OpenCode users get text-only.

### 8.6 Parity test strategy

The most important guarantee: **after running an OCGS scenario in both harnesses, the audit log content should be equivalent** (modulo event-name differences, which we normalize).

**Test 1: Audit log equivalence** — run an OCGS scenario in both harnesses, normalize event names, assert the same number of events, same tool calls, same prompts.

**Test 2: Drift detection equivalence** — create a malformed agent file, run drift detector in both harnesses, assert the same drift is detected.

**Test 3: Changelog generation equivalence** — create a series of conventional commits, run changelog generator in both harnesses, assert the same changelog content.

### 8.7 OpenCode-side parity maintenance

The three OpenCode plugins stay in the repo. They continue to work for OpenCode users. The Pi extensions don't replace them — they provide parallel implementations.

**Why not just delete the OpenCode plugins?** Because:
- Existing OpenCode users depend on them.
- The audit log format must stay byte-identical (parity tests assert this).
- Some users may switch from OpenCode to Pi and need the audit log to remain queryable.

**Long-term plan:** if Pi adoption justifies it, a "OpenCode-to-Pi migration" tool could convert old `agent-audit.log` files to Pi's session format. Out of scope for v1.

### 8.8 File layout after the port

```
.opencode/plugins/                          # OpenCode plugins (unchanged)
  ccgs-hooks.ts
  drift-detector.ts
  changelog-generator.ts
  tests/
    test-ccgs-hooks.mjs
    test-drift-detector.mjs
    test-changelog.mjs

.pi/extensions/                             # Pi extensions (generated + hand-written)
  ocgs-runtime/                             # the umbrella barrel
    index.ts
  ocgs-audit/                               # audit log writer (shared)
    index.ts
  ocgs-path-guard/                          # path-scoped rules (Section 7)
    index.ts
    rules.ts                                # generated rule catalog
  ocgs-delegation/                          # Task + consult (Section 5)
    index.ts
  ocgs-question/                            # question tool (Section 6.1)
    index.ts
  ocgs-drift-detector/                      # drift detection (Section 8.3)
    index.ts
  ocgs-changelog/                           # changelog (Section 8.4)
    index.ts
  ocgs-validate/                            # GDD/manifest validation (Section 8.2)
    index.ts
```

The OpenCode plugins and Pi extensions coexist. Same audit log, same behaviors (where possible), same observable semantics.

---

## 9. Phasing, Testing, and Open Questions

### 9.1 Phased release plan

We follow the "skill/agent adapter first" approach. Each phase lands a coherent user-visible capability, has its own success criteria, and doesn't break earlier phases.

#### Phase 1: Foundation (v0.8.0) — Skills + agents + codegen skeleton

**Goal:** Prove the source-of-truth/codegen pattern with the two largest, most stable content types.

**Scope:**
- ✅ `tools/generate-pi.mjs` (parse + translate + emit pipeline)
- ✅ Skill translator (mostly identity — they're already Agent Skills spec)
- ✅ Agent translator (frontmatter translation, `tools:` synthesis)
- ✅ `tools/generate-pi.mjs --check` runs in CI
- ✅ Snapshot tests for skill + agent translation
- ✅ `tools/install-pi.mjs list` and `add core` work end-to-end
- ✅ `pi.json` generated for the core module
- ❌ No commands, no plugins, no modules beyond `core`

**Success criteria:**
- A user can run `node tools/generate-pi.mjs` and get a valid `.pi/` tree.
- `pi --list-skills` shows all 77 OCGS skills.
- `pi --list-agents` shows all 51 OCGS agents.
- The agent catalog TypeBox `StringEnum` for `Task` is generated correctly.
- `tests/codegen/test-skill-translator.test.mjs` and `tests/codegen/test-agent-translator.test.mjs` pass.
- All 51 agents load in Pi without parse errors.

**Not in this phase:** commands, plugins, path-guard, audit log parity, modular install on Pi side beyond `core`.

**Estimate:** ~3-4 weeks of focused work.

#### Phase 2: Commands + Modules (v0.9.0) — Full content parity

**Goal:** All 54 commands and all 17 modules work in Pi.

**Scope:**
- ✅ Command translator (prompt vs extension split, `$ARGUMENTS` → `{{args}}`)
- ✅ Modulefile.yaml `harnesses:` block support
- ✅ `tools/install-pi.mjs add <module>` works for all 17 modules
- ✅ `tools/install-pi.mjs list/info` works
- ✅ `tools/package-pi.mjs` builds npm tarballs
- ✅ `.opencode/modules/install.mjs add <module> --with-pi` works
- ✅ `pi.json` includes all installed modules
- ✅ `.pi/installed.json` state file
- ✅ Migration command: `node .opencode/modules/install.mjs pi-migrate` for existing users

**Success criteria:**
- All 54 commands appear in Pi as either prompt templates or extension commands.
- All 17 modules install cleanly via both `install.mjs` and `install-pi.mjs`.
- `pi install npm:@ocgs/<module>` works for a published subset (at minimum: `core`, `engine-godot`).
- The `--check` mode in CI validates that all modules generate consistent Pi artifacts.

**Estimate:** ~4-6 weeks.

#### Phase 3: Plugins + Path-Guard (v0.10.0) — Full behavioral parity

**Goal:** All three OpenCode plugins ported to Pi with semantic parity. Path-scoped rules work in Pi.

**Scope:**
- ✅ `ocgs-audit` extension (audit log writer, byte-identical to OpenCode format)
- ✅ `ocgs-runtime` umbrella extension (sessions, version check)
- ✅ `ocgs-delegation` extension (`Task` tool + `consult` command)
- ✅ `ocgs-question` extension (`question` tool with TUI)
- ✅ `ocgs-path-guard` extension (rule injection)
- ✅ `ocgs-drift-detector` extension
- ✅ `ocgs-changelog` extension
- ✅ `ocgs-validate` extension (GDD/manifest validation)
- ✅ All parity tests passing (audit log, drift, changelog)

**Success criteria:**
- All OCGS agent prompts work verbatim in Pi (the `Task` and `question` references resolve).
- The audit log file produced by Pi is byte-equivalent to the one produced by OpenCode for the same scenario.
- Path-scoped rules are injected into the system prompt when the LLM works in matching paths.
- Drift detection works the same in both harnesses.
- Changelog generation produces the same output for the same commits.

**Estimate:** ~6-8 weeks. Most labor-intensive phase.

#### Phase 4: Pi-only enhancements (v0.11.0) — Polish and CI

**Goal:** Land the Pi-specific features that go beyond parity.

**Scope:**
- ✅ Custom TUI for `/start`, `/setup-engine`, `/help` (multi-step wizards with progress)
- ✅ `tool_result` mutation for richer audit + drift feedback to the LLM
- ✅ Hot-reload workflow: `ctx.reload()` integration in `ocgs-runtime`
- ✅ RPC mode for headless OCGS: `pi --mode rpc` integration
- ✅ CI integration: a `ci-ocgs` script that runs an OCGS scenario via RPC for regression testing
- ✅ `pi install` discoverability: OCGS modules registered in the Pi package gallery
- ✅ Module-scoped model preferences (the `scopedModels:` field in modulefile.yaml)
- ✅ Documentation: `docs/pi-compatibility.md`, updated `AGENTS.md`, new authoring guides

**Success criteria:**
- A user can run a full OCGS scenario (`/start`, `/brainstorm`, `/dev-story`, `/code-review`, `/story-done`) in Pi with no degraded experience compared to OpenCode.
- Pi users get richer TUI feedback (custom modals, progress indicators) for the major workflows.
- The framework is discoverable via `pi search` (or whatever Pi's package discovery is).
- A sample game project demonstrates dual-harness use.

**Estimate:** ~4-6 weeks.

### 9.2 Testing strategy

#### 9.2.1 Test layers

| Layer | Tooling | What it tests | When it runs |
|---|---|---|---|
| **Static** | `validate.mjs` (extended) | All files have valid frontmatter, required sections, valid cross-references | Every PR, locally |
| **Codegen unit** | `tests/codegen/test-*.mjs` | Each translator produces correct output for known inputs | Every PR, locally |
| **Codegen snapshot** | `tests/codegen/__snapshots__/*.snap` | Codegen output is byte-stable | Every PR, locally |
| **Plugin unit** | Existing `tests/plugins/test-*.mjs` | Each OCGS plugin's helper functions | Every PR, locally |
| **Extension unit** | `tests/extensions/test-*.mjs` | Each Pi extension's pure functions (rule matching, audit formatting) | Every PR, locally |
| **E2E (OpenCode)** | Spawn `opencode` CLI, scripted scenario | Full OpenCode workflow | Nightly + pre-release |
| **E2E (Pi RPC)** | `pi --mode rpc`, JSON protocol | Full Pi workflow | Nightly + pre-release |
| **Parity** | Diff OpenCode + Pi outputs | Audit logs, drift reports, changelogs are equivalent | Pre-release |
| **Live game** | Sample game project | Both harnesses can complete `/start` → `/story-done` | Pre-release |

#### 9.2.2 The most important test: parity

The `tests/e2e/test-parity.test.ts` suite is the linchpin. It runs an identical OCGS scenario in both harnesses and asserts:

- **Same audit log entries** (modulo event-name normalization).
- **Same drift detections** (drift report files match).
- **Same changelog entries** (CHANGELOG.md diff is empty).
- **Same tool calls** (counted by tool name).
- **Same delegations** (Task tool calls resolve to the right agent names).

The parity test is **slow** (spawns two harnesses, runs full scenarios) and **expensive** (uses real LLM API). It runs:
- Pre-release (mandatory)
- Nightly in CI (best-effort, may be skipped if API budget is tight)
- On-demand via `npm run test:parity`

#### 9.2.3 CI workflow

```yaml
# .github/workflows/pi-compat-ci.yml
name: Pi Compatibility CI

on: [push, pull_request]

jobs:
  static:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node tests/agents/validate.mjs
      - run: node tools/generate-pi.mjs --check
      - run: node tools/install-pi.mjs list

  codegen:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install
      - run: node --test tests/codegen/

  extensions:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install
      - run: node --test tests/extensions/

  e2e-opencode:
    runs-on: ubuntu-latest
    needs: [static, codegen, extensions]
    # runs nightly, not on every PR (slower)

  e2e-pi-rpc:
    runs-on: ubuntu-latest
    needs: [static, codegen, extensions]

  parity:
    runs-on: ubuntu-latest
    needs: [e2e-opencode, e2e-pi-rpc]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
```

#### 9.2.4 What "done" looks like for v1.0 (post-Phase 4)

A user with no prior OCGS experience can:
1. `git clone` the OCGS repo.
2. `npm install` (installs codegen + installer deps).
3. `node .opencode/modules/install.mjs add godot --with-pi` (installs the Godot module for both harnesses).
4. `opencode` (uses OpenCode; works exactly as today).
5. `pi` (uses Pi; gets the same agent prompts, same skills, same commands, with Pi-specific TUI enhancements).
6. The same `/start`, `/brainstorm`, `/dev-story` flow works in both harnesses.
7. The audit log file is byte-identical for the same scenario run in both harnesses.
8. Documentation at `docs/pi-compatibility.md` walks a new user through both flows.

### 9.3 Open questions (resolved during brainstorming)

1. **Q1: Repo location.** Same repo (vs fork or split). **Resolution: same repo.** The dual-harness nature is the whole point; splitting feels wrong.
2. **Q2: NPM package name scope.** `@ocgs/...` (vs `@opencode-game-studios/...`, `@opengamestudios/...`, or no scope). **Resolution: `@ocgs/...`** — short, brand-aligned, scoped to avoid collisions.
3. **Q3: Minimum Pi version to support.** Pi 1.0+ (vs 0.9+ or latest-only). **Resolution: Pi 1.0+** — target the stable release line. If a user is on Pi 0.x, they can pin an older OCGS version.
4. **Q4: `Task` tool subagent isolation.** In-memory by default with opt-in forked (vs always in-memory or always forked). **Resolution: in-memory by default, with an opt-in `isolation: "forked"` parameter for debugging.**

---

## 10. Glossary

| Term | Definition |
|---|---|
| **Harness** | The runtime that drives the LLM, registers tools/commands/agents, and manages sessions. OpenCode and Pi are two different harnesses. |
| **Module** | A self-contained bundle of agents, skills, commands, rules, plugins that a user installs. Examples: `core`, `engine-godot`, `art`, `design`. |
| **Agent** | A named persona with its own system prompt and tool set. OCGS has 3 tiers: Directors (Tier 1), Department Leads (Tier 2), Specialists (Tier 3). |
| **Skill** | A reusable workflow packaged as a `SKILL.md` file. The Agent Skills spec defines the format. OCGS has 77 skills. |
| **Command** | A user-invokable shortcut (slash command in OpenCode, prompt template or extension command in Pi). OCGS has 54 commands. |
| **Rule** | A path-scoped style guide that influences LLM behavior when working in matching paths. OCGS has 11 rules. |
| **Plugin** (OpenCode) | A TypeScript module that registers lifecycle hooks with the OpenCode runtime. OCGS has 3 plugins. |
| **Extension** (Pi) | A TypeScript module that registers tools, commands, and event handlers with the Pi runtime. Pi's equivalent of plugins. |
| **OCGS** | OpenCode Game Studios. The framework being ported to Pi. |
| **CCGS** | Claude Code Game Studios. The original framework OCGS was ported from. |
| **Codegen** | The deterministic process of deriving `.pi/` from `.opencode/`. |
| **IR** (Intermediate Representation) | The normalized JSON form of `.opencode/` produced by the parse stage of codegen. |
| **Parity** | The property that an OCGS scenario produces the same observable behavior (audit log, drift reports, changelogs) in both OpenCode and Pi. |
| **In-memory subagent** | A subagent whose `SessionManager` is `SessionManager.inMemory()` — its conversation is ephemeral and doesn't appear in the session tree. |
| **Forked subagent** | A subagent that runs in a separate session file, inspectable later via `pi --tree`. |

---

## 11. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Pi API breaking changes** — Pi is pre-1.0 (or recently 1.0); the extension API may shift. | High (early versions) | High (rewrites needed) | Pin a minimum Pi version; use `peerDependencies`; subscribe to Pi changelog; design codegen to absorb frontmatter changes. |
| **OpenCode plugin deprecation** — OpenCode may add or remove hooks, breaking `ccgs-hooks.ts`. | Medium | Medium | Maintain OpenCode plugin in repo; run parity tests; design OCGS plugins to use only the most stable hooks. |
| **NPM namespace conflicts** — `@ocgs/...` may collide with another organization. | Low | High | Check npm for collisions before publishing; have a fallback scope. |
| **LLM API budget for parity tests** — Running parity tests uses real API calls; nightly CI may exceed budget. | High | Medium | Make parity tests opt-in; use cheaper models for smoke tests; cache responses. |
| **Agent catalog drift** — Adding/removing/renaming agents without updating the `Task` tool's `StringEnum` causes broken delegation. | Medium | High | Codegen regenerates the `StringEnum` from the agent catalog; CI fails if it's stale. |
| **Path-scope rule false positives** — Injecting rules for paths the LLM isn't actually working in wastes context window. | Medium | Low | The `ocgs-path-guard` extension uses a ring buffer of recent paths; rules only inject for recently-touched paths. |
| **MCP server compatibility** — OCGS uses MCP servers (aseprite, godot, unity). Pi's MCP support may differ. | Medium | Medium | Test MCP servers in Pi early; document any that don't work. |
| **Long-term OpenCode abandonment** — If OpenCode loses momentum, we maintain two harnesses with one being a ghost. | Low (current) | High (long-term) | Track adoption metrics; if OpenCode share drops below 10%, deprecate OpenCode side. |
| **Pi-only feature bloat** — Pi-specific features creep into the OCGS core, alienating OpenCode users. | Medium | Medium | Strict separation: Pi-only features live in opt-in extensions (`harnesses.pi:` block); core stays harness-neutral. |
| **Documentation fragmentation** — Pi-specific docs vs OpenCode-specific docs vs shared docs get out of sync. | High | Medium | One `docs/pi-compatibility.md` as the single source; cross-link from other docs. |

---

## 12. Out of Scope

The following are explicitly **not** part of this design. They may be revisited in future designs.

1. **OCGS-to-Pi session migration tool** — convert old OpenCode session files to Pi's session format. Defer until Pi adoption is significant.
2. **Multi-select `question` tool** — when a use case emerges.
3. **Image attachment in `question` tool** — ditto.
4. **Path-guard rule enforcement** (blocking edits that violate rules) — high-friction, defer.
5. **OCGS module marketplace** (third-party modules) — defer until core is stable.
6. **Pi-native project templates** (vs OpenCode's `init-template`) — a new `pi init` flow.
7. **New agents, skills, or commands specific to Pi** — for now, Pi users get the same content as OpenCode users. Pi-specific content is a future design.
8. **Migration of existing CCGS projects directly to Pi** — they go through OCGS first.
9. **Performance optimization** — initial implementation prioritizes correctness; perf tuning comes after the framework is stable.
10. **Localization of OCGS content** — all content is English-only. (OCGS docs mention a `localization` module but it's not implemented.)

---

## 13. Acceptance Criteria

### Phase 1 (v0.8.0) — Foundation

- [ ] `tools/generate-pi.mjs` produces a valid `.pi/` tree for the entire `.opencode/` directory.
- [ ] `tools/generate-pi.mjs --check` exits 0 when `.pi/` is in sync with `.opencode/`, exits 1 otherwise.
- [ ] `pi --list-skills` (or equivalent) shows all 77 OCGS skills.
- [ ] `pi --list-agents` shows all 51 OCGS agents.
- [ ] The generated `Task` tool schema includes a TypeBox `StringEnum` of all 51 agent names.
- [ ] `tests/codegen/test-skill-translator.test.mjs` passes (snapshot tests).
- [ ] `tests/codegen/test-agent-translator.test.mjs` passes (snapshot tests).
- [ ] All 51 agents load in Pi without parse errors.
- [ ] `tools/install-pi.mjs list` shows the `core` module.
- [ ] `tools/install-pi.mjs add core` works end-to-end.
- [ ] CI runs the static + codegen + extension tests on every PR.

### Phase 2 (v0.9.0) — Commands + Modules

- [ ] All 54 OCGS commands appear in Pi (as prompt templates or extension commands).
- [ ] All 17 OCGS modules can be installed via `tools/install-pi.mjs add <module>`.
- [ ] `tools/package-pi.mjs` produces a valid npm tarball for at least `ocgs-core` and `ocgs-godot`.
- [ ] `pi install npm:@ocgs/core` works on a clean checkout.
- [ ] `node .opencode/modules/install.mjs add <module> --with-pi` updates both `.opencode/modules/installed.json` and `.pi/installed.json`.
- [ ] The `pi-migrate` command works for existing OCGS users.
- [ ] All modulefile.yaml files have valid `harnesses:` syntax.

### Phase 3 (v0.10.0) — Plugins + Path-Guard

- [ ] `ocgs-audit` extension produces a byte-identical audit log to the OpenCode `ccgs-hooks.ts` for the same scenario.
- [ ] `ocgs-runtime` extension handles session lifecycle events.
- [ ] `ocgs-delegation` extension registers `Task` tool and `consult` command.
- [ ] `ocgs-question` extension registers the `question` tool with TUI.
- [ ] `ocgs-path-guard` extension injects rules into the system prompt based on LLM's working context.
- [ ] `ocgs-drift-detector` extension produces the same drift report as the OpenCode `drift-detector.ts`.
- [ ] `ocgs-changelog` extension produces the same `CHANGELOG.md` as the OpenCode `changelog-generator.ts`.
- [ ] `ocgs-validate` extension runs GDD/manifest validation.
- [ ] Parity tests (`tests/e2e/test-parity.test.ts`) pass.
- [ ] All 51 OCGS agent prompts work verbatim in Pi (Task, question, and other tool references resolve).

### Phase 4 (v0.11.0) — Pi-only enhancements

- [ ] Custom TUI for `/start`, `/setup-engine`, `/help` works in Pi.
- [ ] `tool_result` mutation delivers richer audit + drift feedback to the LLM in Pi.
- [ ] Hot-reload via `/reload` works in Pi without losing extension state.
- [ ] `pi --mode rpc` integration allows headless OCGS scenario execution.
- [ ] A `ci-ocgs` script runs an OCGS scenario via RPC for regression testing.
- [ ] OCGS modules appear in the Pi package gallery.
- [ ] Module-scoped model preferences (`scopedModels:` in modulefile.yaml) work in Pi.
- [ ] `docs/pi-compatibility.md` is published and walks a new user through both flows.
- [ ] A sample game project demonstrates dual-harness use.

### Final v1.0 acceptance (post-Phase 4)

- [ ] All Phase 1-4 acceptance criteria are met.
- [ ] A new user can complete the `/start` → `/brainstorm` → `/dev-story` → `/code-review` → `/story-done` flow in both OpenCode and Pi with no degraded experience.
- [ ] The audit log file is byte-identical for the same scenario run in both harnesses.
- [ ] Documentation covers both flows and is navigable.
- [ ] All parity tests pass on a sample game project.

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
- `UPGRADING.md` — Prior upgrade patterns (v0.3.0 Godot MCP, v0.4.0 Unity MCP)
- `docs/superpowers/specs/2026-05-09-modular-framework-design.md` — Prior modular framework design

### Pi documentation
- Pi main documentation: `@earendil-works/pi-coding-agent/docs/`
- Pi extensions: `docs/extensions.md` — full extension API
- Pi skills: `docs/skills.md` — Agent Skills spec
- Pi SDK: `docs/sdk.md` — programmatic embedding
- Pi packages: `docs/packages.md` — npm/git distribution
- Pi RPC: `docs/rpc.md` — JSON protocol for headless use
- Pi settings: `docs/settings.md`
- Pi keybindings: `docs/keybindings.md`
- Pi TUI: `docs/tui.md` — custom UI components
- Pi examples: `examples/extensions/` — 80+ working examples
- Pi examples: `examples/sdk/` — SDK usage examples

### External references
- [Agent Skills specification](https://agentskills.io/specification) — cross-harness skill format
- [OpenCode documentation](https://opencode.ai/docs) — current OpenCode harness
- [Claude Code Game Studios (CCGS)](https://github.com/Donchitos/Claude-Code-Game-Studios) — the original framework
- [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) — for the aseprite/godot/unity integrations

### OCGS prior designs (for context)
- `docs/superpowers/specs/2026-05-09-modular-framework-design.md`
- `docs/superpowers/specs/2026-05-11-modular-framework-fixes-design.md`
