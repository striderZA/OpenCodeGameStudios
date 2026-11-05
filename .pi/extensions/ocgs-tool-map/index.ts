import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/**
 * Injects a short harness-specific tool map into the system prompt.
 *
 * OCGS skills and commands are written in OpenCode's tool vocabulary
 * (`Task`, `question`, `/consult`). Pi and omp expose different names, or
 * none at all. Rather than rewriting canonical content, this extension tells
 * the model how to translate the names at run time.
 *
 * Detect the harness from event markers first: Pi 1.5.0 sends
 * `systemPromptOptions`, omp sends `reason`. The prompt shape (Pi string,
 * omp `string[]`) remains the fallback for older Pi versions.
 */

const MARKER = "<!-- ocgs-tool-map:v1 -->";

const OMP_MAP = `${MARKER}
## OCGS Harness Tool Map

OCGS workflows use OpenCode tool names. In oh-my-pi:

- \`Task\` / \`subagent_type\` → call \`task\`. Pass the agent name as \`agent\`; names come from \`.omp/agents/\`.
- Pass the prompt as \`task\` and describe how open-ended the work is in \`solutionSpace\`; both fields are required. There is no \`prompt\` field.
- \`question\` → call \`ask\`.
- \`/consult\` → no equivalent. Skip peer review and say so.

Do not call \`Task\` or \`question\` literally; prefer \`task\` and \`ask\`.`;

const PI_MAP = `${MARKER}
## OCGS Harness Tool Map

OCGS workflows use OpenCode tool names. In Pi:

- \`Task\` / \`subagent_type\` → no \`Task\` tool is available here. If another delegation tool is installed, use it; otherwise do the work directly and say delegation is unavailable. Never claim to have delegated.
- \`question\` → call \`question\` if it is registered; otherwise ask in plain text and wait.
- \`/consult\` → no equivalent. Skip peer review and say so.`;

export default function (pi: ExtensionAPI) {
	pi.on("before_agent_start", async (event) => {
		const raw = event as unknown as Record<string, unknown>;
		const systemPrompt = raw.systemPrompt;

		// Pi 1.5.0 carries systemPromptOptions; omp carries reason. Fall back to
		// the prompt shape for older Pi versions and for hand-built events.
		const isPi =
			raw.systemPromptOptions !== undefined ||
			(raw.reason === undefined && typeof systemPrompt === "string");

		if (isPi) {
			const base = Array.isArray(systemPrompt)
				? systemPrompt.join("\n\n")
				: typeof systemPrompt === "string"
					? systemPrompt
					: "";
			if (base.includes(MARKER)) return;
			return {
				...event,
				systemPrompt: base ? `${base}\n\n${PI_MAP}` : PI_MAP,
			};
		}

		const parts = Array.isArray(systemPrompt)
			? systemPrompt
			: typeof systemPrompt === "string" && systemPrompt
				? [systemPrompt]
				: [];
		if (parts.some((part) => String(part).includes(MARKER))) return;

		return {
			systemPrompt: [...parts, OMP_MAP],
		};
	});
}
