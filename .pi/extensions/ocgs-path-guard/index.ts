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
