import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import fs from "node:fs";
import path from "node:path";

const AUDIT_LOG = path.resolve(process.cwd(), "production", "session-logs", "agent-audit.log");

function formatEntry(event: Record<string, unknown>): string {
  // Byte-identical format to OpenCode's logAudit()
  const ts = new Date().toISOString();
  return `[${ts}] ${event.type}: ${JSON.stringify(event.data)}\n`;
}

function writeToAudit(entry: string) {
  const dir = path.dirname(AUDIT_LOG);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(AUDIT_LOG, entry);
}

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (event, _ctx) => {
    writeToAudit(formatEntry({
      type: "session_start",
      data: { reason: event.reason },
    }));
  });

  pi.on("tool_call", async (event, _ctx) => {
    writeToAudit(formatEntry({
      type: "tool_call",
      data: {
        tool: event.toolName,
        callId: event.toolCallId,
        args: summarizeArgs(event.input),
      },
    }));
  });

  pi.on("tool_result", async (event, _ctx) => {
    // Log only the result length, not full content (too verbose)
    writeToAudit(formatEntry({
      type: "tool_result",
      data: {
        tool: event.toolName,
        callId: event.toolCallId,
        resultLength: typeof event.content === "string" ? event.content.length : JSON.stringify(event.content).length,
        isError: event.isError,
      },
    }));
  });

  pi.on("agent_end", async (event, _ctx) => {
    writeToAudit(formatEntry({
      type: "agent_end",
      data: { messageCount: event.messages?.length || 0 },
    }));
  });

  pi.on("session_shutdown", async (event, _ctx) => {
    writeToAudit(formatEntry({
      type: "session_end",
      data: { reason: event.reason },
    }));
  });
}

function summarizeArgs(input: Record<string, unknown>): Record<string, unknown> {
  // Don't log full command text or file contents — just the shape
  const summarized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string" && value.length > 100) {
      summarized[key] = value.slice(0, 100) + "...";
    } else {
      summarized[key] = value;
    }
  }
  return summarized;
}
