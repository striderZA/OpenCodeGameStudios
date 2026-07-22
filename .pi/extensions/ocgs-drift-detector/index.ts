import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
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

export default function(pi: ExtensionAPI) {
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
    scanDir(path.join(AGENTS_DIR, "commands"));

    if (driftCount > 0 && _ctx.hasUI) {
      _ctx.ui.setStatus("ocgs-drift", `drift: ${driftCount} files`);
    }
  });

  pi.on("tool_result", async (event, _ctx) => {
    const toolName = event.toolName;
    const input = event.input as Record<string, unknown>;

    if (toolName === "write" || toolName === "edit") {
      if (!input || typeof input !== "object") return;
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
              ...(Array.isArray(event.content)
                ? event.content
                : [{ type: "text" as const, text: String(event.content) }]),
              {
                type: "text" as const,
                text: `\n\n⚠️ OCGS drift detected in ${filePath}: ${issues.join("; ")}`,
              },
            ],
            details: { ...event.details, drift: issues },
          };
        }
      }
    }
  });
}
