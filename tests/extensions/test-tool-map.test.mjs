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
const pathGuardModulePath = path.join(
	process.cwd(),
	".pi",
	"extensions",
	"ocgs-path-guard",
	"index.ts",
);

let factory;
let pathGuardFactory;

before(async () => {
	factory = (await import(pathToFileURL(modulePath).href)).default;
	pathGuardFactory = (await import(pathToFileURL(pathGuardModulePath).href))
		.default;
});

async function inject(input) {
	const pi = createFakeExtensionApi();
	factory(pi);
	const event =
		typeof input === "string" || Array.isArray(input)
			? { type: "before_agent_start", prompt: "continue", systemPrompt: input }
			: { type: "before_agent_start", prompt: "continue", ...input };
	const [result] = await pi.emit("before_agent_start", event, {
		hasUI: false,
	});
	return result;
}

// Mirrors .omp/config.yml: path-guard registers before tool-map, and both
// handlers append to the same system prompt on every turn.
async function composeTurn(systemPrompt, extras = {}) {
	const pi = createFakeExtensionApi();
	pathGuardFactory(pi);
	factory(pi);

	await pi.emit(
		"tool_call",
		{
			type: "tool_call",
			toolName: "edit",
			toolCallId: "t1",
			input: { path: "src/ai/x.gd" },
		},
		{ hasUI: false },
	);

	return pi.emitChained(
		"before_agent_start",
		{ type: "before_agent_start", prompt: "continue", ...extras, systemPrompt },
		{ hasUI: false },
	);
}

describe("ocgs-tool-map", () => {
	it("Pi string prompt names the delegation gap and preserves the prompt", async () => {
		const result = await inject("BASE PROMPT");
		const text = result.systemPrompt;

		assert.ok(text.startsWith("BASE PROMPT"));
		assert.ok(text.includes("<!-- ocgs-tool-map:v1 -->"));
		assert.ok(text.includes("no `Task` tool is available here"));
		assert.ok(text.includes("If another delegation tool is installed"));
		assert.ok(text.includes("Never claim to have delegated"));
		assert.ok(text.includes("`/consult`"));
		assert.ok(!text.includes("call `task`"));
	});

	it("omp array prompt maps Task to task, including its required fields", async () => {
		const result = await inject(["BASE PROMPT"]);

		assert.ok(Array.isArray(result.systemPrompt));
		assert.strictEqual(result.systemPrompt[0], "BASE PROMPT");
		assert.strictEqual(result.systemPrompt.length, 2);

		const text = result.systemPrompt[1];
		assert.ok(text.includes("<!-- ocgs-tool-map:v1 -->"));
		assert.ok(text.includes("call `task`"));
		assert.ok(text.includes("Pass the agent name as `agent`"));
		assert.ok(text.includes("Pass the prompt as `task`"));
		assert.ok(text.includes("`solutionSpace`"));
		assert.ok(text.includes("both fields are required"));
		assert.ok(text.includes("There is no `prompt` field"));
		assert.ok(text.includes("call `ask`"));
		assert.ok(text.includes("`.omp/agents/`"));
		assert.ok(!text.includes("no `Task` tool is available here"));
	});

	it("harness markers win over the prompt shape", async () => {
		const ompResult = await inject({ reason: "prompt", systemPrompt: "BASE" });
		assert.ok(Array.isArray(ompResult.systemPrompt));
		assert.strictEqual(ompResult.systemPrompt[0], "BASE");
		assert.ok(ompResult.systemPrompt.join("\n").includes("`solutionSpace`"));

		const piResult = await inject({
			systemPromptOptions: {},
			systemPrompt: "BASE",
		});
		assert.strictEqual(typeof piResult.systemPrompt, "string");
		assert.ok(piResult.systemPrompt.startsWith("BASE"));
		assert.ok(piResult.systemPrompt.includes("no `Task` tool is available here"));
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

	it("composes with ocgs-path-guard on the omp array shape", async () => {
		const event = await composeTurn(["BASE"], { reason: "prompt" });
		const parts = event.systemPrompt;

		assert.ok(Array.isArray(parts));
		assert.strictEqual(parts[0], "BASE");
		assert.ok(parts.some((part) => part.includes('name="ai-code"')));
		assert.ok(parts.some((part) => part.includes("ocgs-tool-map:v1")));
		assert.strictEqual(
			parts.filter((part) => part.includes("ocgs-tool-map:v1")).length,
			1,
		);
		assert.ok(
			parts.findIndex((part) => part.includes('name="ai-code"')) <
				parts.findIndex((part) => part.includes("ocgs-tool-map:v1")),
		);
	});

	it("composes with ocgs-path-guard on the Pi string shape", async () => {
		const event = await composeTurn("BASE", { systemPromptOptions: {} });
		const text = event.systemPrompt;

		assert.strictEqual(typeof text, "string");
		assert.ok(text.startsWith("BASE"));
		assert.ok(text.includes('name="ai-code"'));
		assert.ok(text.includes("ocgs-tool-map:v1"));
		assert.ok(text.indexOf('name="ai-code"') < text.indexOf("ocgs-tool-map:v1"));
	});
});
