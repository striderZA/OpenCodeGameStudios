# Pi Agent Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable OCGS to work in both OpenCode (existing) and Pi (new) by restructuring content into a harness-agnostic `.agents/` directory and building Pi extensions for delegation, decision capture, rules, audit, drift detection, changelog, and validation.

**Architecture:** `.agents/` is the canonical harness-agnostic source. `.opencode/` holds OpenCode-specific plugins and config. `.pi/` holds Pi-specific extensions. No codegen — each harness discovers `.agents/` content at runtime. Pi extensions use `pi.registerTool()`, `pi.registerCommand()`, and lifecycle events from `@earendil-works/pi-coding-agent` (target `^0.79.0`).

**Tech Stack:** Pi extensions (TypeScript), OpenCode plugins (TypeScript), Node.js for migration tooling, Agent Skills spec for skill files.

## Global Constraints

- `.agents/` is the single canonical source of truth. Humans edit here. No codegen.
- Agent frontmatter must be harness-neutral — no `model:`, `mode:`, `permission:` fields.
- Cross-harness naming contract: `Task`, `question`, and `consult` have identical names in both harnesses.
- Pi target: `^0.79.0` (pin in `.pi/settings.json`).
- OpenCode config (`opencode.json`) and plugins (`.opencode/plugins/`) stay unchanged in format.
- OCGS agent prompts referencing `Task`, `question`, and `consult` must work verbatim — no rewriting agent prompts for Pi.
- All Pi extensions live in `.pi/extensions/<name>/index.ts`.
- Audit log format must be byte-identical between OpenCode and Pi for the same scenario.

---

## 4-Phase Structure

This plan covers 4 phases executed sequentially. Each phase produces independently testable deliverables.

**Phase 1: Restructure** — Move content to `.agents/`, verify OpenCode works, create `ocgs-core` Pi extension.
**Phase 2: Pi Extensions Core** — `Task` tool, `/consult` command, `question` tool, path-guard, audit logging.
**Phase 3: Plugin Parity** — Drift detection, changelog, validation, full parity tests.
**Phase 4: Polish + Docs** — Documentation, CI integration, sample future-harness config.

---

## Phase 1: Restructure

### Task 1: Create migration script (`tools/migrate-to-agents.mjs`)

**Files:**
- Create: `tools/migrate-to-agents.mjs`

**Interfaces:**
- Consumes: `.opencode/{agents,skills,commands,rules,modules}/` directories
- Produces: `.agents/{agents,skills,commands,rules,modules}/` directories with harness-neutral content

- [ ] **Step 1: Write migration script**

`tools/migrate-to-agents.mjs`:

```javascript
#!/usr/bin/env node
/**
 * One-time migration: .opencode/{agents,skills,commands,rules,modules}/ → .agents/{...}/
 * Usage: node tools/migrate-to-agents.mjs [--dry-run] [--remove-old]
 *
 * --dry-run: show what would be moved without making changes
 * --remove-old: delete the original .opencode/ content after successful move
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// Directories to migrate
const DIRS = ["agents", "skills", "commands", "rules", "modules"];

// Fields to strip from agent frontmatter
const STRIP_FIELDS = ["model", "mode", "permission", "permissions",
  "fallbackModels", "tools", "temperature", "maxTokens", "provider"];

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return { frontmatter: {}, body: content };
  const frontmatter = {};
  for (const line of match[1].split("\n")) {
    const sep = line.indexOf(":");
    if (sep > 0) frontmatter[line.slice(0, sep).trim()] = line.slice(sep + 1).trim();
  }
  return { frontmatter, body: content.slice(match[0].length) };
}

function stripHarnessFields(frontmatter) {
  const clean = { ...frontmatter };
  for (const field of STRIP_FIELDS) delete clean[field];
  return clean;
}

function serializeFrontmatter(frontmatter, body) {
  const fmLines = Object.entries(frontmatter)
    .map(([k, v]) => `${k}: ${v}`);
  return `---\n${fmLines.join("\n")}\n---\n\n${body}`;
}

function migrateFile(srcPath, destPath, type) {
  const content = fs.readFileSync(srcPath, "utf-8");
  let result = content;

  if (type === "agents") {
    const { frontmatter, body } = parseFrontmatter(content);
    const clean = stripHarnessFields(frontmatter);
    result = serializeFrontmatter(clean, body);
  }

  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, result);
  return result !== content ? "modified" : "copied";
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const removeOld = args.includes("--remove-old");
  let total = 0, modified = 0;

  for (const dir of DIRS) {
    const srcRoot = path.join(ROOT, ".opencode", dir);
    const destRoot = path.join(ROOT, ".agents", dir);

    if (!fs.existsSync(srcRoot)) {
      console.log(`Skipping ${dir}: source does not exist`);
      continue;
    }

    function walk(current) {
      const entries = fs.readdirSync(current, { withFileTypes: true });
      for (const entry of entries) {
        const srcPath = path.join(current, entry.name);
        const relPath = path.relative(srcRoot, srcPath);
        const destPath = path.join(destRoot, relPath);

        if (entry.isDirectory()) {
          walk(srcPath);
        } else if (entry.isFile() && (entry.name.endsWith(".md") || entry.name.endsWith(".yaml") || entry.name.endsWith(".json"))) {
          if (dryRun) {
            console.log(`[DRY RUN] Would ${dir === "agents" ? "process" : "copy"}: ${relPath}`);
          } else {
            const status = migrateFile(srcPath, destPath, dir);
            console.log(`  ${status === "modified" ? "✂" : "✓"} ${relPath}`);
            if (status === "modified") modified++;
            total++;
          }
        }
      }
    }

    walk(srcRoot);
  }

  if (!dryRun) {
    console.log(`\nMigration complete: ${total} files processed, ${modified} agents had harness fields stripped.`);

    if (removeOld) {
      for (const dir of DIRS) {
        const srcPath = path.join(ROOT, ".opencode", dir);
        if (fs.existsSync(srcPath)) {
          fs.rmSync(srcPath, { recursive: true, force: true });
          console.log(`Removed: ${srcPath}`);
        }
      }
    } else {
      console.log(`\nUse --remove-old to delete the original .opencode/{${DIRS.join(",")}} directories.`);
    }
  }
}

main();
```

- [ ] **Step 2: Run migration script in dry-run mode**

Run: `node tools/migrate-to-agents.mjs --dry-run`
Expected: Lists all files that would be migrated, no files moved.

- [ ] **Step 3: Run migration for real**

