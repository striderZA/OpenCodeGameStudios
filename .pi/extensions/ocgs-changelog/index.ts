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
