import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/**
 * Injects a short harness-specific tool map into the system prompt.
 *
 * OCGS skills and commands are written in OpenCode's tool vocabulary
 * (`Task`, `question`, `/consult`). Pi and omp expose different names, or
 * none at all. Rather than rewriting canonical content, this extension tells
 * the model how to translate the names at run time.
 *
 * Harness detection matches `ocgs-path-guard`: Pi passes `systemPrompt` as a
 * string; omp passes `string[]` and expects `string[]` back.
 */

const MARKER = "<!-- ocgs-tool-map:v1 -->";

const OMP_MAP = `${MARKER}
## OCGS Harness Tool Map

OCGS workflows use OpenCode tool names. In oh-my-pi:

- \`Task\` / \`subagent_type\` → call \`task\`. Agent names come from \`.omp/agents/\`.
- \`question\` → call \`ask\`.
- \`/consult\` → no equivalent. Skip peer review and say so.

Do not call \`Task\` or \`question\` literally; prefer \`task\` and \`ask\`, which are active here.`;

const PI_MAP = `${MARKER}
## OCGS Harness Tool Map

OCGS workflows use OpenCode tool names. In Pi:

- \`Task\` / \`subagent_type\` → no delegation tool is available. Do the work directly and say delegation is unavailable. Never claim to have delegated.
- \`question\` → call \`question\` if it is registered; otherwise ask in plain text and wait.
- \`/consult\` → no equivalent. Skip peer review and say so.`;

export default function (pi: ExtensionAPI) {
	pi.on("before_agent_start", async (event) => {
		// Pi types systemPrompt as string; omp passes string[]. Handle both.
		const systemPrompt: unknown = event.systemPrompt;

		if (Array.isArray(systemPrompt)) {
			if (systemPrompt.some((part) => String(part).includes(MARKER))) return;
			return {
				systemPrompt: [...systemPrompt, OMP_MAP],
			};
		}

		const base = typeof systemPrompt === "string" ? systemPrompt : "";
		if (base.includes(MARKER)) return;

		return {
			...event,
			systemPrompt: base ? `${base}\n\n${PI_MAP}` : PI_MAP,
		};
	});
}