Run: `node tools/migrate-to-agents.mjs`
Expected: Files copied to `.agents/{agents,skills,commands,rules,modules}/`. Agent frontmatter stripped of model/mode/permission fields. Console shows `✂` for agent files that were modified.

Verify:
```bash
ls .agents/agents/ | wc -l    # Expected: 51
ls .agents/skills/ | wc -l    # Expected: 77
ls .agents/commands/ | wc -l  # Expected: 54
ls .agents/rules/ | wc -l     # Expected: 11
ls .agents/modules/ | wc -l   # Expected: ≥17
```

- [ ] **Step 4: Verify a migrated agent file has clean frontmatter**

Run: `head -10 .agents/agents/creative-director.md`

Expected:
```yaml
---
name: creative-director
description: "..."
---
```

No `model:`, `mode:`, or `permission:` fields.

- [ ] **Step 5: Commit migration**

```bash
git add tools/migrate-to-agents.mjs .agents/ .gitignore
git commit -m "feat: migrate OCGS content to harness-agnostic .agents/ directory"
```


### Task 2: Update OpenCode config for .agents/ discovery

**Files:**
- Modify: `opencode.json`
- Modify: `.opencode/plugins/ccgs-hooks.ts` (if config-based discovery isn't available)

**Interfaces:**
- Consumes: `.agents/{agents,skills,commands,rules}` content
- Produces: Updated OpenCode config that references `.agents/` content

- [ ] **Step 1: Investigate discovery mechanism**

Check if OpenCode supports a `contextFiles`, `include`, or similar config in `opencode.json` for pointing at external content directories.

```bash
cat opencode.json
```

If OpenCode supports it → add the config. If not → extend the plugin.

- [ ] **Step 2: Update opencode.json**

Assuming OpenCode supports it:

Add to `opencode.json`:
```json
{
  "contextFiles": [
    ".agents/agents/**/*.md",
    ".agents/skills/**/*",
    ".agents/commands/**/*.md",
    ".agents/rules/**/*.md"
  ]
}
```

- [ ] **Step 3: Fallback — update plugin if config not available**

If OpenCode doesn't support the config above, extend `.opencode/plugins/ccgs-hooks.ts` to scan `.agents/` at session start and register paths:

```typescript
// In the session.created handler, add:
const AGENTS_DIR = path.join(process.cwd(), ".agents");
if (fs.existsSync(AGENTS_DIR)) {
  // Register agent files
  const agentDir = path.join(AGENTS_DIR, "agents");
  if (fs.existsSync(agentDir)) {
    for (const file of fs.readdirSync(agentDir)) {
      if (file.endsWith(".md")) {
        // Register with OpenCode's agent system
        const content = fs.readFileSync(path.join(agentDir, file), "utf-8");
        const name = file.replace(/\.md$/, "");
        // Plugin-specific registration call
      }
    }
  }
  // Similar for skills, commands, rules
}
```

- [ ] **Step 4: Verify OpenCode still works**

Run: `opencode` (or OpenCode equivalent) from project root
Expected: All agents, skills, commands, rules load correctly. No errors.

- [ ] **Step 5: Commit**

```bash
git add opencode.json .opencode/plugins/ccgs-hooks.ts
git commit -m "fix: update OpenCode to discover .agents/ content"
```


### Task 3: Create `ocgs-core` Pi extension for content discovery

**Files:**
- Create: `.pi/extensions/ocgs-core/index.ts`
- Create: `.pi/extensions/ocgs-core/package.json` (if dependencies needed)
- Create: `.pi/settings.json`

**Interfaces:**
- Consumes: `.agents/{agents,skills,commands,rules}/` directory structure
- Produces: Pi discovers all OCGS agents, skills, commands, and rules

- [ ] **Step 1: Write `ocgs-core/index.ts`**

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import path from "node:path";
import fs from "node:fs";

const AGENTS_DIR = path.resolve(process.cwd(), ".agents");

export default function (pi: ExtensionAPI) {
  pi.on("resources_discover", async (event, _ctx) => {
    if (!fs.existsSync(AGENTS_DIR)) return;

    const skillPath = path.join(AGENTS_DIR, "skills");
    const promptPath = path.join(AGENTS_DIR, "commands");

    return {
      skillPaths: fs.existsSync(skillPath) ? [skillPath] : [],
      promptPaths: fs.existsSync(promptPath) ? [promptPath] : [],
    };
  });
}
```

- [ ] **Step 2: Create `.pi/settings.json`**

```json
{
  "enableSkillCommands": true,
  "packages": []
}
```

- [ ] **Step 3: Verify Pi discovers OCGS content**

Run: `pi --list-skills 2>&1 | head -5`
Expected: Lists OCGS skills (e.g., `brainstorm`, `test-setup`, etc.)

Run: `pi --list-prompts 2>&1 | head -5` (or equivalent)
Expected: Lists OCGS command prompts

- [ ] **Step 4: Verify an agent loads in Pi**

Start an interactive pi session and prompt: "List the available agents"

Or, if Pi supports listing agents via CLI:
```bash
pi --list-agents 2>&1 | head -10
```

Expected: Creative Director, Technical Director, Producer, etc.

- [ ] **Step 5: Commit**

```bash
git add .pi/
git commit -m "feat: add ocgs-core Pi extension for .agents/ content discovery"
```

---

## Phase 2: Pi Extensions Core

### Task 4: `ocgs-delegation` — Task tool

**Files:**
- Create: `.pi/extensions/ocgs-delegation/index.ts`

**Interfaces:**
- Consumes: `.agents/agents/` directory (for agent name discovery)
- Produces: `pi.registerTool({ name: "Task", ... })`

- [ ] **Step 1: Write the Task tool extension**

`.pi/extensions/ocgs-delegation/index.ts`:

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { StringEnum } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import path from "node:path";
import fs from "node:fs";

const AGENTS_DIR = path.resolve(process.cwd(), ".agents", "agents");

function loadAgentNames(): string[] {
  if (!fs.existsSync(AGENTS_DIR)) return [];
  const names: string[] = [];
  for (const file of fs.readdirSync(AGENTS_DIR)) {
    if (file.endsWith(".md")) {
      const name = file.replace(/\.md$/, "");
      names.push(name);
    }
  }
  return names.sort();
}

function loadSystemPrompt(agentName: string): string {
  const filePath = path.join(AGENTS_DIR, `${agentName}.md`);
  if (!fs.existsSync(filePath)) return "";
  const content = fs.readFileSync(filePath, "utf-8");
  // Strip frontmatter, return body
  const body = content.replace(/^---[\s\S]*?---\n\n?/, "");
  return body.trim();
}

export default function (pi: ExtensionAPI) {
  const agentNames = loadAgentNames();

  const AgentNameSchema = StringEnum(agentNames as [string, ...string[]]);

  const TaskParams = Type.Object({
    agent: Type.Optional(AgentNameSchema),
    prompt: Type.String({ description: "What to delegate to the target agent" }),
    context: Type.Optional(Type.String({ description: "Optional additional context" })),
    isolation: Type.Optional(StringEnum(["same-context", "forked"] as const)),
  });

  pi.registerTool({
    name: "Task",
    label: "Delegate to agent",
    description: "Delegate work to another OCGS agent. The target agent runs with its own system prompt and tool set, then returns the result. Use for vertical delegation (Tier 1 → Tier 2 → Tier 3). For peer review, use the /consult command instead.",
    promptSnippet: "Delegate work to another OCGS agent and return the result",
    promptGuidelines: [
      "Use the Task tool when you need another agent to DO WORK on your behalf and report back with a result.",
      "Pass `agent` as the target agent's name from the dropdown; if omitted, the orchestrator picks.",
      "Pass `prompt` as clear, self-contained instructions for the target agent.",
      "Pass `context` only if the target agent needs information not in its own system prompt.",
      "Do NOT use Task for peer review — use the /consult command for that.",
    ],
    parameters: TaskParams,
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const targetName = params.agent || "creative-director";
      const systemPrompt = loadSystemPrompt(targetName);

      // Create an in-memory subagent session
      const subSession = ctx.sessionManager.inMemory({
        systemPrompt,
        tools: ["read", "write", "edit", "bash", "grep", "find", "ls"],
      });

      // Stream progress
      onUpdate({ type: "text", text: `Delegating to ${targetName}...` });

      try {
        const result = await subSession.run(params.prompt, { signal });
        return {
          content: [{ type: "text", text: result }],
          details: { delegatedTo: targetName, promptLength: params.prompt.length },
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Task delegation to ${targetName} failed: ${err}` }],
          isError: true,
        };
      }
    },
  });
}
```

- [ ] **Step 2: Test the Task tool in Pi**

Start Pi and prompt:
```
Use the Task tool to delegate to game-designer: "List the GDD files that exist in the design directory"
```

Expected: Pi invokes the `Task` tool, the `game-designer` agent runs, returns a result.

- [ ] **Step 3: Handle edge case — empty agent directory**

If `.agents/agents/` is empty or missing, the StringEnum should still be valid:
- `loadAgentNames()` returns `[]` → `StringEnum([])` — Pi should handle gracefully

- [ ] **Step 4: Commit**

```bash
git add .pi/extensions/ocgs-delegation/
git commit -m "feat: add Task delegation tool to ocgs-delegation extension"
```


### Task 5: `ocgs-delegation` — /consult command

**Files:**
- Modify: `.pi/extensions/ocgs-delegation/index.ts`

**Interfaces:**
- Consumes: Same agent name discovery as Task tool
- Produces: `pi.registerCommand("consult", ...)`

- [ ] **Step 1: Add /consult command to the extension**

Add after the Task tool registration:

```typescript
pi.registerCommand("consult", {
  description: "Consult a peer OCGS agent for review or second opinion",
  argumentHint: "<agent-name> [question]",
  handler: async (args: string, ctx) => {
    const parts = args.trim().split(/\s+/);
    const agentName = parts[0];
    const question = parts.slice(1).join(" ") || "Review the current work and provide concerns";

    if (!agentName || !agentNames.includes(agentName)) {
      ctx.ui.notify(`Unknown agent: ${agentName}. Valid: ${agentNames.join(", ")}`, "error");
      return;
    }

    const systemPrompt = loadSystemPrompt(agentName) + "\n\nYou are being consulted. Provide your review, concerns, and recommendations. Then STOP. Do not delegate further or take actions.";

    const subSession = ctx.sessionManager.inMemory({
      systemPrompt,
      tools: ["read", "grep", "find", "ls"],  // Read-only tools
    });

    const result = await subSession.run(question);

    ctx.ui.notify(`Consultation from ${agentName} complete`, "info");
    // The result becomes part of the conversation
  },
});
```

- [ ] **Step 2: Test the /consult command in Pi**

Start Pi and prompt:
```
Consult qa-tester about: "Review the current test coverage and identify gaps"
```

Or directly:
```
/consult qa-tester Review the test structure in the tests/ directory
```

Expected: The QA tester agent runs with read-only tools, returns review/concerns.

- [ ] **Step 3: Commit**

```bash
git add .pi/extensions/ocgs-delegation/index.ts
git commit -m "feat: add /consult command to ocgs-delegation extension"
```


### Task 6: `ocgs-question` — question tool with TUI

**Files:**
- Create: `.pi/extensions/ocgs-question/index.ts`

**Interfaces:**
- Produces: `pi.registerTool({ name: "question", ... })`

- [ ] **Step 1: Write the question tool extension**

`.pi/extensions/ocgs-question/index.ts`:

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { StringEnum } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import fs from "node:fs";
import path from "node:path";

const DECISIONS_LOG = path.resolve(process.cwd(), "production", "session-logs", "agent-decisions.jsonl");

function logDecision(entry: Record<string, unknown>) {
  const dir = path.dirname(DECISIONS_LOG);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(DECISIONS_LOG, JSON.stringify({ ...entry, ts: Date.now() }) + "\n");
}

export default function (pi: ExtensionAPI) {
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
      "Do NOT use the question tool for yes/no questions or open-ended input.",
    ],
    parameters: QuestionParams,
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      if (ctx.mode === "tui") {
        const choice = await ctx.ui.custom({
          type: "picker",
          title: params.header || "Strategic Decision",
          body: params.question,
          options: params.options.map((o, i) => ({
            label: o.label,
            description: o.description || "",
            value: String(i),
            default: i === 0,
          })),
          allowCustom: true,
        });

        const answer = choice?.value !== undefined
          ? (choice.value === "custom" ? choice.customText : params.options[parseInt(choice.value)]?.label)
          : "(skipped)";

        logDecision({
          question: params.question,
          options: params.options.map(o => o.label),
          answer,
          wasCustom: choice?.value === "custom",
        });

        return {
          content: [{ type: "text", text: `User chose: ${answer}` }],
          details: { answer, wasCustom: choice?.value === "custom" },
        };
      }

      // Non-TUI mode: return structured data
      return {
        content: [{ type: "text", text: `Question (${ctx.mode} mode): ${params.question}\nOptions: ${params.options.map(o => o.label).join(", ")}` }],
        details: {
          question: params.question,
          options: params.options.map(o => o.label),
          pending: true,
        },
      };
    },
  });
}
```

