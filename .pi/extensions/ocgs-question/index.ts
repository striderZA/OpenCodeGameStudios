/**
 * Question Tool - Strategic decision with options
 * Full custom UI: numbered options list with descriptions + inline editor for custom input
 * Escape in editor returns to options, Escape in options cancels
 * Logs all decisions to production/session-logs/agent-decisions.jsonl
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
	Editor,
	type EditorTheme,
	Key,
	matchesKey,
	Text,
	visibleWidth,
	wrapTextWithAnsi,
} from "@earendil-works/pi-tui";
import { Type } from "typebox";
import fs from "node:fs";
import path from "node:path";

const DECISIONS_LOG = path.resolve(
	process.cwd(),
	"production",
	"session-logs",
	"agent-decisions.jsonl",
);

function logDecision(entry: Record<string, unknown>) {
	const dir = path.dirname(DECISIONS_LOG);
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
	fs.appendFileSync(
		DECISIONS_LOG,
		JSON.stringify({ ...entry, ts: Date.now() }) + "\n",
	);
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface OptionWithDesc {
	label: string;
	description?: string;
}

type DisplayOption = OptionWithDesc & { isOther?: boolean };

interface QuestionDetails {
	question: string;
	options: string[];
	answer: string | null;
	wasCustom?: boolean;
	header?: string;
	pending?: boolean;
}

// ─── Schema ─────────────────────────────────────────────────────────────────

const OptionSchema = Type.Object({
	label: Type.String({
		description: "Display label for the option (1-5 words)",
	}),
	description: Type.Optional(
		Type.String({ description: "One-sentence trade-off shown below label" }),
	),
});

const QuestionParams = Type.Object({
	question: Type.String({ description: "The question to ask the user" }),
	options: Type.Array(OptionSchema, { minItems: 2, maxItems: 4 }),
	header: Type.Optional(
		Type.String({ description: "Optional short header (e.g. 'CD-PILLARS')" }),
	),
});

// ─── Extension ──────────────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "question",
		label: "Question",
		description:
			"Present a strategic decision to the user. Write your full analysis in conversation first, then call this tool with concise options. The user picks one or types a custom answer. Use for any decision point where you need user input to proceed.",
		promptSnippet:
			"Present a strategic decision with options and capture the user's choice",
		promptGuidelines: [
			"Use the question tool when you need the user to make a strategic choice between 2-4 options.",
			"ALWAYS write your full reasoning in conversation text BEFORE calling the question tool — explain the trade-offs, your recommendation, and why.",
			"Add '(Recommended)' to your preferred option's label.",
			"Labels: 1-5 words. Descriptions: 1 sentence with the key trade-off.",
			"Do NOT use the question tool for yes/no questions or open-ended input.",
		],
		parameters: QuestionParams,

		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			// ── Non-TUI fallback ────────────────────────────────────────────────
			if (ctx.mode !== "tui") {
				return {
					content: [
						{
							type: "text",
							text: `Question (${ctx.mode} mode): ${params.question}\nOptions: ${params.options.map((o) => o.label).join(", ")}`,
						},
					],
					details: {
						question: params.question,
						options: params.options.map((o) => o.label),
						answer: null,
						pending: true,
					} as QuestionDetails,
				};
			}

			// ── Guard: no options ──────────────────────────────────────────────
			if (params.options.length === 0) {
				return {
					content: [{ type: "text", text: "Error: No options provided" }],
					details: {
						question: params.question,
						options: [],
						answer: null,
					} as QuestionDetails,
				};
			}

			// ── Build display options ──────────────────────────────────────────
			const allOptions: DisplayOption[] = [
				...params.options,
				{ label: "Type something.", isOther: true },
			];

			// ── Show custom UI ─────────────────────────────────────────────────
			const result = await ctx.ui.custom<{
				answer: string;
				wasCustom: boolean;
				index?: number;
			} | null>((tui, theme, _kb, done) => {
				let optionIndex = 0;
				let editMode = false;
				let cachedLines: string[] | undefined;

				const editorTheme: EditorTheme = {
					borderColor: (s) => theme.fg("accent", s),
					selectList: {
						selectedPrefix: (t) => theme.fg("accent", t),
						selectedText: (t) => theme.fg("accent", t),
						description: (t) => theme.fg("muted", t),
						scrollInfo: (t) => theme.fg("dim", t),
						noMatch: (t) => theme.fg("warning", t),
					},
				};
				const editor = new Editor(tui, editorTheme);

				editor.onSubmit = (value) => {
					const trimmed = value.trim();
					if (trimmed) {
						done({ answer: trimmed, wasCustom: true });
					} else {
						editMode = false;
						editor.setText("");
						refresh();
					}
				};

				function refresh() {
					cachedLines = undefined;
					tui.requestRender();
				}

				// ── Input handling ───────────────────────────────────────────
				function handleInput(data: string) {
					if (editMode) {
						if (matchesKey(data, Key.escape)) {
							editMode = false;
							editor.setText("");
							refresh();
							return;
						}
						editor.handleInput(data);
						refresh();
						return;
					}

					if (matchesKey(data, Key.up)) {
						optionIndex = Math.max(0, optionIndex - 1);
						refresh();
						return;
					}
					if (matchesKey(data, Key.down)) {
						optionIndex = Math.min(allOptions.length - 1, optionIndex + 1);
						refresh();
						return;
					}

					if (matchesKey(data, Key.enter)) {
						const selected = allOptions[optionIndex];
						if (selected.isOther) {
							editMode = true;
							refresh();
						} else {
							done({
								answer: selected.label,
								wasCustom: false,
								index: optionIndex + 1,
							});
						}
						return;
					}

					if (matchesKey(data, Key.escape)) {
						done(null);
					}
				}

				// ── Render ──────────────────────────────────────────────────
				function render(width: number): string[] {
					if (cachedLines) return cachedLines;

					const lines: string[] = [];
					const renderWidth = Math.max(1, width);

					function addWrapped(text: string) {
						lines.push(...wrapTextWithAnsi(text, renderWidth));
					}

					function addWrappedWithPrefix(prefix: string, text: string) {
						const prefixWidth = visibleWidth(prefix);
						if (prefixWidth >= renderWidth) {
							addWrapped(prefix + text);
							return;
						}
						const wrapped = wrapTextWithAnsi(text, renderWidth - prefixWidth);
						const continuationPrefix = " ".repeat(prefixWidth);
						for (let i = 0; i < wrapped.length; i++) {
							lines.push(
								`${i === 0 ? prefix : continuationPrefix}${wrapped[i]}`,
							);
						}
					}

					// Header line
					lines.push(theme.fg("accent", "─".repeat(renderWidth)));

					// Optional header badge
					if (params.header) {
						addWrappedWithPrefix(" ", theme.fg("accent", params.header));
					}

					// Question
					addWrappedWithPrefix(" ", theme.fg("text", params.question));
					lines.push("");

					// Options
					for (let i = 0; i < allOptions.length; i++) {
						const opt = allOptions[i];
						const selected = i === optionIndex;
						const isOther = opt.isOther === true;
						const prefix = selected ? theme.fg("accent", "> ") : "  ";
						const label = `${i + 1}. ${opt.label}${isOther && editMode ? " ✎" : ""}`;
						const color = selected || (isOther && editMode) ? "accent" : "text";

						addWrappedWithPrefix(prefix, theme.fg(color, label));

						// Description
						if (opt.description) {
							addWrappedWithPrefix("     ", theme.fg("muted", opt.description));
						}
					}

					// Edit mode: inline text editor
					if (editMode) {
						lines.push("");
						addWrappedWithPrefix(" ", theme.fg("muted", "Your answer:"));
						for (const line of editor.render(Math.max(1, renderWidth - 2))) {
							lines.push(` ${line}`);
						}
					}

					// Footer hints
					lines.push("");
					if (editMode) {
						addWrappedWithPrefix(
							" ",
							theme.fg("dim", "Enter to submit • Esc to go back"),
						);
					} else {
						addWrappedWithPrefix(
							" ",
							theme.fg("dim", "↑↓ navigate • Enter to select • Esc to cancel"),
						);
					}
					lines.push(theme.fg("accent", "─".repeat(renderWidth)));

					cachedLines = lines;
					return lines;
				}

				return {
					render,
					invalidate: () => {
						cachedLines = undefined;
					},
					handleInput,
				};
			});

			// ── Process result ──────────────────────────────────────────────
			const simpleOptions = params.options.map((o: OptionWithDesc) => o.label);

			if (!result) {
				logDecision({
					question: params.question,
					header: params.header,
					options: simpleOptions,
					answer: "(cancelled)",
					wasCustom: false,
				});

				return {
					content: [{ type: "text", text: "User cancelled the selection" }],
					details: {
						question: params.question,
						header: params.header,
						options: simpleOptions,
						answer: null,
					} as QuestionDetails,
				};
			}

			logDecision({
				question: params.question,
				header: params.header,
				options: simpleOptions,
				answer: result.answer,
				wasCustom: result.wasCustom,
			});

			if (result.wasCustom) {
				return {
					content: [{ type: "text", text: `User wrote: ${result.answer}` }],
					details: {
						question: params.question,
						header: params.header,
						options: simpleOptions,
						answer: result.answer,
						wasCustom: true,
					} as QuestionDetails,
				};
			}

			return {
				content: [
					{
						type: "text",
						text: `User selected: ${result.index}. ${result.answer}`,
					},
				],
				details: {
					question: params.question,
					header: params.header,
					options: simpleOptions,
					answer: result.answer,
					wasCustom: false,
				} as QuestionDetails,
			};
		},

		renderCall(args, theme, _context) {
			let text =
				theme.fg("toolTitle", theme.bold("question ")) +
				theme.fg("muted", args.question);
			const opts: OptionWithDesc[] = Array.isArray(args.options)
				? args.options
				: [];
			if (opts.length) {
				const labels = opts.map((o: OptionWithDesc) => o.label);
				const numbered = [...labels, "Type something."].map(
					(o, i) => `${i + 1}. ${o}`,
				);
				text += `\n${theme.fg("dim", `  Options: ${numbered.join(", ")}`)}`;
			}
			return new Text(text, 0, 0);
		},

		renderResult(result, _options, theme, _context) {
			const details = result.details as QuestionDetails | undefined;
			if (!details) {
				const text = result.content[0];
				return new Text(text?.type === "text" ? text.text : "", 0, 0);
			}

			if (details.answer === null) {
				return new Text(theme.fg("warning", "Cancelled"), 0, 0);
			}

			if (details.wasCustom) {
				return new Text(
					theme.fg("success", "✓ ") +
						theme.fg("muted", "(wrote) ") +
						theme.fg("accent", details.answer),
					0,
					0,
				);
			}
			const idx = details.options.indexOf(details.answer) + 1;
			const display = idx > 0 ? `${idx}. ${details.answer}` : details.answer;
			return new Text(
				theme.fg("success", "✓ ") + theme.fg("accent", display),
				0,
				0,
			);
		},
	});
}
