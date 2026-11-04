import { describe, it, after } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { createFakeExtensionApi } from "./support/fake-extension-api.mjs";

const repoRoot = process.cwd();
const hooksDir = path.join(repoRoot, ".pi", "extensions", "ocgs-hooks");
const core = await import(pathToFileURL(path.join(hooksDir, "core.ts")).href);
const extension = (await import(pathToFileURL(path.join(hooksDir, "index.ts")).href)).default;

const created = [];

function newProject() {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "ocgs-hooks-"));
	created.push(root);
	const init = spawnSync("git", ["init", "-q"], { cwd: root, encoding: "utf8" });
	assert.strictEqual(init.status, 0, `git init failed: ${init.stderr}`);
	return root;
}

function writeFile(root, rel, content) {
	const abs = path.join(root, rel);
	fs.mkdirSync(path.dirname(abs), { recursive: true });
	fs.writeFileSync(abs, content);
}

function gitIn(root, ...args) {
	const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
	assert.strictEqual(result.status, 0, `git ${args.join(" ")} failed: ${result.stderr}`);
	return result.stdout;
}

function readAudit(root) {
	const file = path.join(root, "production", "session-logs", "agent-audit.log");
	return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

/** Loads the extension with cwd set to the project (the factory logs to process.cwd()). */
function loadExtension(root) {
	process.chdir(root);
	const api = createFakeExtensionApi();
	api.sent = [];
	api.sendMessage = (message) => api.sent.push(message);
	extension(api);
	return api;
}

after(() => {
	process.chdir(repoRoot);
	// Windows can hold fixtures briefly after the cases finish; retry rather than fail teardown.
	for (const root of created) {
		fs.rmSync(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
	}
});

describe("core: commit validation", () => {
	it("errors on a staged asset JSON file that does not parse", () => {
		const root = newProject();
		writeFile(root, "assets/data/bad.json", "{ not json");
		const result = core.validateCommitFiles(root, ["assets/data/bad.json"]);
		assert.deepStrictEqual(result.errors, [
			"BLOCKED: assets/data/bad.json is not valid JSON. Fix before committing.",
		]);
	});

	it("passes a staged asset JSON file that parses", () => {
		const root = newProject();
		writeFile(root, "assets/data/good.json", '{"damage": 3}');
		const result = core.validateCommitFiles(root, ["assets/data/good.json"]);
		assert.deepStrictEqual(result, { warnings: [], errors: [] });
	});

	it("warns on a design doc that lacks a required section", () => {
		const root = newProject();
		writeFile(root, "design/gdd/combat.md", "## Overview\n\nOnly one section here.\n");
		const result = core.validateCommitFiles(root, ["design/gdd/combat.md"]);
		assert.ok(result.warnings.includes("DESIGN: design/gdd/combat.md missing required section: Formulas"));
		assert.ok(!result.warnings.includes("DESIGN: design/gdd/combat.md missing required section: Overview"));
	});

	it("warns on a TODO without an owner tag in src/ but not a tagged one", () => {
		const root = newProject();
		writeFile(root, "src/main.gd", "# TODO fix this\n");
		writeFile(root, "src/owned.gd", "# TODO(ana) fix this\n");
		const bare = core.validateCommitFiles(root, ["src/main.gd"]);
		const owned = core.validateCommitFiles(root, ["src/owned.gd"]);
		assert.strictEqual(bare.warnings.length, 1);
		assert.match(bare.warnings[0], /STYLE: src\/main\.gd has TODO\/FIXME without owner tag/);
		assert.deepStrictEqual(owned.warnings, []);
	});

	it("ignores staged paths that no longer exist (deletions)", () => {
		const root = newProject();
		const result = core.validateCommitFiles(root, ["assets/data/removed.json"]);
		assert.deepStrictEqual(result, { warnings: [], errors: [] });
	});
});

describe("core: push, skill, and asset checks", () => {
	it("flags a push to a protected branch named in the command or the current branch", () => {
		assert.strictEqual(core.detectPushToProtected("git push origin main", "feature/x"), "main");
		assert.strictEqual(core.detectPushToProtected("git push", "develop"), "develop");
		assert.strictEqual(core.detectPushToProtected("git push origin feature/x", "feature/x"), "");
	});

	it("reports the skill or command name for .agents and .opencode skill paths only", () => {
		assert.strictEqual(core.detectSkillChange(".agents/skills/demo/SKILL.md"), "demo");
		assert.strictEqual(core.detectSkillChange(".opencode/commands/demo.md"), "demo.md");
		assert.strictEqual(core.detectSkillChange(".agents/rules/ai-code.md"), null);
	});

	it("warns on an asset filename that is not lowercase with underscores", () => {
		const root = newProject();
		const result = core.validateAssetPath(root, "assets/Bad Name.png");
		assert.strictEqual(result.warnings.length, 1);
		assert.match(result.warnings[0], /NAMING: assets\/Bad Name\.png must be lowercase/);
		assert.deepStrictEqual(result.errors, []);
	});

	it("ignores paths outside assets/", () => {
		const root = newProject();
		assert.deepStrictEqual(core.validateAssetPath(root, "src/Thing.gd"), { warnings: [], errors: [] });
	});
});

describe("core: edited paths (Pi write/edit and omp hashline edit)", () => {
	it("reads the path argument of write and edit", () => {
		assert.deepStrictEqual(core.editedPaths("write", { path: "a.md" }), ["a.md"]);
		assert.deepStrictEqual(core.editedPaths("edit", { path: "b.md" }), ["b.md"]);
	});

	it("reads every [PATH#TAG] header from an omp edit and dedupes", () => {
		const input = { input: "[assets/x.json#A1B2]\n+1\n[assets/y.json#C3D4]\n+2\n[assets/x.json#A1B2]\n" };
		assert.deepStrictEqual(core.editedPaths("edit", input), ["assets/x.json", "assets/y.json"]);
	});

	it("returns nothing for tools that do not edit files", () => {
		assert.deepStrictEqual(core.editedPaths("read", { path: "a.md" }), []);
	});
});

describe("core: session context and state archive", () => {
	it("reports a fresh project as NEW PROJECT with no engine, concept, or source", () => {
		const root = newProject();
		const gaps = core.handleDetectGaps(root);
		assert.match(gaps[0], /^NEW PROJECT: No engine configured/);
	});

	it("truncates a long active.md to its first 100 lines in the compaction context", () => {
		const root = newProject();
		const longState = Array.from({ length: 150 }, (_, i) => `line ${i + 1}`).join("\n");
		writeFile(root, "production/session-state/active.md", longState);
		const context = core.buildCompactionContext(root);
		assert.match(context, /\(truncated — 150 total lines, showing first 100\)/);
		assert.ok(context.includes("line 100"));
		assert.ok(!context.includes("line 101\n"));
	});

	it("archives active.md into session-log.md when the session settles", () => {
		const root = newProject();
		writeFile(root, "production/session-state/active.md", "Focus: combat tuning\n");
		core.handleSessionIdle(root);
		const log = fs.readFileSync(path.join(root, "production", "session-logs", "session-log.md"), "utf8");
		assert.match(log, /## Archived Session State: /);
		assert.ok(log.includes("Focus: combat tuning"));
	});
});

describe("extension wiring: commit and push guard (tool_call)", () => {
	it("blocks a commit that stages invalid asset JSON", async () => {
		const root = newProject();
		writeFile(root, "assets/data/bad.json", "{ not json");
		gitIn(root, "add", "assets/data/bad.json");
		const api = loadExtension(root);
		const [result] = await api.emit(
			"tool_call",
			{ toolName: "bash", toolCallId: "t1", input: { command: 'git commit -m "wip"' } },
			{ cwd: root, hasUI: false },
		);
		assert.strictEqual(result.block, true);
		assert.match(result.reason, /assets\/data\/bad\.json is not valid JSON/);
		assert.match(readAudit(root), /Commit blocked: BLOCKED: assets\/data\/bad\.json/);
	});

	it("allows a commit whose staged files pass", async () => {
		const root = newProject();
		writeFile(root, "assets/data/good.json", '{"damage": 3}');
		gitIn(root, "add", "assets/data/good.json");
		const api = loadExtension(root);
		const [result] = await api.emit(
			"tool_call",
			{ toolName: "bash", toolCallId: "t2", input: { command: 'git commit -m "ok"' } },
			{ cwd: root, hasUI: false },
		);
		assert.strictEqual(result, undefined);
	});

	it("warns on a push to a protected branch without blocking it", async () => {
		const root = newProject();
		const api = loadExtension(root);
		const [result] = await api.emit(
			"tool_call",
			{ toolName: "bash", toolCallId: "t3", input: { command: "git push origin main" } },
			{ cwd: root, hasUI: false },
		);
		assert.strictEqual(result, undefined);
		assert.match(readAudit(root), /Push to protected branch 'main' detected\./);
	});

	it("leaves non-git bash commands and non-bash tools alone", async () => {
		const root = newProject();
		const api = loadExtension(root);
		const [bash] = await api.emit(
			"tool_call",
			{ toolName: "bash", toolCallId: "t4", input: { command: "ls -la" } },
			{ cwd: root, hasUI: false },
		);
		const [read] = await api.emit(
			"tool_call",
			{ toolName: "read", toolCallId: "t5", input: { path: "a.md" } },
			{ cwd: root, hasUI: false },
		);
		assert.strictEqual(bash, undefined);
		assert.strictEqual(read, undefined);
	});
});

describe("extension wiring: asset and skill checks (tool_result)", () => {
	it("appends the asset error to a Pi write result", async () => {
		const root = newProject();
		writeFile(root, "assets/data/broken.json", "{");
		const api = loadExtension(root);
		const [result] = await api.emit(
			"tool_result",
			{
				toolName: "write",
				toolCallId: "r1",
				input: { path: "assets/data/broken.json" },
				content: [{ type: "text", text: "Wrote file" }],
				isError: false,
			},
			{ cwd: root, hasUI: false },
		);
		const texts = result.content.map((block) => block.text);
		assert.strictEqual(texts[0], "Wrote file");
		assert.ok(texts.includes("Asset validation failed. Fix errors before proceeding."));
		assert.ok(texts.includes("FORMAT: assets/data/broken.json is not valid JSON"));
	});

	it("appends the asset error to an omp hashline edit result", async () => {
		const root = newProject();
		writeFile(root, "assets/data/broken.json", "{");
		const api = loadExtension(root);
		const [result] = await api.emit(
			"tool_result",
			{
				toolName: "edit",
				toolCallId: "r2",
				input: { input: "[assets/data/broken.json#AB12]\n+x" },
				content: "Edited",
				isError: false,
			},
			{ cwd: root, hasUI: false },
		);
		const texts = result.content.map((block) => block.text);
		assert.strictEqual(texts[0], "Edited");
		assert.ok(texts.includes("FORMAT: assets/data/broken.json is not valid JSON"));
	});

	it("skips checks when the tool errored", async () => {
		const root = newProject();
		writeFile(root, "assets/data/broken.json", "{");
		const api = loadExtension(root);
		const [result] = await api.emit(
			"tool_result",
			{
				toolName: "write",
				toolCallId: "r3",
				input: { path: "assets/data/broken.json" },
				content: [{ type: "text", text: "failed" }],
				isError: true,
			},
			{ cwd: root, hasUI: false },
		);
		assert.strictEqual(result, undefined);
	});

	it("audits a modified skill and advises /skill-test", async () => {
		const root = newProject();
		const api = loadExtension(root);
		const [result] = await api.emit(
			"tool_result",
			{
				toolName: "write",
				toolCallId: "r4",
				input: { path: ".agents/skills/demo/SKILL.md" },
				content: [{ type: "text", text: "ok" }],
				isError: false,
			},
			{ cwd: root, hasUI: false },
		);
		assert.strictEqual(result, undefined);
		const audit = readAudit(root);
		assert.match(audit, /=== Skill Modified: demo ===/);
		assert.match(audit, /Run \/skill-test static demo/);
	});
});

describe("extension wiring: subagents and session lifecycle", () => {
	it("logs a task invocation on start and completion", async () => {
		const root = newProject();
		const api = loadExtension(root);
		await api.emit(
			"tool_call",
			{ toolName: "task", toolCallId: "s1", input: { agent: "explore" } },
			{ cwd: root, hasUI: false },
		);
		await api.emit(
			"tool_result",
			{ toolName: "task", toolCallId: "s1", input: { agent: "explore" }, content: [], isError: false },
			{ cwd: root, hasUI: false },
		);
		const audit = readAudit(root);
		assert.match(audit, /Agent invoked: explore/);
		assert.match(audit, /Agent completed: explore/);
	});

	it("runs the session-start checks for the main session", async () => {
		const root = newProject();
		const api = loadExtension(root);
		await api.emit("session_start", { type: "session_start", reason: "startup" }, { cwd: root, hasUI: false });
		const audit = readAudit(root);
		assert.match(audit, /session\.created fired/);
		assert.match(audit, /NEW PROJECT/);
	});

	it("skips the session-start checks inside a subagent session", async () => {
		const root = newProject();
		const api = loadExtension(root);
		await api.emit(
			"session_start",
			{ type: "session_start" },
			{ cwd: root, hasUI: false, agent: { kind: "sub" } },
		);
		assert.doesNotMatch(readAudit(root), /session\.created fired/);
	});

	it("archives session state when the session stops (omp session_stop)", async () => {
		const root = newProject();
		writeFile(root, "production/session-state/active.md", "Focus: economy pass\n");
		const api = loadExtension(root);
		await api.emit("session_stop", {}, { cwd: root, hasUI: false });
		const log = fs.readFileSync(path.join(root, "production", "session-logs", "session-log.md"), "utf8");
		assert.ok(log.includes("Focus: economy pass"));
	});

	it("logs the compaction event before compaction", async () => {
		const root = newProject();
		const api = loadExtension(root);
		await api.emit("session_before_compact", { type: "session_before_compact" }, { cwd: root, hasUI: false });
		const log = fs.readFileSync(path.join(root, "production", "session-logs", "compaction-log.txt"), "utf8");
		assert.match(log, /Context compaction occurred at /);
	});

	it("injects the session context once compaction completes", async () => {
		const root = newProject();
		writeFile(root, "production/session-state/active.md", "Focus: boss fight\n");
		const api = loadExtension(root);
		await api.emit("session_compact", { type: "session_compact" }, { cwd: root, hasUI: false });
		assert.strictEqual(api.sent.length, 1);
		assert.strictEqual(api.sent[0].customType, "ocgs-compaction-context");
		assert.strictEqual(api.sent[0].display, false);
		assert.ok(api.sent[0].content.includes("SESSION STATE BEFORE COMPACTION"));
		assert.ok(api.sent[0].content.includes("Focus: boss fight"));
	});

	it("does not inject compaction context into a subagent session", async () => {
		const root = newProject();
		const api = loadExtension(root);
		await api.emit("session_compact", { type: "session_compact" }, { cwd: root, hasUI: false, agent: { kind: "sub" } });
		assert.strictEqual(api.sent.length, 0);
	});
});

describe("extension wiring: compaction context on omp and Pi", () => {
	it("returns the session context to omp's session.compacting so it enters the summary", async () => {
		const root = newProject();
		writeFile(root, "production/session-state/active.md", "Focus: raid balance\n");
		const api = loadExtension(root);
		const [result] = await api.emit(
			"session.compacting",
			{ sessionId: "s", messages: [] },
			{ cwd: root, hasUI: false },
		);
		assert.strictEqual(result.context.length, 1);
		assert.ok(result.context[0].includes("SESSION STATE BEFORE COMPACTION"));
		assert.ok(result.context[0].includes("Focus: raid balance"));
	});

	it("does not send the context a second time when omp already injected it", async () => {
		const root = newProject();
		const api = loadExtension(root);
		await api.emit("session.compacting", { sessionId: "s", messages: [] }, { cwd: root, hasUI: false });
		await api.emit("session_compact", { type: "session_compact" }, { cwd: root, hasUI: false });
		assert.strictEqual(api.sent.length, 0);
	});

	it("resets the guard so a later Pi-style compaction still sends the context", async () => {
		const root = newProject();
		const api = loadExtension(root);
		await api.emit("session.compacting", { sessionId: "s", messages: [] }, { cwd: root, hasUI: false });
		await api.emit("session_compact", { type: "session_compact" }, { cwd: root, hasUI: false });
		await api.emit("session_compact", { type: "session_compact" }, { cwd: root, hasUI: false });
		assert.strictEqual(api.sent.length, 1);
		assert.strictEqual(api.sent[0].customType, "ocgs-compaction-context");
	});

	it("does not return compaction context to a subagent's session.compacting", async () => {
		const root = newProject();
		const api = loadExtension(root);
		const [result] = await api.emit(
			"session.compacting",
			{ sessionId: "s", messages: [] },
			{ cwd: root, hasUI: false, agent: { kind: "sub" } },
		);
		assert.strictEqual(result, undefined);
	});
});

describe("regression: a subagent stop must not archive the parent's session state", () => {
	it("does not write session-log.md when a subagent session stops (omp session_stop)", async () => {
		const root = newProject();
		writeFile(root, "production/session-state/active.md", "Focus: parent session\n");
		const api = loadExtension(root);
		await api.emit("session_stop", {}, { cwd: root, hasUI: false, agent: { kind: "sub" } });
		assert.strictEqual(fs.existsSync(path.join(root, "production", "session-logs", "session-log.md")), false);
	});

	it("does not write session-log.md when a subagent session settles (Pi agent_settled)", async () => {
		const root = newProject();
		writeFile(root, "production/session-state/active.md", "Focus: parent session\n");
		const api = loadExtension(root);
		await api.emit("agent_settled", {}, { cwd: root, hasUI: false, agent: { kind: "sub" } });
		assert.strictEqual(fs.existsSync(path.join(root, "production", "session-logs", "session-log.md")), false);
	});
});
