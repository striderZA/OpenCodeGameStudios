/**
 * Test suite for log-agent-stop hook (handleLogAgentStop)
 *
 * Tests behavioral equivalence with bash log-agent-stop.sh:
 *   - Logs agent completion to agent-audit.log
 *   - Timestamp format: YYYY-MM-DDTHH-MM-SS
 *   - Fallback to 'unknown' for missing agent type
 */

import * as fs from "node:fs"
import * as path from "node:path"
import { tmpdir } from "node:os"
import { strict as assert } from "node:assert"
import { describe, it } from "node:test"
import { handleLogAgentStop } from "../ccgs-hooks.ts"


// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function makeTempProject() {
  return fs.mkdtempSync(path.join(tmpdir(), "ccgs-agent-stop-"))
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

describe("log-agent-stop tests", () => {

  // ── S1: Logs agent completion ──
  it("S1: Logs 'Agent completed:' with agent type", () => {
    const root = makeTempProject()
    handleLogAgentStop(root, "ai-programmer")
    const log = readLog(root)
    assert.ok(log.includes("Agent completed: ai-programmer"))
    assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/.test(log))
    cleanup(root)
  })

  // ── S2: Creates session-logs dir if missing ──
  it("S2: Creates session-logs dir if absent", () => {
    const root = makeTempProject()
    handleLogAgentStop(root, "explore")
    assert.ok(fs.existsSync(path.join(root, "production", "session-logs")))
    cleanup(root)
  })

  // ── S3: Falls back to 'unknown' ──
  it("S3: Empty agent type → 'unknown'", () => {
    const root = makeTempProject()
    handleLogAgentStop(root, "")
    const log = readLog(root)
    assert.ok(log.includes("Agent completed: unknown"))
    cleanup(root)
  })

  // ── S4: Appends to existing log ──
  it("S4: Appends to existing audit log", () => {
    const root = makeTempProject()
    fs.mkdirSync(path.join(root, "production", "session-logs"), { recursive: true })
    fs.writeFileSync(path.join(root, "production", "session-logs", "agent-audit.log"), "preexisting\n", "utf8")
    handleLogAgentStop(root, "general")
    const log = readLog(root)
    assert.ok(log.startsWith("preexisting"))
    assert.ok(log.includes("Agent completed: general"))
    cleanup(root)
  })

})
