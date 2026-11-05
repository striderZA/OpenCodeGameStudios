import { describe, it, before } from "node:test";
import assert from "node:assert";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createFakeExtensionApi } from "./support/fake-extension-api.mjs";

const modulePath = path.join(
	process.cwd(),
	".pi",
	"extensions",
	"ocgs-tool-map",
	"index.ts",
);

let factory;

before(async () => {
	factory = (await import(pathToFileURL(modulePath).href)).default;
});

async function inject(systemPrompt) {
	const pi = createFakeExtensionApi();
	factory(pi);
	const [result] = await pi.emit(
		"before_agent_start",
		{ type: "before_agent_start", prompt: "continue", systemPrompt },
		{ hasUI: false },
	);
	return result;
}

describe("ocgs-tool-map", () => {
	it("Pi string prompt names the delegation gap and preserves the prompt", async () => {
		const result = await inject("BASE PROMPT");
		const text = result.systemPrompt;

		assert.ok(text.startsWith("BASE PROMPT"));
		assert.ok(text.includes("<!-- ocgs-tool-map:v1 -->"));
		assert.ok(text.includes("no delegation tool is available"));
		assert.ok(text.includes("Never claim to have delegated"));
		assert.ok(text.includes("`/consult`"));
		assert.ok(!text.includes("call `task`"));
	});

	it("omp array prompt maps Task to task and question to ask", async () => {
		const result = await inject(["BASE PROMPT"]);

		assert.ok(Array.isArray(result.systemPrompt));
		assert.strictEqual(result.systemPrompt[0], "BASE PROMPT");
		assert.strictEqual(result.systemPrompt.length, 2);

		const text = result.systemPrompt[1];
		assert.ok(text.includes("<!-- ocgs-tool-map:v1 -->"));
		assert.ok(text.includes("call `task`"));
		assert.ok(text.includes("call `ask`"));
		assert.ok(text.includes("`.omp/agents/`"));
		assert.ok(!text.includes("no delegation tool is available"));
	});

	it("does not inject a second time on either prompt shape", async () => {
		const piFirst = await inject("BASE PROMPT");
		const piSecond = await inject(piFirst.systemPrompt);
		assert.strictEqual(piSecond, undefined);

		const ompFirst = await inject(["BASE PROMPT"]);
		const ompSecond = await inject(ompFirst.systemPrompt);
		assert.strictEqual(ompSecond, undefined);
	});

	it("handles an empty Pi prompt without a leading separator", async () => {
		const result = await inject("");
		assert.ok(result.systemPrompt.startsWith("<!-- ocgs-tool-map:v1 -->"));
	});
});
