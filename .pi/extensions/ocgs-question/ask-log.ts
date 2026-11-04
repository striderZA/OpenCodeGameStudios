/**
 * Maps oh-my-pi `ask` tool results to agent-decisions.jsonl entries.
 *
 * omp's built-in `ask` is the native equivalent of the `question` tool. It never
 * writes a decision log, so ocgs-question records its answers here.
 *
 * Pure: no runtime imports, so tests can load it without the TUI packages.
 */

export interface AskDecision {
	source: "ask";
	question: string;
	options: string[];
	answer: string;
	wasCustom: boolean;
	timedOut?: true;
}

interface AskItem {
	question?: unknown;
	options?: unknown;
	selectedOptions?: unknown;
	customInput?: unknown;
	timedOut?: unknown;
}

function optionLabels(options: unknown): string[] {
	if (!Array.isArray(options)) return [];
	return options.map((o) =>
		typeof o === "string" ? o : String((o as { label?: unknown } | null)?.label ?? ""),
	);
}

function toDecision(item: AskItem): AskDecision {
	const selected = Array.isArray(item.selectedOptions) ? item.selectedOptions.map(String) : [];
	const custom = typeof item.customInput === "string" && item.customInput.length > 0 ? item.customInput : undefined;
	const parts = custom === undefined ? selected : [...selected, custom];
	const decision: AskDecision = {
		source: "ask",
		question: String(item.question ?? ""),
		options: optionLabels(item.options),
		answer: parts.length > 0 ? parts.join(", ") : "(none)",
		wasCustom: custom !== undefined,
	};
	if (item.timedOut === true) decision.timedOut = true;
	return decision;
}

/** Decisions for one ask call: one per question for multi-question results, otherwise one. */
export function askDecisions(details: unknown): AskDecision[] {
	if (!details || typeof details !== "object") return [];
	const d = details as AskItem & { results?: unknown };
	if (Array.isArray(d.results)) return d.results.map((r) => toDecision(r as AskItem));
	if (d.question === undefined) return [];
	return [toDecision(d)];
}
