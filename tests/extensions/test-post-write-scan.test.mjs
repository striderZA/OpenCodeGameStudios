import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createFakeExtensionApi } from "./support/fake-extension-api.mjs";

const repoRoot = process.cwd();
const validateModule = path.join(repoRoot, ".pi", "extensions", "ocgs-validate", "index.ts");
const driftModule = path.join(repoRoot, ".pi", "extensions", "ocgs-drift-detector", "index.ts");

// Malformed on purpose: no frontmatter, so validate reports it and drift finds no name/description.
const BAD_SKILL = "# Bad skill with no frontmatter\n\nBody.\n";
const BAD_PATH = ".agents/skills/bad/SKILL.md";

let fixtureDir;
let makeValidate;
let makeDrift;

before(async () => {
	fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "ocgs-postwrite-"));
	fs.mkdirSync(path.join(fixtureDir, ".agents", "skills", "bad"), { recursive: true });
	fs.writeFileSync(path.join(fixtureDir, BAD_PATH), BAD_SKILL);
	// Both modules compute their .agents directory from process.cwd() at import time.
	process.chdir(fixtureDir);
	makeValidate = (await import(pathToFileURL(validateModule).href)).default;
	makeDrift = (await import(pathToFileURL(driftModule).href)).default;
});

after(() => {
	process.chdir(repoRoot);
	fs.rmSync(fixtureDir, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
});

const writeResult = {
	type: "tool_result",
	toolName: "write",
	toolCallId: "w1",
	input: { path: BAD_PATH, content: BAD_SKILL },
	content: [{ type: "text", text: "wrote file" }],
	isError: false,
	details: {},
};

// omp's edit carries no path field; the file is named in a [PATH#TAG] header inside input.input.
const hashlineEditResult = {
	type: "tool_result",
	toolName: "edit",
	toolCallId: "e1",
	input: { input: `[${BAD_PATH}#1A2B]\nPUT 1.=1:\n+x` },
	content: [{ type: "text", text: "edited file" }],
	isError: false,
	details: {},
};

const appendedText = result => result.content.map(block => block.text).join("\n");

describe("post-write checks see the file an edit touched on omp and Pi", () => {
	it("validate reports a malformed .agents file after a write (Pi path, control)", async () => {
		const pi = createFakeExtensionApi();
		makeValidate(pi);
		const [result] = await pi.emit("tool_result", writeResult, { hasUI: false });
		assert.ok(result, "validate returned no tool_result change for a write");
		assert.match(appendedText(result), /Missing YAML frontmatter/);
	});

	it("validate reports the malformed file after an omp hashline edit", async () => {
		const pi = createFakeExtensionApi();
		makeValidate(pi);
		const [result] = await pi.emit("tool_result", hashlineEditResult, { hasUI: false });
		assert.ok(result, "validate ignored an edit whose path is in a hashline header");
		assert.match(appendedText(result), /Missing YAML frontmatter/);
	});

	it("validate tolerates an edit with no input", async () => {
		const pi = createFakeExtensionApi();
		makeValidate(pi);
		await assert.doesNotReject(() =>
			pi.emit("tool_result", { ...hashlineEditResult, input: undefined }, { hasUI: false }),
		);
	});

	it("drift reports a malformed .agents file after a write (Pi path, control)", async () => {
		const pi = createFakeExtensionApi();
		makeDrift(pi);
		const [result] = await pi.emit("tool_result", writeResult, { hasUI: true, ui: { setStatus() {} } });
		assert.ok(result, "drift returned no tool_result change for a write");
		assert.match(appendedText(result), /missing required frontmatter field: name/);
	});

	it("drift reports the malformed file after an omp hashline edit", async () => {
		const pi = createFakeExtensionApi();
		makeDrift(pi);
		const [result] = await pi.emit("tool_result", hashlineEditResult, { hasUI: true, ui: { setStatus() {} } });
		assert.ok(result, "drift ignored an edit whose path is in a hashline header");
		assert.match(appendedText(result), /missing required frontmatter field: name/);
	});
});
