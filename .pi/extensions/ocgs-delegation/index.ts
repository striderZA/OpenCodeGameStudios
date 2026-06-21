import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { StringEnum } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import path from "node:path";
import fs from "node:fs";

const AGENTS_DIR = path.resolve(process.cwd(), ".agents", "agents");

function loadAgentNames(): string[] {
	if (!fs.existsSync(AGENTS_DIR)) return [];
	const names: string[] = [];
	for (const file of fs.readdirSync(AGENTS_DIR)) {
		if (file.endsWith(".md")) {
			const name = file.replace(/\.md$/, "");
			names.push(name);
		}
	}
	return names.sort();
}

function loadSystemPrompt(agentName: string): string {
	const filePath = path.join(AGENTS_DIR, `${agentName}.md`);
	if (!fs.existsSync(filePath)) return "";
	const content = fs.readFileSync(filePath, "utf-8");
	// Strip frontmatter, return body
	const body = content.replace(/^---[\s\S]*?---\n\n?/, "");
	return body.trim();
}

let _agentNames: string[] | null = null;
function getAgentNames(): string[] {
	if (_agentNames === null) {
		_agentNames = loadAgentNames();
	}
	return _agentNames;
}

function getAgentNameSchema() {
	return StringEnum(getAgentNames() as [string, ...string[]]);
}

export default function (pi: ExtensionAPI) {
	const AgentNameSchema = getAgentNameSchema();

	const TaskParams = Type.Object({
		agent: Type.Optional(AgentNameSchema),
		prompt: Type.String({
			description: "What to delegate to the target agent",
		}),
		context: Type.Optional(
			Type.String({ description: "Optional additional context" }),
		),
		isolation: Type.Optional(StringEnum(["same-context", "forked"] as const)),
	});

	pi.registerTool({
		name: "Task",
		label: "Delegate to agent",
		description:
			"Delegate work to another OCGS agent. The target agent runs with its own system prompt and tool set, then returns the result. Use for vertical delegation (Tier 1 → Tier 2 → Tier 3). For peer review, use the /consult command instead.",
		promptSnippet: "Delegate work to another OCGS agent and return the result",
		promptGuidelines: [
			"Use the Task tool when you need another agent to DO WORK on your behalf and report back with a result.",
			"Pass `agent` as the target agent's name from the dropdown; if omitted, the orchestrator picks.",
			"Pass `prompt` as clear, self-contained instructions for the target agent.",
			"Pass `context` only if the target agent needs information not in its own system prompt.",
			"Do NOT use Task for peer review — use the /consult command for that.",
		],
		parameters: TaskParams,
		async execute(toolCallId, params, signal, onUpdate, ctx) {
			const targetName = params.agent || "creative-director";
			const systemPrompt = loadSystemPrompt(targetName);

			// Create an in-memory subagent session
			const subSession = ctx.sessionManager.inMemory({
				systemPrompt,
				tools: ["read", "write", "edit", "bash", "grep", "find", "ls"],
			});

			// Stream progress
			onUpdate({ type: "text", text: `Delegating to ${targetName}...` });

			try {
				const result = await subSession.run(params.prompt, { signal });
				return {
					content: [{ type: "text", text: result }],
					details: {
						delegatedTo: targetName,
						promptLength: params.prompt.length,
					},
				};
			} catch (err) {
				return {
					content: [
						{
							type: "text",
							text: `Task delegation to ${targetName} failed: ${err}`,
						},
					],
					isError: true,
				};
			}
		},
	});

	pi.registerCommand("consult", {
		description: "Consult a peer OCGS agent for review or second opinion",
		argumentHint: "<agent-name> [question]",
		handler: async (args: string, ctx) => {
			const parts = args.trim().split(/\s+/);
			const agentName = parts[0];
			const question =
				parts.slice(1).join(" ") ||
				"Review the current work and provide concerns";

			const names = getAgentNames();
			if (!agentName || !names.includes(agentName)) {
				ctx.ui.notify(
					`Unknown agent: ${agentName}. Valid: ${names.join(", ")}`,
					"error",
				);
				return;
			}

			const systemPrompt =
				loadSystemPrompt(agentName) +
				"\n\nYou are being consulted. Provide your review, concerns, and recommendations. Then STOP. Do not delegate further or take actions.";

			const subSession = ctx.sessionManager.inMemory({
				systemPrompt,
				tools: ["read", "grep", "find", "ls"], // Read-only tools
			});

			const result = await subSession.run(question);

			ctx.ui.notify(`Consultation from ${agentName} complete`, "info");
			// The result becomes part of the conversation
		},
	});
}
