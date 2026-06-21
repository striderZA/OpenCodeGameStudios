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
		issues.push({
			file: relPath,
			severity: "error",
			message: "Missing YAML frontmatter",
		});
		return issues;
	}

	const fmEnd = content.indexOf("---", 3);
	if (fmEnd === -1) {
		issues.push({
			file: relPath,
			severity: "error",
			message: "Unclosed YAML frontmatter",
		});
		return issues;
	}

	const frontmatter = content.slice(3, fmEnd).trim();
	const body = content.slice(fmEnd + 3).trim();

	// Check body exists
	if (!body) {
		issues.push({
			file: relPath,
			severity: "warning",
			message: "Empty body after frontmatter",
		});
	}

	// Check for harness-specific fields only in agent files
	// Skill files legitimately have model: per Agent Skills spec
	if (relPath.includes("agents" + path.sep)) {
		for (const field of ["model:", "mode:", "permission:", "tools:"]) {
			if (frontmatter.includes(field)) {
				issues.push({
					file: relPath,
					severity: "warning",
					message: `Harness-specific field '${field.replace(":", "")}' should not be in .agents/agent files`,
				});
			}
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

		if (allIssues.length > 0) {
			// Write detailed report so user can see all issues
			const reportPath = path.join(
				process.cwd(),
				"production",
				"session-logs",
				"ocgs-validation-report.md",
			);
			try {
				fs.mkdirSync(path.dirname(reportPath), { recursive: true });
				const report = [
					`# OCGS Validation Report`,
					`**Date:** ${new Date().toISOString().split("T")[0]}`,
					`**Session startup:** ${event.reason}`,
					`**Total issues:** ${allIssues.length} (${allIssues.filter((i) => i.severity === "error").length} errors, ${allIssues.filter((i) => i.severity === "warning").length} warnings)`,
					"",
					...allIssues.map(
						(i) => `- [${i.severity.toUpperCase()}] ${i.file}: ${i.message}`,
					),
				].join("\n");
				fs.writeFileSync(reportPath, report);
			} catch {
				/* report writing is best-effort */
			}

			if (_ctx.hasUI) {
				_ctx.ui.setStatus(
					"ocgs-validate",
					`validation: ${allIssues.length} issues`,
				);
				_ctx.ui.notify(
					`OCGS validation: ${allIssues.filter((i) => i.severity === "error").length} errors, ${allIssues.filter((i) => i.severity === "warning").length} warnings — see ${path.relative(process.cwd(), reportPath)}`,
					"warn",
				);
			}
		}
	});

	// Post-write validation
	pi.on("tool_result", async (event, _ctx) => {
		if (
			(event.toolName === "write" || event.toolName === "edit") &&
			typeof event.input.path === "string" &&
			event.input.path.startsWith(".agents")
		) {
			const issues = validateFile(event.input.path);
			if (issues.length > 0) {
				return {
					content: [
						...(Array.isArray(event.content)
							? event.content
							: [{ type: "text" as const, text: String(event.content) }]),
						...issues.map((i) => ({
							type: "text" as const,
							text: `\n[${i.severity.toUpperCase()}] ${i.file}: ${i.message}`,
						})),
					],
					details: { ...event.details, validation: issues },
				};
			}
		}
	});
}
