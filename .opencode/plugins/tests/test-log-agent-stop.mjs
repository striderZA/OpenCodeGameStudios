/**
 * Test suite for log-agent-stop hook (handleLogAgentStop)
 *
 * Tests behavioral equivalence with bash log-agent-stop.sh:
 *   - Logs agent completion to agent-audit.log
 *   - Timestamp format YYYYMMDD_HHMMSS
 *   - Fallback to 'unknown' for missing agent type
 */

import * as fs from "node:fs"
import * as path from "node:path"
import { tmpdir } from "node:os"
import { strict as assert } from "node:assert"

// ──────────────────────────────────────────────
// Copy of handler logic (mirrors ccgs-hooks.ts)
// ──────────────────────────────────────────────

function sessionTimestamp() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, "0")
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

function handleLogAgentStop(projectRoot, agentType) {
  const timestamp = sessionTimestamp()
  const dir = path.join(projectRoot, "production", "session-logs")
  if (!fs.existsSync(dir)) {
    try { fs.mkdirSync(dir, { recursive: true }) } catch { return }
  }
  const name = agentType || "unknown"
  try {
    fs.appendFileSync(path.join(dir, "agent-audit.log"), `${timestamp} | Agent completed: ${name}\n`)
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
  return fs.mkdtempSync(path.join(tmpdir(), "ccgs-agent-stop-"))
}

function readLog(root) {
  const logPath = path.join(root, "production", "session-logs", "agent-audit.log")
  if (!fs.existsSync(logPath)) return ""
  return fs.readFileSync(logPath, "utf8")
}

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────

console.log("\n🧪 log-agent-stop hook tests\n")

// ── S1: Logs agent completion ──
run("S1: Logs 'Agent completed:' with agent type", () => {
  const root = makeTempProject()
  handleLogAgentStop(root, "ai-programmer")
  const log = readLog(root)
  assert.ok(log.includes("Agent completed: ai-programmer"))
  assert.ok(/^\d{8}_\d{6}/.test(log))
  cleanup(root)
})

// ── S2: Creates session-logs dir if missing ──
run("S2: Creates session-logs dir if absent", () => {
  const root = makeTempProject()
  handleLogAgentStop(root, "explore")
  assert.ok(fs.existsSync(path.join(root, "production", "session-logs")))
  cleanup(root)
})

// ── S3: Falls back to 'unknown' ──
run("S3: Empty agent type → 'unknown'", () => {
  const root = makeTempProject()
  handleLogAgentStop(root, "")
  const log = readLog(root)
  assert.ok(log.includes("Agent completed: unknown"))
  cleanup(root)
})

// ── S4: Appends to existing log ──
run("S4: Appends to existing audit log", () => {
  const root = makeTempProject()
  fs.mkdirSync(path.join(root, "production", "session-logs"), { recursive: true })
  fs.writeFileSync(path.join(root, "production", "session-logs", "agent-audit.log"), "preexisting\n", "utf8")
  handleLogAgentStop(root, "general")
  const log = readLog(root)
  assert.ok(log.startsWith("preexisting"))
  assert.ok(log.includes("Agent completed: general"))
  cleanup(root)
})

// ── Summary ──

function cleanup(root) {
  try { fs.rmSync(root, { recursive: true }) } catch { /* ignore */ }
}

console.log(`\n📊 Results: ${passCount}/${testCount} passed\n`)
process.exit(passCount === testCount ? 0 : 1)
