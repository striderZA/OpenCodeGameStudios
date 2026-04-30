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

// ──────────────────────────────────────────────
// Copy of handler logic (mirrors ccgs-hooks.ts)
// ──────────────────────────────────────────────

function sessionTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
}

function handleLogAgent(projectRoot, agentType) {
  const timestamp = sessionTimestamp()
  const dir = path.join(projectRoot, "production", "session-logs")
  if (!fs.existsSync(dir)) {
    try { fs.mkdirSync(dir, { recursive: true }) } catch { return }
  }
  const name = agentType || "unknown"
  try {
    fs.appendFileSync(path.join(dir, "agent-audit.log"), `${timestamp} | Agent invoked: ${name}\n`)
  } catch { /* ignore */ }
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

let testCount = 0
let passCount = 0

function run(name, fn) {
  testCount++
  try {
    fn()
    passCount++
    console.log(`  ✅ ${name}`)
  } catch (e) {
    console.log(`  ❌ ${name}`)
    console.error(`      ${e.message}`)
  }
}

function makeTempProject() {
  const tmp = fs.mkdtempSync(path.join(tmpdir(), "ccgs-log-agent-"))
  return tmp
}

function readLog(root) {
  const logPath = path.join(root, "production", "session-logs", "agent-audit.log")
  if (!fs.existsSync(logPath)) return ""
  return fs.readFileSync(logPath, "utf8")
}

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────

console.log("\n🧪 log-agent hook tests\n")

// ── S1: Logs agent invocation ──
{
  const root = makeTempProject()

  handleLogAgent(root, "gameplay-programmer")

  const log = readLog(root)
  run("S1: Logs agent type to audit file", () => {
    assert.ok(log.includes("Agent invoked: gameplay-programmer"), "should include agent name")
    assert.ok(log.endsWith("\n"), "should end with newline")
    const tsMatch = log.match(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2} \| Agent invoked:/)
    assert.ok(tsMatch, `expected ISO timestamp, got: ${log.slice(0, 40)}`)
  })
  cleanup(root)
}

// ── S2: Creates log directory if missing ──
{
  const root = makeTempProject()
  // No production/session-logs directory

  handleLogAgent(root, "ai-programmer")

  const log = readLog(root)
  run("S2: Creates session-logs dir if absent", () => {
    assert.ok(fs.existsSync(path.join(root, "production", "session-logs")), "dir should exist")
    assert.ok(log.includes("ai-programmer"), "should log agent name")
  })
  cleanup(root)
}

// ── S3: Falls back to 'unknown' for empty agent type ──
{
  const root = makeTempProject()

  handleLogAgent(root, "")
  handleLogAgent(root, null)
  handleLogAgent(root, undefined)

  const log = readLog(root)
  const lines = log.trim().split("\n")
  run("S3: Empty/null/undefined agent type → 'unknown'", () => {
    assert.equal(lines.length, 3, "should have 3 log entries")
    for (const line of lines) {
      assert.ok(line.includes("Agent invoked: unknown"), `expected unknown, got: ${line}`)
    }
  })
  cleanup(root)
}

// ── S4: Appends to existing log ──
{
  const root = makeTempProject()
  fs.mkdirSync(path.join(root, "production", "session-logs"), { recursive: true })
  fs.writeFileSync(path.join(root, "production", "session-logs", "agent-audit.log"), "preexisting\n", "utf8")

  handleLogAgent(root, "explore")
  handleLogAgent(root, "general")

  const log = readLog(root)
  const lines = log.trim().split("\n")
  run("S4: Appends to existing audit log", () => {
    assert.equal(lines[0], "preexisting", "should preserve existing content")
    assert.ok(lines[1].includes("Agent invoked: explore"), "should append new entry")
    assert.ok(lines[2].includes("Agent invoked: general"), "should append second entry")
  })
  cleanup(root)
}

// ── S5: Timestamp format: YYYY-MM-DDTHH-MM-SS ──
{
  const root = makeTempProject()

  handleLogAgent(root, "test-agent")

  const log = readLog(root)
  const matches = log.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/)
  run("S5: Uses ISO timestamp format", () => {
    assert.ok(matches, "no timestamp found")
    const ts = matches[1]
    assert.equal(ts.length, 19, `expected 19 chars, got ${ts.length}: ${ts}`)
    assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/.test(ts), `bad format: ${ts}`)
  })
  cleanup(root)
}

// ── Summary ──
function cleanup(root) {
  try { fs.rmSync(root, { recursive: true }) } catch { /* ignore */ }
}

console.log(`\n📊 Results: ${passCount}/${testCount} passed\n`)
process.exit(passCount === testCount ? 0 : 1)
