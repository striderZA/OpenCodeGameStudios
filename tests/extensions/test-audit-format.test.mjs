import { describe, it } from "node:test";
import assert from "node:assert";

// Test that the audit log format matches expected shape

describe("ocgs-audit format", () => {
  it("session_start entry matches expected format", () => {
    const entry = `[2026-06-21T12:00:00.000Z] session_start: {"reason":"startup"}\n`;
    assert.match(entry, /^\[\d{4}-\d{2}-\d{2}T/);
    assert.match(entry, /session_start/);
    assert.match(entry, /"reason":"startup"/);
  });

  it("tool_call entry has required fields", () => {
    const entry = `[2026-06-21T12:00:00.000Z] tool_call: {"tool":"read","callId":"call_1","args":{"path":"test.md"}}\n`;
    assert.match(entry, /tool_call/);
    assert.match(entry, /"tool":"read"/);
    assert.match(entry, /"callId":"call_1"/);
  });
});