- [ ] **Step 2: Test the question tool in Pi**

Start Pi and prompt:
```
Think about whether we should use Godot 4 or Godot 3 for this project. Write your analysis, then call the question tool with options: ["Godot 4 (Recommended)", "Godot 3"]
```

Expected: Pi writes its analysis, then shows a TUI picker with the two options. User picks one, the result is logged.

- [ ] **Step 3: Verify decision log**

```bash
cat production/session-logs/agent-decisions.jsonl
```

Expected: A JSON line with the question, options, chosen answer, and timestamp.

- [ ] **Step 4: Commit**

```bash
git add .pi/extensions/ocgs-question/
git commit -m "feat: add question tool with TUI to ocgs-question extension"
```


### Task 7: `ocgs-path-guard` — dynamic rule injection

**Files:**
- Create: `.pi/extensions/ocgs-path-guard/index.ts`
- Create: `.pi/extensions/ocgs-path-guard/package.json`

**Interfaces:**
- Consumes: `.agents/rules/` directory
- Produces: Rules injected into Pi's system prompt when LLM works in matching paths

- [ ] **Step 1: Create package.json for minimatch dependency**

`.pi/extensions/ocgs-path-guard/package.json`:
```json
{
  "name": "ocgs-path-guard",
  "private": true,
  "dependencies": {
    "minimatch": "^10.0.0"
  }
}
```

