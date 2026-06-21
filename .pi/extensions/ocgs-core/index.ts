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
