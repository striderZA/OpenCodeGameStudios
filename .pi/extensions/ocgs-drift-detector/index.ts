import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import fs from "node:fs";
import path from "node:path";

const AGENTS_DIR = path.resolve(process.cwd(), ".agents");

// Required frontmatter fields per file type
const REQUIRED_SECTIONS: Record<string, string[]> = {
  agents: ["description"],
  skills: ["name", "description"],
  commands: ["name", "description", "skill"],
};

function parseFrontmatter(content: string): Record<string, unknown> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};

  const frontmatter: Record<string, unknown> = {};
  const lines = match[1].split(/\r?\n/);
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key) frontmatter[key] = value;
  }
  return frontmatter;
}

async function checkFileForDrift(filePath: string): Promise<string[]> {
  const relPath = path.relative(AGENTS_DIR, filePath);
  const type = relPath.split(path.sep)[0]; // 'agents', 'skills', 'commands'
  const requirements = REQUIRED_SECTIONS[type];
  if (!requirements) return [];

  const content = fs.readFileSync(filePath, "utf-8");
  const frontmatter = parseFrontmatter(content);
  const issues: string[] = [];

  for (const field of requirements) {
    if (!frontmatter[field]) {
      issues.push(`missing required frontmatter field: ${field}`);
    }
  }

  return issues;
}

let driftCount = 0;

// Paths under .agents/ that a write or edit touched. omp's hashline edit names each file in a [PATH#TAG] header.
function writtenAgentsPaths(toolName: string, input: Record<string, unknown>): string[] {
  const named: string[] = [];
  if (toolName === "write" && typeof input.path === "string") named.push(input.path);
  if (toolName === "edit") {
    if (typeof input.path === "string") {
      named.push(input.path);
    } else if (typeof input.input === "string") {
      for (const match of input.input.matchAll(/^\[([^\]\n#]+)#[0-9A-Fa-f]{4}\]/gm)) named.push(match[1]);
    }
  }
  return named.filter((p) => p.startsWith(".agents") && fs.existsSync(p));
}

export default function(pi: ExtensionAPI) {
  // Pi fires startup resources_discover and session_start for the same start; scan once per session.
  let startupScanned = false;

  async function runStartupScan(ctx: ExtensionContext) {
    driftCount = 0;
    const files: string[] = [];

    function collect(dir: string) {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) collect(fullPath);
        else if (entry.name.endsWith(".md")) files.push(fullPath);
      }
    }

    collect(path.join(AGENTS_DIR, "agents"));
    collect(path.join(AGENTS_DIR, "skills"));
    collect(path.join(AGENTS_DIR, "commands"));

    // checkFileForDrift is async; its result must be awaited before it is counted.
    for (const file of files) {
      if ((await checkFileForDrift(file)).length > 0) driftCount++;
    }

    if (driftCount > 0 && ctx.hasUI) {
      ctx.ui.setStatus("ocgs-drift", `drift: ${driftCount} files`);
    }
  }

  pi.on("session_start", async (_event, ctx) => {
    if (startupScanned) return;
    startupScanned = true;
    await runStartupScan(ctx);
  });

  pi.on("resources_discover", async (event, ctx) => {
    if (event.reason !== "startup" || startupScanned) return;
    startupScanned = true;
    await runStartupScan(ctx);
  });

  pi.on("session_shutdown", async () => {
    startupScanned = false;
  });

  pi.on("tool_result", async (event, ctx) => {
    const input = (event.input ?? {}) as Record<string, unknown>;
    const appended: { type: "text"; text: string }[] = [];
    const driftIssues: string[] = [];

    for (const filePath of writtenAgentsPaths(event.toolName, input)) {
      const issues = await checkFileForDrift(filePath);
      if (issues.length === 0) continue;
      driftCount++;
      if (ctx.hasUI) {
        ctx.ui.setStatus("ocgs-drift", `drift: ${driftCount} files`);
      }
      driftIssues.push(...issues);
      // Append drift warning to the tool result (Pi-only enhancement)
      appended.push({
        type: "text" as const,
        text: `\n\n⚠️ OCGS drift detected in ${filePath}: ${issues.join("; ")}`,
      });
    }

    if (appended.length === 0) return;
    return {
      content: [
        ...(Array.isArray(event.content)
          ? event.content
          : [{ type: "text" as const, text: String(event.content) }]),
        ...appended,
      ],
      details: { ...event.details, drift: driftIssues },
    };
  });
}
