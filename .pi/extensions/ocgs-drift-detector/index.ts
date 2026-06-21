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
		if (
			!content.toLowerCase().includes(`**${section}**`) &&
			!content.toLowerCase().includes(`## ${section}`) &&
			!content.toLowerCase().includes(`# ${section}`)
		) {
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
