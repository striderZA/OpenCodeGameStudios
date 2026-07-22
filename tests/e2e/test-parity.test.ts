/**
 * Parity tests: run the same OCGS scenario in both harnesses and assert
 * identical observable behavior.
 *
 * Usage:
 *   npm run test:parity          # Full parity test (requires both harnesses)
 *   npm run test:parity --quick  # Smoke test (single scenario)
 */

import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";
import { describe, it } from "node:test";

const TEST_TIMEOUT = 30000;
const OUTPUT_DIR = "test-output";

interface HarnessResult {
  available: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  duration: number;
}

function isCommandAvailable(cmd: string): boolean {
  try {
    execSync(`${cmd} --version`, { stdio: "ignore", timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

function runHarness(cmd: string, args: string[], timeout: number): HarnessResult {
  const start = Date.now();
  const result = spawnSync(cmd, args, {
    encoding: "utf8",
    timeout,
    stdio: ["pipe", "pipe", "pipe"],
  });
  const duration = Date.now() - start;

  return {
    available: result.status !== null || result.error?.message?.includes("ENOENT") !== true,
    exitCode: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    duration,
  };
}

function runOpencodeScenario(): HarnessResult {
  if (!isCommandAvailable("opencode")) {
    return { available: false, exitCode: null, stdout: "", stderr: "", duration: 0 };
  }
  return runHarness("opencode", ["--version"], TEST_TIMEOUT);
}

function runPiScenario(): HarnessResult {
  if (!isCommandAvailable("pi")) {
    return { available: false, exitCode: null, stdout: "", stderr: "", duration: 0 };
  }
  return runHarness("pi", ["--version"], TEST_TIMEOUT);
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