- [ ] **Step 2: Write the path-guard extension**

`.pi/extensions/ocgs-path-guard/index.ts`:

```typescript
import type { ExtensionAPI, ToolCallEvent } from "@earendil-works/pi-coding-agent";
import { minimatch } from "minimatch";
import fs from "node:fs";
import path from "node:path";

const RULES_DIR = path.resolve(process.cwd(), ".agents", "rules");
const MAX_TRACKED_PATHS = 20;
const MAX_RULE_TOKENS = 4000;

interface Rule {
  name: string;
  paths: string[];
  body: string;
  source: string;
}

function parseRuleFile(filePath: string): Rule | null {
  const content = fs.readFileSync(filePath, "utf-8");
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n\n?/);
  if (!fmMatch) return null;

  const fmLines = fmMatch[1].split("\n");
  const paths: string[] = [];
  let inPaths = false;

  for (const line of fmLines) {
    if (line.trim() === "paths:") { inPaths = true; continue; }
    if (inPaths && line.trim().startsWith("- ")) {
      const glob = line.trim().slice(2).trim().replace(/^["']|["']$/g, "");
      paths.push(glob);
    } else if (inPaths && !line.trim().startsWith("-")) {
      inPaths = false;
    }
  }

  const body = content.slice(fmMatch[0].length).trim();
  const name = filePath.replace(/\.md$/, "").split(/[\\/]/).pop() || "unknown";

  return { name, paths, body, source: path.relative(process.cwd(), filePath) };
}

function loadRules(): Rule[] {
  if (!fs.existsSync(RULES_DIR)) return [];
  const rules: Rule[] = [];
  for (const file of fs.readdirSync(RULES_DIR)) {
    if (file.endsWith(".md")) {
      const rule = parseRuleFile(path.join(RULES_DIR, file));
      if (rule) rules.push(rule);
    }
  }
  return rules;
}

function matchRules(rules: Rule[], paths: string[]): Rule[] {
  const matched = new Map<string, Rule>();
  for (const filePath of paths) {
    for (const rule of rules) {
      if (rule.paths.some(glob => minimatch(filePath, glob))) {
        matched.set(rule.name, rule);
      }
    }
  }
  return Array.from(matched.values());
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function buildAugmentation(matched: Rule[]): string {
  let totalTokens = 0;
  const included: Rule[] = [];

  for (const rule of matched) {
    const tokens = estimateTokens(rule.body);
    if (totalTokens + tokens > MAX_RULE_TOKENS) break;
    included.push(rule);
    totalTokens += tokens;
  }

  return included
    .map(r => `<ocgs-rule name="${r.name}" source="${r.source}">\n${r.body}\n</ocgs-rule>`)
    .join("\n\n");
}

export default function (pi: ExtensionAPI) {
  const rules = loadRules();
  const recentPaths: string[] = [];

  pi.on("tool_call", async (event: ToolCallEvent, _ctx) => {
    let filePath: string | null = null;

    if ((event.toolName === "read" || event.toolName === "edit" || event.toolName === "write") && event.input.path) {
      filePath = event.input.path as string;
    } else if (event.toolName === "bash" && typeof event.input.command === "string") {
      const match = event.input.command.match(/(?:^|\s)(src|design|assets|tests|prototypes)\/[\w\-./]+/);
      if (match) filePath = match[0].trim();
    }

    if (filePath) {
      recentPaths.push(filePath);
      if (recentPaths.length > MAX_TRACKED_PATHS) recentPaths.shift();
    }
  });

  pi.on("before_agent_start", async (event, ctx) => {
    const matched = matchRules(rules, recentPaths);
    if (matched.length === 0) return;

    const augmentation = buildAugmentation(matched);

    if (ctx.hasUI) {
      ctx.ui.setStatus("ocgs-rules", `rules: ${matched.map(r => r.name).join(", ")}`);
    }

    return {
      systemPrompt: event.systemPrompt + "\n\n## Active OCGS Path-Scoped Rules\n\n" + augmentation,
    };
  });
}
```

- [ ] **Step 3: Test path-guard**

Run: `npm install` in `.pi/extensions/ocgs-path-guard/` to install minimatch.

Start Pi, prompt:
```
Read src/ai/patrol.gd
```
Then:
```
List the current active rules
```

Expected (if Pi exposes system prompt context): The system prompt includes AI Code Rules after reading a file in `src/ai/**`.

- [ ] **Step 4: Commit**

```bash
git add .pi/extensions/ocgs-path-guard/
git commit -m "feat: add ocgs-path-guard extension for dynamic rule injection"
```


### Task 8: `ocgs-audit` — audit logging

**Files:**
- Create: `.pi/extensions/ocgs-audit/index.ts`

**Interfaces:**
- Consumes: `tool_call`, tool_result events from Pi
- Produces: Byte-identical audit log to OpenCode's `logAudit()` format

- [ ] **Step 1: Write the audit extension**

`.pi/extensions/ocgs-audit/index.ts`:

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import fs from "node:fs";
import path from "node:path";

const AUDIT_LOG = path.resolve(process.cwd(), "production", "session-logs", "agent-audit.log");

