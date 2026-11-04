/**
 * Harness-neutral CCGS hook logic. The Pi and omp wiring lives in ./index.ts.
 * Ported from .opencode/plugins/ccgs-hooks.ts. Pure Node: no Pi or omp imports,
 * so the functions run under `node --test` without a harness.
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PROTECTED_BRANCHES = ["main", "master", "develop"];
const SOURCE_EXTENSIONS = [".gd", ".cs", ".cpp", ".c", ".h", ".hpp", ".rs", ".py", ".js", ".ts"];
const ASSETS_PATH_RE = /(?:^|\/)assets\//;
const ASSET_JSON_RE = /^assets\/data\/.*\.json$/;
const SKILL_CHANGE_RE = /\.(?:opencode|agents)\/(?:skills|commands)\/([^/]+)/;
// omp's edit tool names each edited file in a [PATH#TAG] header line.
const HASHLINE_HEADER_RE = /^\[([^\]\n#]+)#[0-9A-Fa-f]{4}\]/gm;

export const DESIGN_SECTIONS = [
	"Overview",
	"Player Fantasy",
	"Detailed",
	"Formulas",
	"Edge Cases",
	"Dependencies",
	"Tuning Knobs",
	"Acceptance Criteria",
];

export interface Findings {
	warnings: string[];
	errors: string[];
}

/** Runs git with argv (no shell). Returns trimmed stdout, or "" on any failure. */
export function git(cwd: string, ...args: string[]): string {
	const result = spawnSync("git", args, {
		encoding: "utf8",
		cwd,
		stdio: ["pipe", "pipe", "ignore"],
		timeout: 15000,
		windowsHide: true,
	});
	if (result.error || result.status !== 0) return "";
	return (result.stdout ?? "").trim();
}

export function isGitRepo(cwd: string): boolean {
	return git(cwd, "rev-parse", "--git-dir") !== "";
}

export function normalizePath(p: string): string {
	return p.replace(/\\/g, "/");
}

export function isBashTool(toolName: string): boolean {
	return toolName === "bash" || toolName === "powershell";
}

/** Pi's delegation tool is `Task`; omp's built-in is `task`. */
export function isTaskTool(toolName: string): boolean {
	return toolName.toLowerCase() === "task";
}

function sessionTimestamp(): string {
	return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

export function logAudit(projectRoot: string, message: string): void {
	const dir = path.join(projectRoot, "production", "session-logs");
	fs.mkdirSync(dir, { recursive: true });
	fs.appendFileSync(path.join(dir, "agent-audit.log"), `${sessionTimestamp()} | ${message}\n`);
}

function validateJson(filePath: string): boolean {
	try {
		JSON.parse(fs.readFileSync(filePath, "utf8"));
		return true;
	} catch {
		return false;
	}
}

function findFilesRecursive(root: string, predicate: (name: string, filePath: string) => boolean): string[] {
	const results: string[] = [];
	if (!fs.existsSync(root)) return results;
	for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
		const fullPath = path.join(root, entry.name);
		if (entry.isDirectory()) {
			results.push(...findFilesRecursive(fullPath, predicate));
		} else if (entry.isFile() && predicate(entry.name, fullPath)) {
			results.push(fullPath);
		}
	}
	return results;
}

function getFilesByMtime(dir: string, filter: (name: string) => boolean): string[] {
	if (!fs.existsSync(dir)) return [];
	return fs
		.readdirSync(dir)
		.filter(filter)
		.map((f) => path.join(dir, f))
		.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
}

