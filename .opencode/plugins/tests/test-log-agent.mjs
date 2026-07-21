/**
 * Test suite for log-agent hook (handleLogAgent)
 *
 * Tests behavioral equivalence with the original bash log-agent.sh:
 *   - Logs agent invocation to agent-audit.log
 *   - Timestamp format: YYYY-MM-DDTHH-MM-SS
 *   - Handles unknown/missing agent type
 */

import * as fs from "node:fs"
import * as path from "node:path"
import { tmpdir } from "node:os"
import { strict as assert } from "node:assert"
import { describe, it } from "node:test"
import { handleLogAgent } from "../ccgs-hooks.ts"

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function makeTempProject() {
  const tmp = fs.mkdtempSync(path.join(tmpdir(), "ccgs-log-agent-"))
  return tmp
}

function readLog(root) {
  const logPath = path.join(root, "production", "session-logs", "agent-audit.log")
  if (!fs.existsSync(logPath)) return ""
  return fs.readFileSync(logPath, "utf8")
}

function cleanup(root) {
  try { fs.rmSync(root, { recursive: true }) } catch { /* ignore */ }
}

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────

describe("log-agent tests", () => {

  // ── S1: Logs agent invocation ──
  it("S1: Logs agent type to audit file", () => {
    const root = makeTempProject()
    try {
      handleLogAgent(root, "gameplay-programmer")

      const log = readLog(root)
      assert.ok(log.includes("Agent invoked: gameplay-programmer"), "should include agent name")
      assert.ok(log.endsWith("\n"), "should end with newline")
      const tsMatch = log.match(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2} \| Agent invoked:/)
      assert.ok(tsMatch, `expected ISO timestamp, got: ${log.slice(0, 40)}`)
    } finally {
      cleanup(root)
    }
  })

  // ── S2: Creates log directory if missing ──
  it("S2: Creates session-logs dir if absent", () => {
    const root = makeTempProject()
    try {
      // No production/session-logs directory
      handleLogAgent(root, "ai-programmer")

      const log = readLog(root)
      assert.ok(fs.existsSync(path.join(root, "production", "session-logs")), "dir should exist")
      assert.ok(log.includes("ai-programmer"), "should log agent name")
    } finally {
      cleanup(root)
    }
  })

  // ── S3: Falls back to 'unknown' for empty agent type ──
  it("S3: Empty/null/undefined agent type → 'unknown'", () => {
    const root = makeTempProject()
    try {
      handleLogAgent(root, "")
      handleLogAgent(root, null)
      handleLogAgent(root, undefined)

      const log = readLog(root)
      const lines = log.trim().split("\n")
      assert.equal(lines.length, 3, "should have 3 log entries")
      for (const line of lines) {
        assert.ok(line.includes("Agent invoked: unknown"), `expected unknown, got: ${line}`)
      }
    } finally {
      cleanup(root)
    }
  })

  // ── S4: Appends to existing log ──
  it("S4: Appends to existing audit log", () => {
    const root = makeTempProject()
    try {
      fs.mkdirSync(path.join(root, "production", "session-logs"), { recursive: true })
      fs.writeFileSync(path.join(root, "production", "session-logs", "agent-audit.log"), "preexisting\n", "utf8")

      handleLogAgent(root, "explore")
      handleLogAgent(root, "general")

      const log = readLog(root)
      const lines = log.trim().split("\n")
      assert.equal(lines[0], "preexisting", "should preserve existing content")
      assert.ok(lines[1].includes("Agent invoked: explore"), "should append new entry")
      assert.ok(lines[2].includes("Agent invoked: general"), "should append second entry")
    } finally {
      cleanup(root)
    }
  })

  // ── S5: Timestamp format: YYYY-MM-DDTHH-MM-SS ──
  it("S5: Uses ISO timestamp format", () => {
    const root = makeTempProject()
    try {
      handleLogAgent(root, "test-agent")

      const log = readLog(root)
      const matches = log.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/)
      assert.ok(matches, "no timestamp found")
      const ts = matches[1]
      assert.equal(ts.length, 19, `expected 19 chars, got ${ts.length}: ${ts}`)
      assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/.test(ts), `bad format: ${ts}`)
    } finally {
      cleanup(root)
    }
  })
})
