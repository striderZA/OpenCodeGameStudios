import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { StringEnum } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import fs from "node:fs";
import path from "node:path";

const DECISIONS_LOG = path.resolve(process.cwd(), "production", "session-logs", "agent-decisions.jsonl");

function logDecision(entry: Record<string, unknown>) {
  const dir = path.dirname(DECISIONS_LOG);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(DECISIONS_LOG, JSON.stringify({ ...entry, ts: Date.now() }) + "\n");
}

export default function (pi: ExtensionAPI) {
  const OptionSchema = Type.Object({
    label: Type.String({ description: "Display label for the option (1-5 words)" }),
    description: Type.Optional(Type.String({ description: "One-sentence trade-off shown below label" })),
  });

  const QuestionParams = Type.Object({
    question: Type.String({ description: "The question to ask the user" }),
    options: Type.Array(OptionSchema, { minItems: 2, maxItems: 4 }),
    header: Type.Optional(Type.String({ description: "Optional short header (e.g. 'CD-PILLARS')" })),
  });

  pi.registerTool({
    name: "question",
    label: "Question",
    description: "Present a strategic decision to the user. Write your full analysis in conversation first, then call this tool with concise options. The user picks one or types a custom answer. Use for any decision point where you need user input to proceed.",
    promptSnippet: "Present a strategic decision with options and capture the user's choice",
    promptGuidelines: [
      "Use the question tool when you need the user to make a strategic choice between 2-4 options.",
      "ALWAYS write your full reasoning in conversation text BEFORE calling the question tool — explain the trade-offs, your recommendation, and why.",
      "Add '(Recommended)' to your preferred option's label.",
      "Labels: 1-5 words. Descriptions: 1 sentence with the key trade-off.",
      "Do NOT use the question tool for yes/no questions or open-ended input.",
    ],
    parameters: QuestionParams,
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      if (ctx.mode === "tui") {
        const choice = await ctx.ui.custom({
          type: "picker",
          title: params.header || "Strategic Decision",
          body: params.question,
          options: params.options.map((o, i) => ({
            label: o.label,
            description: o.description || "",
            value: String(i),
            default: i === 0,
          })),
          allowCustom: true,
        });

        const answer = choice?.value !== undefined
          ? (choice.value === "custom" ? choice.customText : params.options[parseInt(choice.value)]?.label)
          : "(skipped)";

        logDecision({
          question: params.question,
          options: params.options.map(o => o.label),
          answer,
          wasCustom: choice?.value === "custom",
        });

        return {
          content: [{ type: "text", text: `User chose: ${answer}` }],
          details: { answer, wasCustom: choice?.value === "custom" },
        };
      }

      // Non-TUI mode: return structured data
      return {
        content: [{ type: "text", text: `Question (${ctx.mode} mode): ${params.question}\nOptions: ${params.options.map(o => o.label).join(", ")}` }],
        details: {
          question: params.question,
          options: params.options.map(o => o.label),
          pending: true,
        },
      };
    },
  });
}