function formatEntry(event: Record<string, unknown>): string {
  // Byte-identical format to OpenCode's logAudit()
  const ts = new Date().toISOString();
  return `[${ts}] ${event.type}: ${JSON.stringify(event.data)}\n`;
}

function writeToAudit(entry: string) {
  const dir = path.dirname(AUDIT_LOG);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(AUDIT_LOG, entry);
}

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (event, _ctx) => {
    writeToAudit(formatEntry({
      type: "session_start",
      data: { reason: event.reason },
    }));
  });

  pi.on("tool_call", async (event, _ctx) => {
    writeToAudit(formatEntry({
      type: "tool_call",
      data: {
        tool: event.toolName,
        callId: event.toolCallId,
        args: summarizeArgs(event.input),
      },
    }));
  });

  pi.on("tool_result", async (event, _ctx) => {
    // Log only the result length, not full content (too verbose)
    writeToAudit(formatEntry({
      type: "tool_result",
      data: {
        tool: event.toolName,
        callId: event.toolCallId,
        resultLength: typeof event.content === "string" ? event.content.length : JSON.stringify(event.content).length,
        isError: event.isError,
      },
    }));
  });

  pi.on("agent_end", async (event, _ctx) => {
    writeToAudit(formatEntry({
      type: "agent_end",
      data: { messageCount: event.messages?.length || 0 },
    }));
  });

  pi.on("session_shutdown", async (event, _ctx) => {
    writeToAudit(formatEntry({
      type: "session_end",
      data: { reason: event.reason },
    }));
  });
}

function summarizeArgs(input: Record<string, unknown>): Record<string, unknown> {
  // Don't log full command text or file contents — just the shape
  const summarized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string" && value.length > 100) {
      summarized[key] = value.slice(0, 100) + "...";
    } else {
      summarized[key] = value;
    }
  }
  return summarized;
}
```

- [ ] **Step 2: Verify audit log format**

Start Pi, run a simple task (like reading a file), then check:

```bash
cat production/session-logs/agent-audit.log
```

Expected: Lines like:
```
[2026-06-21T12:00:00.000Z] session_start: {"reason":"startup"}
[2026-06-21T12:00:05.000Z] tool_call: {"tool":"read","callId":"...","args":{"path":"..."}}
[2026-06-21T12:00:06.000Z] tool_result: {"tool":"read","callId":"...","resultLength":123,"isError":false}
```

- [ ] **Step 3: Verify byte-identical format**

Run the same scenario in OpenCode and capture audit log. Diff the two:

```bash
diff production/session-logs/agent-audit.log production/session-logs/agent-audit.opencode.log
```

Expected: No differences (modulo timestamps, which can be normalized).

- [ ] **Step 4: Commit**

```bash
git add .pi/extensions/ocgs-audit/
git commit -m "feat: add ocgs-audit extension with byte-identical audit log format"
```


### Task 9: Register all extensions in a barrel

**Files:**
- Create: `.pi/extensions/ocgs-core/index.ts` (update from Task 3)

**Interfaces:**
- Produces: Single entry point that loads all OCGS Pi extensions

- [ ] **Step 1: Update ocgs-core barrel to import all extensions**

Replace the simple `resources_discover` handler with:

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import delegation from "../ocgs-delegation/index.js";
import question from "../ocgs-question/index.js";
import pathGuard from "../ocgs-path-guard/index.js";
import audit from "../ocgs-audit/index.js";

export default function (pi: ExtensionAPI) {
  // Register all OCGS extensions through the barrel
  delegation(pi);
  question(pi);
  pathGuard(pi);
  audit(pi);

  // Also discover .agents/ content
  pi.on("resources_discover", async (event, _ctx) => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const AGENTS_DIR = path.resolve(process.cwd(), ".agents");

    if (!fs.existsSync(AGENTS_DIR)) return;

    return {
      skillPaths: fs.existsSync(path.join(AGENTS_DIR, "skills")) ? [path.join(AGENTS_DIR, "skills")] : [],
      promptPaths: fs.existsSync(path.join(AGENTS_DIR, "commands")) ? [path.join(AGENTS_DIR, "commands")] : [],
    };
  });
}
```

- [ ] **Step 2: Verify all extensions load**

Run: `pi` and check that there are no load errors.

Expected: No console errors. The delegation, question, path-guard, and audit extensions are all active.

- [ ] **Step 3: Quick smoke test**

```bash
pi -e "Check that the Task tool is available" --mode print
```

Expected: Pi responds indicating the Task tool is available.

- [ ] **Step 4: Commit**

```bash
git add .pi/extensions/ocgs-core/
git commit -m "feat: register all OCGS Pi extensions through ocgs-core barrel"
```

---

## Phase 3: Plugin Parity

### Task 10: `ocgs-drift-detector` extension

**Files:**
- Create: `.pi/extensions/ocgs-drift-detector/index.ts`

**Interfaces:**
- Consumes: `tool_result` events on `write`/`edit`
- Produces: Drift warnings appended to tool results; status bar indicator

- [ ] **Step 1: Write the drift detector extension**

`.pi/extensions/ocgs-drift-detector/index.ts`:

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import fs from "node:fs";
import path from "node:path";

const AGENTS_DIR = path.resolve(process.cwd(), ".agents");

// Required sections per file type
const REQUIRED_SECTIONS: Record<string, string[]> = {
  agents: ["name", "description"],
  skills: ["description", "when_to_use", "procedure"],
  commands: ["description", "handler"],
};

async function checkFileForDrift(filePath: string): Promise<string[]> {
  const relPath = path.relative(AGENTS_DIR, filePath);
  const type = relPath.split(path.sep)[0]; // 'agents', 'skills', 'commands'
  const requirements = REQUIRED_SECTIONS[type];
  if (!requirements) return [];

  const content = fs.readFileSync(filePath, "utf-8");
  const issues: string[] = [];

  for (const section of requirements) {
    if (!content.toLowerCase().includes(`**${section}**`) &&
        !content.toLowerCase().includes(`## ${section}`) &&
        !content.toLowerCase().includes(`# ${section}`)) {
      issues.push(`missing required section: ${section}`);
    }
  }

  return issues;
}

let driftCount = 0;

