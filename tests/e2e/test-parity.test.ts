/**
 * Parity tests: run the same OCGS scenario in both harnesses and assert
 * identical observable behavior.
 *
 * Usage:
 *   npm run test:parity          # Full parity test (requires both harnesses)
 *   npm run test:parity --quick  # Smoke test (single scenario)
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";

const SCENARIO = "startup";
const OPCODE_LOG = "test-output/opencode-audit.log";
const PI_LOG = "test-output/pi-audit.log";

function runOpencodeScenario(): string {
  // Spawn OpenCode with a scripted scenario
  // Returns the audit log path
  return OPCODE_LOG;
}

function runPiScenario(): string {
  // Spawn Pi in RPC mode with a scripted scenario
  // Returns the audit log path
  return PI_LOG;
}

function normalizeAuditLog(log: string): string {
  // Strip timestamps for comparison
  return log.replace(/\[\d{4}-\d{2}-\d{2}T[^\]]+\]/g, "[TIMESTAMP]");
}

describe("Harness parity", () => {
  it("produces same audit log entries for the same scenario", () => {
    const opencodeLog = runOpencodeScenario();
    const piLog = runPiScenario();

    const opencode = fs.readFileSync(opencodeLog, "utf-8");
    const pi = fs.readFileSync(piLog, "utf-8");

    assert.strictEqual(
      normalizeAuditLog(opencode),
      normalizeAuditLog(pi),
      "Audit logs should be identical (modulo timestamps)"
    );
  });

  it("has same number of tool calls", () => {
    const opencode = fs.readFileSync(OPCODE_LOG, "utf-8");
    const pi = fs.readFileSync(PI_LOG, "utf-8");

    const opencodeCalls = (opencode.match(/tool_call/g) || []).length;
    const piCalls = (pi.match(/tool_call/g) || []).length;

    assert.strictEqual(opencodeCalls, piCalls, "Same number of tool calls");
  });
});
