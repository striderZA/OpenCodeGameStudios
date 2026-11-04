import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createFakeExtensionApi } from "./support/fake-extension-api.mjs";

const repoRoot = process.cwd();
const modulePath = path.join(repoRoot, ".pi", "extensions", "ocgs-path-guard", "index.ts");

const RULE = `---
paths:
  - "src/ai/**"
---

# AI Code Rules

- Keep AI updates staggered.
`;

let fixtureDir;
let factory;

before(async () => {
	fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "ocgs-pathguard-"));
	fs.mkdirSync(path.join(fixtureDir, ".agents", "rules"), { recursive: true });
	fs.writeFileSync(path.join(fixtureDir, ".agents", "rules", "ai-code.md"), RULE);
	// path-guard resolves .agents/rules from process.cwd() at import time.
	process.chdir(fixtureDir);
	factory = (await import(pathToFileURL(modulePath).href)).default;
});

after(() => {
	process.chdir(repoRoot);
	fs.rmSync(fixtureDir, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
});

// One turn: the tool calls are tracked first, then before_agent_start decides injection.
// Each call gets a fresh API so the in-memory recentPaths list starts empty.
async function runTurn(toolEvents, systemPrompt) {
	const pi = createFakeExtensionApi();
	factory(pi);
	for (const event of toolEvents) {
		await pi.emit("tool_call", event, { hasUI: false });
	}
	const [result] = await pi.emit(
		"before_agent_start",
		{ type: "before_agent_start", prompt: "continue", systemPrompt },
		{ hasUI: false },
	);
	return result;
}

const edit = input => ({ type: "tool_call", toolName: "edit", toolCallId: "t1", input });
const mentionsAiRule = text => typeof text === "string" && text.includes('name="ai-code"');

describe("ocgs-path-guard contract against real module", () => {
	it("(a) Pi shape: an edit under src/ai injects ai-code into a string systemPrompt", async () => {
		const result = await runTurn([edit({ path: "src/ai/x.gd" })], "BASE");
		assert.strictEqual(typeof result.systemPrompt, "string");
		assert.ok(result.systemPrompt.startsWith("BASE"));
		assert.ok(mentionsAiRule(result.systemPrompt));
	});

	it("(b) omp shape: an array systemPrompt gets the rule block as a new element", async () => {
		const result = await runTurn([edit({ path: "src/ai/x.gd" })], ["BASE"]);
		assert.ok(Array.isArray(result.systemPrompt), "omp expects string[] back");
		assert.strictEqual(result.systemPrompt[0], "BASE");
		assert.ok(result.systemPrompt.some(mentionsAiRule));
	});

	it("(c) a Windows separator path matches the same rule", async () => {
		const result = await runTurn([edit({ path: "src\\ai\\x.gd" })], "BASE");
		assert.ok(mentionsAiRule(result.systemPrompt));
	});

	it("(d1) an edit with no path matches nothing", async () => {
		const result = await runTurn([edit({})], "BASE");
		assert.strictEqual(result, undefined);
	});

	it("(d2) a non-string path neither throws nor matches", async () => {
		await assert.doesNotReject(async () => {
			const result = await runTurn([edit({ path: 42 })], "BASE");
			assert.strictEqual(result, undefined);
		});
	});

	it("(d3) a missing tool input neither throws nor matches", async () => {
		await assert.doesNotReject(async () => {
			const result = await runTurn([edit(undefined)], "BASE");
			assert.strictEqual(result, undefined);
		});
	});

	it("(e) omp hashline edit: the [PATH#TAG] header names the file being edited", async () => {
		const result = await runTurn([edit({ input: "[src/ai/x.gd#1A2B]\nPUT 1.=1:\n+x" })], "BASE");
		assert.ok(mentionsAiRule(result.systemPrompt));
	});
});