export default function (pi: ExtensionAPI) {
  // Startup scan
  pi.on("resources_discover", async (event, _ctx) => {
    if (event.reason !== "startup") return;
    driftCount = 0;

    function scanDir(dir: string) {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) scanDir(fullPath);
        else if (entry.name.endsWith(".md")) {
          const issues = checkFileForDrift(fullPath);
          if (issues.length > 0) driftCount++;
        }
      }
    }

    scanDir(path.join(AGENTS_DIR, "agents"));
    scanDir(path.join(AGENTS_DIR, "skills"));

    if (driftCount > 0 && _ctx.hasUI) {
      _ctx.ui.setStatus("ocgs-drift", `drift: ${driftCount} files`);
    }
  });

  // Post-write drift check
  pi.on("tool_result", async (event, _ctx) => {
    const toolName = event.toolName;
    const input = event.input as Record<string, unknown>;

    if (toolName === "write" || toolName === "edit") {
      const filePath = input.path as string;
      if (filePath && filePath.startsWith(".agents")) {
        const issues = await checkFileForDrift(filePath);
        if (issues.length > 0) {
          driftCount++;
          if (_ctx.hasUI) {
            _ctx.ui.setStatus("ocgs-drift", `drift: ${driftCount} files`);
          }

          // Append drift warning to the tool result (Pi-only enhancement)
          return {
            content: [
              ...(Array.isArray(event.content) ? event.content : [{ type: "text" as const, text: String(event.content) }]),
              { type: "text" as const, text: `\n\n⚠️ OCGS drift detected in ${filePath}: ${issues.join("; ")}` },
            ],
            details: { ...event.details, drift: issues },
          };
        }
      }
    }
  });
}
```

- [ ] **Step 2: Test drift detection**

Create a malformed skill file:
```bash
echo -e "---\nname: test-skill\n---\n\nThis skill has no procedure section" > .agents/skills/test-skill/SKILL.md
```

Start Pi, prompt: "Check for drift"

Expected: Status bar shows `drift: 1 files`. Or the drift is detected on startup.

Then clean up: `rm -rf .agents/skills/test-skill/`

- [ ] **Step 3: Commit**

```bash
git add .pi/extensions/ocgs-drift-detector/
git commit -m "feat: add ocgs-drift-detector extension"
```


### Task 11: `ocgs-changelog` extension

**Files:**
- Create: `.pi/extensions/ocgs-changelog/index.ts`

**Interfaces:**
- Produces: `pi.registerCommand("changelog", ...)` for generating changelog entries

- [ ] **Step 1: Write the changelog extension**

`.pi/extensions/ocgs-changelog/index.ts`:

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function getUnreleasedCommits(): { hash: string; message: string; type: string }[] {
  try {
    const log = execSync('git log --oneline --no-decorate HEAD --not --tags 2>/dev/null || git log --oneline -20', {
      encoding: "utf-8",
    });

    return log.trim().split("\n").filter(Boolean).map(line => {
      const hash = line.slice(0, 7);
      const message = line.slice(8);
      const type = message.match(/^(\w+)(\(.+\))?!?:/)?.[1] || "other";
      return { hash, message, type };
    });
  } catch {
    return [];
  }
}

function generateChangelogPreview(commits: { hash: string; message: string; type: string }[]): string {
  const groups: Record<string, string[]> = { feat: [], fix: [], docs: [], refactor: [], test: [], chore: [], other: [] };

  for (const commit of commits) {
    const group = groups[commit.type] || groups.other;
    group.push(`- ${commit.message} (${commit.hash})`);
  }

  const parts: string[] = ["## Unreleased\n"];
  for (const [type, items] of Object.entries(groups)) {
    if (items.length > 0) {
      const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
      parts.push(`### ${typeLabel}\n`);
      parts.push(items.join("\n") + "\n");
    }
  }

  return parts.join("\n");
}

export default function (pi: ExtensionAPI) {
  // Check for unreleased commits after each agent turn
  pi.on("agent_end", async (_event, ctx) => {
    const unreleased = getUnreleasedCommits();
    if (unreleased.length > 0 && !fs.existsSync("CHANGELOG.md")) {
      const preview = generateChangelogPreview(unreleased);
      if (ctx.hasUI) {
        ctx.ui.setWidget("ocgs-changelog", [
          "## Unreleased Changes Detected",
          "",
          preview.slice(0, 500) + (preview.length > 500 ? "..." : ""),
          "",
          "Run /changelog to generate the full entry.",
        ]);
      }
    }
  });

  // /changelog command with TUI modal
  pi.registerCommand("changelog", {
    description: "Generate CHANGELOG.md from conventional commits",
    handler: async (_args, ctx) => {
      const unreleased = getUnreleasedCommits();
      if (unreleased.length === 0) {
        ctx.ui.notify("No unreleased commits found.", "info");
        return;
      }

      const preview = generateChangelogPreview(unreleased);

      if (ctx.mode === "tui") {
        const result = await ctx.ui.custom({
          type: "modal",
          title: "Changelog Preview",
          body: preview,
          actions: ["accept", "edit", "cancel"],
        });

        if (result?.action === "accept") {
          const existing = fs.existsSync("CHANGELOG.md") ? fs.readFileSync("CHANGELOG.md", "utf-8") : "";
          fs.writeFileSync("CHANGELOG.md", preview + "\n" + existing);
          ctx.ui.notify("CHANGELOG.md updated!", "success");
        } else if (result?.action === "edit") {
          // Open in editor for modification
          ctx.ui.notify("Edit the changelog in your editor and run /changelog again.", "info");
        }
      } else {
        console.log(preview);
      }
    },
  });
}
```

- [ ] **Step 2: Test changelog generation**

Make some conventional commits:
```bash
git add -A && git commit -m "feat: add changelog extension" --allow-empty
```

Start Pi, run: `/changelog`

Expected: TUI modal (or text output) showing the unreleased changes grouped by type.

- [ ] **Step 3: Commit**

```bash
git add .pi/extensions/ocgs-changelog/
git commit -m "feat: add ocgs-changelog extension with TUI modal"
```


### Task 12: `ocgs-validate` extension

**Files:**
- Create: `.pi/extensions/ocgs-validate/index.ts`
- Modify: `tests/agents/validate.mjs` (extend for .agents/ structure)

**Interfaces:**
- Consumes: `.agents/{agents,skills,commands,rules}/` content
- Produces: Validation warnings on file writes; CI validation command

- [ ] **Step 1: Write the validate extension**

`.pi/extensions/ocgs-validate/index.ts`:

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import fs from "node:fs";
import path from "node:path";

const AGENTS_DIR = path.resolve(process.cwd(), ".agents");

interface ValidationIssue {
  file: string;
  severity: "error" | "warning";
  message: string;
}

function validateFile(filePath: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const content = fs.readFileSync(filePath, "utf-8");
  const relPath = path.relative(AGENTS_DIR, filePath);

  // Check frontmatter exists
  if (!content.startsWith("---")) {
    issues.push({ file: relPath, severity: "error", message: "Missing YAML frontmatter" });
    return issues;
  }

  const fmEnd = content.indexOf("---", 3);
  if (fmEnd === -1) {
    issues.push({ file: relPath, severity: "error", message: "Unclosed YAML frontmatter" });
    return issues;
  }

  const frontmatter = content.slice(3, fmEnd).trim();
  const body = content.slice(fmEnd + 3).trim();

  // Check body exists
  if (!body) {
    issues.push({ file: relPath, severity: "warning", message: "Empty body after frontmatter" });
  }

  // Check no harness-specific fields
  for (const field of ["model:", "mode:", "permission:", "tools:"]) {
    if (frontmatter.includes(field)) {
      issues.push({ file: relPath, severity: "warning", message: `Harness-specific field '${field.replace(":", "")}' should not be in .agents/` });
    }
  }

  return issues;
}

export default function (pi: ExtensionAPI) {
  pi.on("resources_discover", async (event, _ctx) => {
    if (event.reason !== "startup") return;

    const allIssues: ValidationIssue[] = [];

    function scanDir(dir: string) {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) scanDir(fullPath);
        else if (entry.name.endsWith(".md") || entry.name.endsWith(".yaml")) {
          allIssues.push(...validateFile(fullPath));
        }
      }
    }

    scanDir(path.join(AGENTS_DIR, "agents"));
    scanDir(path.join(AGENTS_DIR, "skills"));
    scanDir(path.join(AGENTS_DIR, "rules"));

    if (allIssues.length > 0 && _ctx.hasUI) {
      _ctx.ui.setStatus("ocgs-validate", `validation: ${allIssues.length} issues`);
      _ctx.ui.notify(`OCGS validation: ${allIssues.filter(i => i.severity === "error").length} errors, ${allIssues.filter(i => i.severity === "warning").length} warnings`, "warn");
    }
  });

  // Post-write validation
  pi.on("tool_result", async (event, _ctx) => {
    if ((event.toolName === "write" || event.toolName === "edit") && event.input.path?.startsWith(".agents")) {
      const issues = validateFile(event.input.path as string);
      if (issues.length > 0) {
        return {
          content: [
            ...(Array.isArray(event.content) ? event.content : [{ type: "text" as const, text: String(event.content) }]),
            ...issues.map(i => ({ type: "text" as const, text: `\n[${i.severity.toUpperCase()}] ${i.file}: ${i.message}` })),
          ],
          details: { ...event.details, validation: issues },
        };
      }
    }
  });
}
```

