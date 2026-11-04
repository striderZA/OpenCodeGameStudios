import { describe, it } from "node:test";
import assert from "node:assert";
import path from "node:path";
import { pathToFileURL } from "node:url";

const askLogModule = path.join(process.cwd(), ".pi", "extensions", "ocgs-question", "ask-log.ts");
const { askDecisions } = await import(pathToFileURL(askLogModule).href);

describe("omp ask results become agent-decisions entries", () => {
	it("logs a single-select answer with its question, options, and selected label", () => {
		const details = {
			question: "Pick a colour?",
			options: ["Red", "Blue"],
			multi: false,
			selectedOptions: ["Red"],
		};
		assert.deepStrictEqual(askDecisions(details), [
			{
				source: "ask",
				question: "Pick a colour?",
				options: ["Red", "Blue"],
				answer: "Red",
				wasCustom: false,
			},
		]);
	});

	it("logs a custom answer as wasCustom true", () => {
		const details = {
			question: "Name it?",
			options: ["Alpha"],
			multi: false,
			selectedOptions: [],
			customInput: "Delta",
		};
		const [entry] = askDecisions(details);
		assert.strictEqual(entry.answer, "Delta");
		assert.strictEqual(entry.wasCustom, true);
	});

	it("joins multi-select choices and records an empty selection", () => {
		const picked = askDecisions({
			question: "Which?",
			options: ["A", "B", "C"],
			multi: true,
			selectedOptions: ["A", "C"],
		});
		assert.strictEqual(picked[0].answer, "A, C");
		const none = askDecisions({ question: "Which?", options: ["A"], multi: true, selectedOptions: [] });
		assert.strictEqual(none[0].answer, "(none)");
	});

	it("logs each question of a multi-question call in order", () => {
		const details = {
			results: [
				{ id: "a", question: "First?", options: ["X", "Y"], multi: false, selectedOptions: ["Y"] },
				{ id: "b", question: "Second?", options: ["P"], multi: false, selectedOptions: ["P"] },
			],
		};
		const entries = askDecisions(details);
		assert.deepStrictEqual(
			entries.map((e) => [e.question, e.answer]),
			[
				["First?", "Y"],
				["Second?", "P"],
			],
		);
	});

	it("keeps the timeout flag when the answer was auto-selected", () => {
		const [entry] = askDecisions({
			question: "Hurry?",
			options: ["Yes", "No"],
			multi: false,
			selectedOptions: ["Yes"],
			timedOut: true,
		});
		assert.strictEqual(entry.timedOut, true);
	});

	it("logs nothing when the tool produced no structured details", () => {
		assert.deepStrictEqual(askDecisions(undefined), []);
		assert.deepStrictEqual(askDecisions({}), []);
	});
});
