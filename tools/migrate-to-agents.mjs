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
// Includes leaked sub-fields from flat-only YAML parser (nested permission: { bash: deny })
const STRIP_FIELDS = [
	"model",
	"mode",
	"permission",
	"permissions",
	"fallbackModels",
	"tools",
	"temperature",
	"maxTokens",
	"provider",
	"bash",
	"write",
	"read",
	"edit",
	"grep",
	"find",
	"ls",
];

function parseFrontmatter(content) {
	const match = content.match(/^---\n([\s\S]*?)\n---\n/);
	if (!match) return { frontmatter: {}, body: content };
	const frontmatter = {};
	for (const line of match[1].split("\n")) {
		const sep = line.indexOf(":");
		if (sep > 0)
			frontmatter[line.slice(0, sep).trim()] = line.slice(sep + 1).trim();
	}
	return { frontmatter, body: content.slice(match[0].length) };
}

function stripHarnessFields(frontmatter) {
	const clean = { ...frontmatter };
	for (const field of STRIP_FIELDS) delete clean[field];
	return clean;
}

function serializeFrontmatter(frontmatter, body) {
	const fmLines = Object.entries(frontmatter).map(([k, v]) => `${k}: ${v}`);
	return `---\n${fmLines.join("\n")}\n---\n\n${body}`;
}

function migrateFile(srcPath, destPath, type, relPath) {
	const content = fs.readFileSync(srcPath, "utf-8");
	let result = content;

	// Detect agent files: top-level (type === "agents") or nested in modules (path segment)
	const isAgentFile = type === "agents" || relPath.split(path.sep).includes("agents");

	if (isAgentFile) {
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
	let total = 0,
		modified = 0;

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
				} else if (
					entry.isFile() &&
					(entry.name.endsWith(".md") ||
						entry.name.endsWith(".yaml") ||
						entry.name.endsWith(".json"))
				) {
					if (dryRun) {
						console.log(
							`[DRY RUN] Would ${dir === "agents" ? "process" : "copy"}: ${relPath}`,
						);
					} else {
						const status = migrateFile(srcPath, destPath, dir, relPath);
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
		console.log(
			`\nMigration complete: ${total} files processed, ${modified} agents had harness fields stripped.`,
		);

		if (removeOld) {
			for (const dir of DIRS) {
				const srcPath = path.join(ROOT, ".opencode", dir);
				if (fs.existsSync(srcPath)) {
					fs.rmSync(srcPath, { recursive: true, force: true });
					console.log(`Removed: ${srcPath}`);
				}
			}
		} else {
			console.log(
				`\nUse --remove-old to delete the original .opencode/{${DIRS.join(",")}} directories.`,
			);
		}
	}
}

main();