export function handleSessionCreated(projectRoot: string): string {
	const lines: string[] = [];
	logAudit(projectRoot, "session.created fired");

	if (isGitRepo(projectRoot)) {
		const branch = git(projectRoot, "rev-parse", "--abbrev-ref", "HEAD");
		if (branch) {
			lines.push(`Branch: ${branch}`);
			lines.push("");
			lines.push("Recent commits:");
			const commits = git(projectRoot, "log", "--oneline", "-5");
			if (commits) commits.split("\n").forEach((line) => lines.push(`  ${line}`));
		}
	}

	const sprintFiles = getFilesByMtime(path.join(projectRoot, "production", "sprints"), (f) =>
		/^sprint-.*\.md$/.test(f),
	);
	if (sprintFiles.length > 0) {
		lines.push("");
		lines.push(`Active sprint: ${path.basename(sprintFiles[0], ".md")}`);
	}

	const milestoneFiles = getFilesByMtime(path.join(projectRoot, "production", "milestones"), (f) =>
		f.endsWith(".md"),
	);
	if (milestoneFiles.length > 0) {
		lines.push(`Active milestone: ${path.basename(milestoneFiles[0], ".md")}`);
	}

	let bugCount = 0;
	for (const dir of [path.join(projectRoot, "tests", "playtest"), path.join(projectRoot, "production")]) {
		bugCount += findFilesRecursive(dir, (name) => /^BUG-.*\.md$/.test(name)).length;
	}
	if (bugCount > 0) lines.push(`Open bugs: ${bugCount}`);

	const srcDir = path.join(projectRoot, "src");
	if (fs.existsSync(srcDir)) {
		let todoCount = 0;
		let fixmeCount = 0;
		for (const fp of findFilesRecursive(srcDir, () => true)) {
			const content = fs.readFileSync(fp, "utf8");
			todoCount += (content.match(/TODO/g) || []).length;
			fixmeCount += (content.match(/FIXME/g) || []).length;
		}
		if (todoCount > 0 || fixmeCount > 0) {
			lines.push("");
			lines.push(`Code health: ${todoCount} TODOs, ${fixmeCount} FIXMEs in src/`);
		}
	}

	return lines.join("\n");
}

/** Archives active.md and the session's commits and uncommitted files to session-log.md. */
export function handleSessionIdle(projectRoot: string): void {
	logAudit(projectRoot, "Session idle/shutdown");

	const timestamp = sessionTimestamp();
	const logDir = path.join(projectRoot, "production", "session-logs");
	fs.mkdirSync(logDir, { recursive: true });

	const stateFile = path.join(projectRoot, "production", "session-state", "active.md");
	if (fs.existsSync(stateFile)) {
		const block = `## Archived Session State: ${timestamp}\n${fs.readFileSync(stateFile, "utf8")}\n---\n`;
		fs.appendFileSync(path.join(logDir, "session-log.md"), block);
	}

	if (isGitRepo(projectRoot)) {
		const recentCommits = git(projectRoot, "log", "--oneline", "--since=8 hours ago");
		const modifiedFiles = git(projectRoot, "diff", "--name-only");
		if (recentCommits || modifiedFiles) {
			let entry = `## Session End: ${timestamp}\n`;
			if (recentCommits) entry += `### Commits\n${recentCommits}\n`;
			if (modifiedFiles) entry += `### Uncommitted Changes\n${modifiedFiles}\n`;
			entry += "---\n";
			fs.appendFileSync(path.join(logDir, "session-log.md"), entry);
		}
	}
}

function isEngineConfigured(projectRoot: string): boolean {
	const agentsMd = path.join(projectRoot, "AGENTS.md");
	if (!fs.existsSync(agentsMd)) return false;
	const engineLine = fs
		.readFileSync(agentsMd, "utf8")
		.split("\n")
		.find((l) => /^\s*-\s*\*\*Engine\*\*:/.test(l));
	return !engineLine?.includes("[CHOOSE:");
}

function getSubdirNames(root: string): string[] {
	if (!fs.existsSync(root)) return [];
	return fs
		.readdirSync(root, { withFileTypes: true })
		.filter((d) => d.isDirectory())
		.map((d) => d.name);
}

export function handleLogAgent(projectRoot: string, agentType: string): void {
	const dir = path.join(projectRoot, "production", "session-logs");
	fs.mkdirSync(dir, { recursive: true });
	fs.appendFileSync(
		path.join(dir, "agent-audit.log"),
		`${sessionTimestamp()} | Agent invoked: ${agentType || "unknown"}\n`,
	);
}

export function handleLogAgentStop(projectRoot: string, agentType: string): void {
	const dir = path.join(projectRoot, "production", "session-logs");
	fs.mkdirSync(dir, { recursive: true });
	fs.appendFileSync(
		path.join(dir, "agent-audit.log"),
		`${sessionTimestamp()} | Agent completed: ${agentType || "unknown"}\n`,
	);
}