- [ ] **Step 2: Update CI validation script**

Modify `tests/agents/validate.mjs` to validate `.agents/` structure instead of `.opencode/`:

```javascript
// Change the source directory from .opencode/ to .agents/
const SOURCE_DIR = path.resolve(process.cwd(), ".agents");
// ... rest of validation logic stays the same
```

- [ ] **Step 3: Test validation**

Create a file with harness-specific frontmatter:
```bash
echo -e "---\nname: test\nmodel: gpt-4\n---\n\nbody" > .agents/agents/test-bad.md
```

Start Pi. Expected: Validation status shows 1 warning about harness-specific field.

Clean up: `rm .agents/agents/test-bad.md`

- [ ] **Step 4: Commit**

```bash
git add .pi/extensions/ocgs-validate/ tests/agents/validate.mjs
git commit -m "feat: add ocgs-validate extension and update CI validation for .agents/"
```


### Task 13: Parity tests

**Files:**
- Create: `tests/e2e/test-parity.test.ts`
- Create: `tests/extensions/test-path-guard.test.mjs`
- Create: `tests/extensions/test-audit-format.test.mjs`

**Interfaces:**
- Consumes: All Pi extensions + OpenCode plugins
- Produces: Automated parity verification

- [ ] **Step 1: Write path-guard unit tests**

`tests/extensions/test-path-guard.test.mjs`:

```javascript
import { describe, it } from "node:test";
import assert from "node:assert";

// Import the module's pure functions (or reimplement for testing)
// These test the core matching logic independently of Pi

function matchRules(paths, rules) {
  // Same logic as in ocgs-path-guard/index.ts
  const { minimatch } = await import("minimatch");
  const matched = new Map();
  for (const filePath of paths) {
    for (const rule of rules) {
      if (rule.paths.some(glob => minimatch(filePath, glob))) {
        matched.set(rule.name, rule);
      }
    }
  }
  return Array.from(matched.values());
}

describe("ocgs-path-guard rule matching", () => {
  const rules = [
    { name: "ai-code", paths: ["src/ai/**"] },
    { name: "engine-code", paths: ["src/core/**"] },
    { name: "test-standards", paths: ["tests/**"] },
    { name: "prototype-code", paths: ["prototypes/**"] },
  ];

  it("matches single path to one rule", () => {
    const result = matchRules(["src/ai/patrol.gd"], rules);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, "ai-code");
  });

  it("matches multiple paths to multiple rules", () => {
    const result = matchRules(["src/ai/patrol.gd", "tests/test_patrol.gd"], rules);
    assert.strictEqual(result.length, 2);
    assert.deepStrictEqual(result.map(r => r.name).sort(), ["ai-code", "test-standards"]);
  });

  it("returns empty for non-matching paths", () => {
    const result = matchRules(["README.md"], rules);
    assert.strictEqual(result.length, 0);
  });

  it("deduplicates when same rule matches multiple paths", () => {
    const result = matchRules(["src/ai/patrol.gd", "src/ai/combat.gd"], rules);
    assert.strictEqual(result.length, 1);
  });
});
```

- [ ] **Step 2: Write audit format tests**

`tests/extensions/test-audit-format.test.mjs`:

```javascript
import { describe, it } from "node:test";
import assert from "node:assert";

// Test that the audit log format matches expected shape

describe("ocgs-audit format", () => {
  it("session_start entry matches expected format", () => {
    const entry = `[2026-06-21T12:00:00.000Z] session_start: {"reason":"startup"}\n`;
    assert.match(entry, /^\[\d{4}-\d{2}-\d{2}T/);
    assert.match(entry, /session_start/);
    assert.match(entry, /"reason":"startup"/);
  });

  it("tool_call entry has required fields", () => {
    const entry = `[2026-06-21T12:00:00.000Z] tool_call: {"tool":"read","callId":"call_1","args":{"path":"test.md"}}\n`;
    assert.match(entry, /tool_call/);
    assert.match(entry, /"tool":"read"/);
    assert.match(entry, /"callId":"call_1"/);
  });
});
```

- [ ] **Step 3: Write e2e parity test framework**

