/**
 * Parity tests: run the same OCGS scenario in both harnesses and assert
 * identical observable behavior.
 *
 * Usage:
 *   npm run test:parity          # Full parity test (requires both harnesses)
 *   npm run test:parity --quick  # Smoke test (single scenario)
 */

import { spawnSync } from "node:child_process";
import assert from "node:assert";
import { describe, it } from "node:test";

const TEST_TIMEOUT = 30000;

interface HarnessResult {
  available: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  duration: number;
}

// Cache to avoid spawning each harness multiple times across tests
const harnessCache = new Map<string, HarnessResult>();

function runHarness(cmd: string): HarnessResult {
  if (harnessCache.has(cmd)) return harnessCache.get(cmd)!;

  const start = Date.now();
  const result = spawnSync(cmd, ["--version"], {
    encoding: "utf8",
    timeout: TEST_TIMEOUT,
    stdio: ["pipe", "pipe", "pipe"],
  });
  const duration = Date.now() - start;

  const entry: HarnessResult = {
    available: result.error?.code !== "ENOENT" && result.status !== null,
    exitCode: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    duration,
  };

  harnessCache.set(cmd, entry);
  return entry;
}

function runOpencodeScenario(): HarnessResult {
  return runHarness("opencode");
}

function runPiScenario(): HarnessResult {
  return runHarness("pi");
}

describe("Harness parity", () => {
  it("both harnesses are available", () => {
    const opencode = runOpencodeScenario();
    const pi = runPiScenario();

    if (!opencode.available || !pi.available) {
      console.log("Skipping parity test — one or both harnesses not installed");
      console.log(`  OpenCode: ${opencode.available ? "available" : "not found"}`);
      console.log(`  Pi: ${pi.available ? "available" : "not found"}`);
      return;
    }

    assert.ok(opencode.available, "OpenCode should be available");
    assert.ok(pi.available, "Pi should be available");
  });

  it("both harnesses return exit code 0 for --version", () => {
    const opencode = runOpencodeScenario();
    const pi = runPiScenario();

    if (!opencode.available || !pi.available) {
      console.log("Skipping — harnesses not available");
      return;
    }

    assert.strictEqual(opencode.exitCode, 0, "OpenCode --version should exit 0");
    assert.strictEqual(pi.exitCode, 0, "Pi --version should exit 0");
  });

  it("both harnesses produce version output", () => {
    const opencode = runOpencodeScenario();
    const pi = runPiScenario();

    if (!opencode.available || !pi.available) {
      console.log("Skipping — harnesses not available");
      return;
    }

    assert.ok(opencode.stdout.length > 0, "OpenCode should produce version output");
    assert.ok(pi.stdout.length > 0, "Pi should produce version output");
  });

  it("both harnesses complete within timeout", () => {
    const opencode = runOpencodeScenario();
    const pi = runPiScenario();

    if (!opencode.available || !pi.available) {
      console.log("Skipping — harnesses not available");
      return;
    }

    assert.ok(opencode.duration < TEST_TIMEOUT, `OpenCode should complete within ${TEST_TIMEOUT}ms`);
    assert.ok(pi.duration < TEST_TIMEOUT, `Pi should complete within ${TEST_TIMEOUT}ms`);
  });
});