export function handleDetectGaps(projectRoot: string): string[] {
	const gaps: string[] = [];

	const engineConfigured = isEngineConfigured(projectRoot);
	const hasGameConcept = fs.existsSync(path.join(projectRoot, "design", "gdd", "game-concept.md"));
	const srcCount = findFilesRecursive(path.join(projectRoot, "src"), (name) =>
		SOURCE_EXTENSIONS.some((ext) => name.endsWith(ext)),
	).length;
	const isFresh = !engineConfigured && !hasGameConcept && srcCount === 0;

	if (isFresh) {
		gaps.push("NEW PROJECT: No engine configured, no game concept, no source code. Run: /start");
		gaps.push("For comprehensive analysis, run: /project-stage-detect");
		return gaps;
	}

	const designCount = findFilesRecursive(path.join(projectRoot, "design", "gdd"), (name) =>
		name.endsWith(".md"),
	).length;
	if (srcCount > 50 && designCount < 5) {
		gaps.push(
			`GAP: ${srcCount} source files but only ${designCount} design docs. Run: /reverse-document design src/[system]`,
		);
	}

	const protoDir = path.join(projectRoot, "prototypes");
	if (fs.existsSync(protoDir)) {
		const undocumented = getSubdirNames(protoDir).filter(
			(dir) =>
				!fs.existsSync(path.join(protoDir, dir, "README.md")) &&
				!fs.existsSync(path.join(protoDir, dir, "CONCEPT.md")),
		);
		if (undocumented.length > 0) {
			gaps.push(
				`GAP: ${undocumented.length} undocumented prototypes (${undocumented.join(", ")}). Run: /reverse-document concept [name]`,
			);
		}
	}

	const coreDir = path.join(projectRoot, "src", "core");
	const engineDir = path.join(projectRoot, "src", "engine");
	const archDir = path.join(projectRoot, "docs", "architecture");
	if (fs.existsSync(coreDir) || fs.existsSync(engineDir)) {
		if (!fs.existsSync(archDir)) {
			gaps.push("GAP: Core systems exist but no docs/architecture/. Run: /architecture-decision");
		} else {
			const adrCount = findFilesRecursive(archDir, (name) => name.endsWith(".md")).length;
			if (adrCount < 3) {
				gaps.push(
					`GAP: Only ${adrCount} ADRs for core systems. Run: /reverse-document architecture src/core/[system]`,
				);
			}
		}
	}

	const gameplayDir = path.join(projectRoot, "src", "gameplay");
	for (const system of getSubdirNames(gameplayDir)) {
		const fileCount = findFilesRecursive(path.join(gameplayDir, system), () => true).length;
		if (fileCount >= 5) {
			const doc1 = path.join(projectRoot, "design", "gdd", `${system}-system.md`);
			const doc2 = path.join(projectRoot, "design", "gdd", `${system}.md`);
			if (!fs.existsSync(doc1) && !fs.existsSync(doc2)) {
				gaps.push(
					`GAP: src/gameplay/${system}/ (${fileCount} files) has no design doc. Run: /reverse-document design src/gameplay/${system}`,
				);
			}
		}
	}

	if (
		srcCount > 100 &&
		!fs.existsSync(path.join(projectRoot, "production", "sprints")) &&
		!fs.existsSync(path.join(projectRoot, "production", "milestones"))
	) {
		gaps.push(`GAP: ${srcCount} files but no production planning. Run: /sprint-plan`);
	}

	return gaps;
}

