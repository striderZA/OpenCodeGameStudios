/**
 * Test suite for post-compact hook (handlePostCompact)
 *
 * Tests behavioral equivalence with bash post-compact.sh:
 *   - Reports session state file exists with line count
 *   - Reminds to read the state file
 *   - Offers fallback to session-logs/ when no state file
 */

import * as fs from "node:fs"
import * as path from "node:path"
import { tmpdir } from "node:os"
import { strict as assert } from "node:assert"

// ──────────────────────────────────────────────
// Copy of handler logic (mirrors ccgs-hooks.ts)
// ──────────────────────────────────────────────

function handlePostCompact(projectRoot) {
  const lines = []
  const emit = (...args) => lines.push(args.join(" "))

  emit("=== Context Restored After Compaction ===")
  const active = path.join(projectRoot, "production", "session-state", "active.md")
  if (fs.existsSync(active)) {
    let size = "?"
    try {
      size = String(fs.readFileSync(active, "utf8").split("\n").length)
    } catch { /* ignore */ }
    emit(`Session state file exists: production/session-state/active.md (${size} lines)`)
    emit("IMPORTANT: Read this file now to restore your working context.")
    emit("It contains: current task, decisions made, files in progress, open questions.")
  } else {
    emit("No session state file found at production/session-state/active.md")
    emit("If you were mid-task, check production/session-logs/ for the last session audit.")
  }
  emit("=========================================")

  return lines.join("\n")
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
  return fs.mkdtempSync(path.join(tmpdir(), "ccgs-postcompact-"))
}

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────

console.log("\n🧪 post-compact hook tests\n")

// ── S1: State file exists — reports line count ──
{
  const root = makeTempProject()
  fs.mkdirSync(path.join(root, "production", "session-state"), { recursive: true })
  fs.writeFileSync(path.join(root, "production", "session-state", "active.md"),
    "# Task\nLine 2\nLine 3\n", "utf8")

  const output = handlePostCompact(root)
  run("S1: State file exists — shows line count and reminder", () => {
    assert.ok(output.includes("=== Context Restored After Compaction ==="))
    assert.ok(output.includes("active.md (4 lines)"), "should report 4 lines (incl. trailing newline split)")
    assert.ok(output.includes("IMPORTANT: Read this file now"))
    assert.ok(output.includes("current task, decisions made"))
    assert.ok(output.endsWith("========================================="))
  })
  cleanup(root)
}

// ── S2: NO state file — offers fallback ──
{
  const root = makeTempProject()
  const output = handlePostCompact(root)
  run("S2: No state file — offers fallback to session-logs/", () => {
    assert.ok(output.includes("No session state file found"))
    assert.ok(output.includes("check production/session-logs/"))
  })
  cleanup(root)
}

// ── S3: Large state file — reports correct count ──
{
  const root = makeTempProject()
  fs.mkdirSync(path.join(root, "production", "session-state"), { recursive: true })
  const content = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}`).join("\n")
  fs.writeFileSync(path.join(root, "production", "session-state", "active.md"), content, "utf8")

  const output = handlePostCompact(root)
  run("S3: Large state file — reports 50 lines", () => {
    assert.ok(output.includes("(50 lines)"))
  })
  cleanup(root)
}

// ── S4: production dir missing entirely — no crash ──
{
  const root = makeTempProject()
  // No production/ dir at all
  const output = handlePostCompact(root)
  run("S4: Missing production/ dir — no crash", () => {
    assert.ok(output.includes("No session state file found"))
  })
  cleanup(root)
}

// ── S5: session-state dir exists but no active.md — no crash ──
{
  const root = makeTempProject()
  fs.mkdirSync(path.join(root, "production", "session-state"), { recursive: true })
  // No active.md inside
  const output = handlePostCompact(root)
  run("S5: session-state dir without active.md — no crash", () => {
    assert.ok(output.includes("No session state file found"))
  })
  cleanup(root)
}

// ── Summary ──
function cleanup(root) {
  try { fs.rmSync(root, { recursive: true }) } catch { /* ignore */ }
}

console.log(`\n📊 Results: ${passCount}/${testCount} passed\n`)
process.exit(passCount === testCount ? 0 : 1)