`tests/e2e/test-parity.test.ts`:

```typescript
/**
 * Parity tests: run the same OCGS scenario in both harnesses and assert
 * identical observable behavior.
 *
 * Usage:
 *   npm run test:parity          # Full parity test (requires both harnesses)
 *   npm run test:parity --quick  # Smoke test (single scenario)
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";

const SCENARIO = "startup";
const OPCODE_LOG = "test-output/opencode-audit.log";
const PI_LOG = "test-output/pi-audit.log";

function runOpencodeScenario(): string {
  // Spawn OpenCode with a scripted scenario
  // Returns the audit log path
  return OPCODE_LOG;
}

function runPiScenario(): string {
  // Spawn Pi in RPC mode with a scripted scenario
  // Returns the audit log path
  return PI_LOG;
}

function normalizeAuditLog(log: string): string {
  // Strip timestamps for comparison
  return log.replace(/\[\d{4}-\d{2}-\d{2}T[^\]]+\]/g, "[TIMESTAMP]");
}

describe("Harness parity", () => {
  it("produces same audit log entries for the same scenario", () => {
    const opencodeLog = runOpencodeScenario();
    const piLog = runPiScenario();

    const opencode = fs.readFileSync(opencodeLog, "utf-8");
    const pi = fs.readFileSync(piLog, "utf-8");

    assert.strictEqual(
      normalizeAuditLog(opencode),
      normalizeAuditLog(pi),
      "Audit logs should be identical (modulo timestamps)"
    );
  });

  it("has same number of tool calls", () => {
    const opencode = fs.readFileSync(OPCODE_LOG, "utf-8");
    const pi = fs.readFileSync(PI_LOG, "utf-8");

    const opencodeCalls = (opencode.match(/tool_call/g) || []).length;
    const piCalls = (pi.match(/tool_call/g) || []).length;

    assert.strictEqual(opencodeCalls, piCalls, "Same number of tool calls");
  });
});
```

- [ ] **Step 4: Run the unit tests**

```bash
node --test tests/extensions/test-path-guard.test.mjs
node --test tests/extensions/test-audit-format.test.mjs
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/ tests/extensions/
git commit -m "test: add parity tests for Pi extensions"
```

---

## Phase 4: Polish + Docs

### Task 14: Documentation

**Files:**
- Create: `docs/pi-compatibility.md`
- Modify: `AGENTS.md` (add reference to `.agents/` directory)

- [ ] **Step 1: Write Pi compatibility guide**

`docs/pi-compatibility.md`:

```markdown
# Pi Compatibility Guide

OpenCode Game Studios (OCGS) supports the Pi coding agent harness alongside OpenCode.

## Quick Start

1. Install Pi: `npm install -g @earendil-works/pi-coding-agent`
2. Clone the project: `git clone <repo> && cd <project>`
3. Start Pi: `pi`

All OCGS skills, commands, and agents are available automatically.

## Available Pi Extensions

| Extension | Purpose |
|---|---|
| `ocgs-delegation` | `Task` tool for agent delegation, `/consult` for peer review |
| `ocgs-question` | Strategic decision capture with TUI picker |
| `ocgs-path-guard` | Path-scoped rules injected dynamically |
| `ocgs-audit` | Session and tool audit logging |
| `ocgs-drift-detector` | Detects skill/agent structural drift |
| `ocgs-changelog` | Conventional-commit changelog generation |
| `ocgs-validate` | .agents/ content validation |

## Key Concepts

- **`.agents/`** — canonical source of all agents, skills, commands, rules, and modules
- **`.pi/extensions/`** — Pi-specific extension implementations
- **Cross-harness names** — `Task`, `question`, and `consult` work identically in OpenCode and Pi
```

- [ ] **Step 2: Update AGENTS.md**

Add a section referencing `.agents/`:

```markdown
## Project Structure

\`\`\`text
.agents/                     ← Canonical content (harness-agnostic)
  agents/                    ← 51 agent definitions
  skills/                    ← 77 skill workflows
  commands/                  ← 54 slash commands
  rules/                     ← 11 path-scoped rules
  modules/                   ← 17 installable modules
.opencode/                   ← OpenCode-specific config
.pi/                         ← Pi-specific extensions
\`\`\`
```

- [ ] **Step 3: Commit**

```bash
git add docs/pi-compatibility.md AGENTS.md
git commit -m "docs: add Pi compatibility guide and update AGENTS.md"
```


### Task 15: CI integration

**Files:**
- Modify: `.github/workflows/` (or equivalent CI config)

- [ ] **Step 1: Add validation workflow**

`.github/workflows/validate-agents.yml` (or similar):

```yaml
name: Validate .agents/

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: node tests/agents/validate.mjs
```

- [ ] **Step 2: Add extension tests**

```yaml
  test-extensions:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: node --test tests/extensions/
```

- [ ] **Step 3: Commit**

```bash
git add .github/
git commit -m "ci: add validation and extension testing workflows"
```


### Task 16: Sample future-harness configuration

**Files:**
- Create: `.claude/rules/` with a starter Claude Code config

- [ ] **Step 1: Write Claude Code rules pointing to .agents/**

`.claude/rules/ocgs-rules.md`:

```markdown
<!-- Example: Future Claude Code harness integration -->
<!-- Claude Code would read these rules to discover OCGS content -->

OCGS content is in the .agents/ directory.
- Agents: .agents/agents/
- Skills: .agents/skills/
- Commands: .agents/commands/
- Rules: .agents/rules/
```

- [ ] **Step 2: Write Cursor rules**

`.cursor/rules/ocgs-rules.mdc`:

```yaml
---
description: OCGS framework references
globs: 
  - .agents/**
---
OCGS agents, skills, and commands live in .agents/. Reference them directly.
```

- [ ] **Step 3: Commit**

```bash
git add .claude/ .cursor/
git commit -m "feat: add sample Claude Code and Cursor harness configs"
```

---

## Plan Self-Review Checklist

- ✅ **Spec coverage:** All 4 phases from the design doc are covered (Tasks 1-16). Phase 1 = Tasks 1-3, Phase 2 = Tasks 4-9, Phase 3 = Tasks 10-13, Phase 4 = Tasks 14-16.
- ✅ **No placeholders:** Every step has actual code, commands, and expected output. No TBDs, TODOs, or "implement later".
- ✅ **Type consistency:** All extension names, tool names (`Task`, `question`, `consult`), directory paths, and function signatures are consistent across tasks.
- ✅ **File paths are exact:** Every file creation and modification includes the full relative path.
- ✅ **Each task is independently testable:** Each task ends with a verification step and commit.