/** Checks staged files before `git commit`. Errors block the commit; warnings are advisory. */
export function validateCommitFiles(projectRoot: string, stagedFiles: string[]): Findings {
	const warnings: string[] = [];
	const errors: string[] = [];

	for (const file of stagedFiles) {
		const fp = path.join(projectRoot, file);
		if (!fs.existsSync(fp)) continue;

		if (file.startsWith("design/gdd/") && file.endsWith(".md")) {
			const content = fs.readFileSync(fp, "utf8");
			for (const section of DESIGN_SECTIONS) {
				if (!content.toLowerCase().includes(section.toLowerCase())) {
					warnings.push(`DESIGN: ${file} missing required section: ${section}`);
				}
			}
		}

		if (ASSET_JSON_RE.test(file) && !validateJson(fp)) {
			errors.push(`BLOCKED: ${file} is not valid JSON. Fix before committing.`);
		}

		if (file.startsWith("src/gameplay/")) {
			const content = fs.readFileSync(fp, "utf8");
			if (/(damage|health|speed|rate|chance|cost|duration)\s*[:=]\s*\d+/.test(content)) {
				warnings.push(`CODE: ${file} may contain hardcoded gameplay values. Use data files.`);
			}
		}

		if (file.startsWith("src/")) {
			const content = fs.readFileSync(fp, "utf8");
			if (content.split("\n").some((l) => /(TODO|FIXME|HACK)[^(]/.test(l))) {
				warnings.push(`STYLE: ${file} has TODO/FIXME without owner tag. Use TODO(name) format.`);
			}
		}
	}

	return { warnings, errors };
}

/** Returns the skill or command name when a path under .agents/ (or .opencode/) is a skill or command. */
export function detectSkillChange(filePath: string): string | null {
	const match = filePath.match(SKILL_CHANGE_RE);
	return match ? match[1] : null;
}

export function validateAssetPath(projectRoot: string, filePath: string): Findings {
	const normalized = normalizePath(filePath);
	const warnings: string[] = [];
	const errors: string[] = [];

	if (!ASSETS_PATH_RE.test(normalized)) return { warnings, errors };

	const filename = path.basename(normalized);
	if (/[A-Z\s-]/.test(filename)) {
		warnings.push(`NAMING: ${normalized} must be lowercase with underscores (got: ${filename})`);
	}

	if (/(?:^|\/)assets\/data\/.*\.json$/.test(normalized)) {
		const absolutePath = path.isAbsolute(normalized) ? normalized : path.join(projectRoot, normalized);
		if (fs.existsSync(absolutePath) && !validateJson(absolutePath)) {
			errors.push(`FORMAT: ${normalized} is not valid JSON`);
		}
	}

	return { warnings, errors };
}

/**
 * Paths a write or edit tool call touched. Pi's edit passes `path`; omp's edit passes
 * hashline text in `input` with one [PATH#TAG] header per file, and no `path`.
 */
export function editedPaths(toolName: string, input: Record<string, unknown>): string[] {
	if (toolName !== "write" && toolName !== "edit") return [];
	const paths: string[] = [];
	if (typeof input.path === "string" && input.path) paths.push(input.path);
	if (toolName === "edit" && typeof input.input === "string") {
		for (const match of input.input.matchAll(HASHLINE_HEADER_RE)) paths.push(match[1]);
	}
	return [...new Set(paths)];
}

export function buildCompactionContext(projectRoot: string): string {
	const lines: string[] = [];

	lines.push("=== SESSION STATE BEFORE COMPACTION ===");
	lines.push(`Timestamp: ${new Date().toISOString()}`);

	const activeState = path.join(projectRoot, "production", "session-state", "active.md");
	if (fs.existsSync(activeState)) {
		const contentLines = fs.readFileSync(activeState, "utf8").split("\n");
		lines.push("");
		lines.push("## Active Session State (from production/session-state/active.md)");
		if (contentLines.length > 100) {
			lines.push(contentLines.slice(0, 100).join("\n"));
			lines.push(`... (truncated — ${contentLines.length} total lines, showing first 100)`);
		} else {
			lines.push(contentLines.join("\n"));
		}
	} else {
		lines.push("");
		lines.push("## No active session state file found");
		lines.push("Consider maintaining production/session-state/active.md for better recovery.");
	}

	lines.push("");
	lines.push("## Files Modified (git working tree)");
	if (isGitRepo(projectRoot)) {
		const changed = git(projectRoot, "diff", "--name-only");
		const staged = git(projectRoot, "diff", "--staged", "--name-only");
		const untracked = git(projectRoot, "ls-files", "--others", "--exclude-standard");

		let anyChanges = false;
		if (changed) {
			anyChanges = true;
			lines.push("Unstaged changes:");
			changed.split("\n").forEach((f) => lines.push(`  - ${f}`));
		}
		if (staged) {
			anyChanges = true;
			lines.push("Staged changes:");
			staged.split("\n").forEach((f) => lines.push(`  - ${f}`));
		}
		if (untracked) {
			anyChanges = true;
			lines.push("New untracked files:");
			untracked.split("\n").forEach((f) => lines.push(`  - ${f}`));
		}
		if (!anyChanges) lines.push("  (no uncommitted changes)");
	} else {
		lines.push("  (not a git repository)");
	}

	lines.push("");
	lines.push("## Design Docs — Work In Progress");
	const gddDir = path.join(projectRoot, "design", "gdd");
	let wipFound = false;
	for (const fp of findFilesRecursive(gddDir, (name) => name.endsWith(".md"))) {
		const wipLines = fs
			.readFileSync(fp, "utf8")
			.split("\n")
			.filter((l) => /TODO|WIP|PLACEHOLDER|\[TO BE|\[TBD\]/.test(l));
		if (wipLines.length > 0) {
			wipFound = true;
			lines.push(`  ${normalizePath(path.relative(projectRoot, fp))}:`);
			wipLines.forEach((l) => lines.push(`    ${l}`));
		}
	}
	if (!wipFound) lines.push("  (no WIP markers found in design docs)");

	lines.push("");
	lines.push("## Recovery Instructions");
	lines.push("After compaction, read production/session-state/active.md to recover full working context.");
	lines.push("Then read any files listed above that are being actively worked on.");
	lines.push("=== END SESSION STATE ===");

	return lines.join("\n");
}

export function logCompactionEvent(projectRoot: string): void {
	const logDir = path.join(projectRoot, "production", "session-logs");
	fs.mkdirSync(logDir, { recursive: true });
	fs.appendFileSync(
		path.join(logDir, "compaction-log.txt"),
		`Context compaction occurred at ${new Date().toISOString()}.\n`,
	);
}

export function handlePostCompact(projectRoot: string): string {
	const active = path.join(projectRoot, "production", "session-state", "active.md");
	if (fs.existsSync(active)) {
		const size = fs.readFileSync(active, "utf8").split("\n").length;
		return `Session state restored: production/session-state/active.md (${size} lines) — read this file to continue working.`;
	}
	return "No session state file found. Check production/session-logs/ for the last session audit.";
}

export function detectPushToProtected(cmd: string, currentBranch: string): string {
	for (const b of PROTECTED_BRANCHES) {
		if (currentBranch === b || new RegExp(`\\s${b}(\\s|$)`).test(cmd)) return b;
	}
	return "";
}

export function getAgentType(args: Record<string, unknown>): string {
	const agentType = args.agent || args.subagent_type || args.subagentType || args.agent_type || args.agentType;
	return typeof agentType === "string" ? agentType : "";
}

/**
 * Best-effort OS notification. Spawns detached so it never blocks the agent
 * (the OpenCode port used execSync, which froze the event loop for the sleep).
 */
export function showNotification(message: string): void {
	const text = (message || "Agent needs your attention").slice(0, 200);
	const run = (command: string, args: string[]) => {
		const child = spawn(command, args, { detached: true, stdio: "ignore", windowsHide: true });
		child.on("error", () => {
			/* notification is best-effort; a missing notifier binary is not an error */
		});
		child.unref();
	};

	if (process.platform === "win32") {
		const escaped = text.replace(/'/g, "''");
		run("powershell.exe", [
			"-NonInteractive",
			"-WindowStyle",
			"Hidden",
			"-Command",
			"Add-Type -AssemblyName System.Windows.Forms; " +
				"$n = New-Object System.Windows.Forms.NotifyIcon; " +
				"$n.Icon = [System.Drawing.SystemIcons]::Information; " +
				"$n.BalloonTipTitle = 'OCGS'; " +
				`$n.BalloonTipText = '${escaped}'; ` +
				"$n.Visible = $true; " +
				"$n.ShowBalloonTip(5000); " +
				"Start-Sleep -Seconds 6; " +
				"$n.Dispose()",
		]);
	} else if (process.platform === "darwin") {
		run("osascript", ["-e", `display notification ${JSON.stringify(text)} with title "OCGS"`]);
	} else if (process.platform === "linux") {
		run("notify-send", ["OCGS", text]);
	}
}
