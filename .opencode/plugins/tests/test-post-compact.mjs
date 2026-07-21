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
import { describe, it } from "node:test"
import { handlePostCompact } from "../ccgs-hooks.ts"

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function makeTempProject() {
  return fs.mkdtempSync(path.join(tmpdir(), "ccgs-postcompact-"))
}

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────

describe("post-compact tests", () => {

  // ── S1: State file exists — reports line count ──
  it("S1: State file exists — shows line count and reminder", () => {
    const root = makeTempProject()
    fs.mkdirSync(path.join(root, "production", "session-state"), { recursive: true })
    fs.writeFileSync(path.join(root, "production", "session-state", "active.md"),
      "# Task\nLine 2\nLine 3\n", "utf8")

    const output = handlePostCompact(root)
    assert.ok(output.includes("Session state restored:"), "should mention session state restored")
    assert.ok(output.includes("active.md"), "should mention active.md")
    assert.ok(output.includes("lines"), "should report line count")
    assert.ok(output.includes("read this file to continue working"), "should remind to read state")
    cleanup(root)
  })

  // ── S2: NO state file — offers fallback ──
  it("S2: No state file — offers fallback to session-logs/", () => {
    const root = makeTempProject()
    const output = handlePostCompact(root)
    assert.ok(output.includes("No session state file found"), "should say no state file")
    assert.ok(output.includes("production/session-logs/"), "should suggest session-logs fallback")
  })

  // ── S3: Large state file — reports correct count ──
  it("S3: Large state file — reports 50 lines", () => {
    const root = makeTempProject()
    fs.mkdirSync(path.join(root, "production", "session-state"), { recursive: true })
    const content = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}`).join("\n")
    fs.writeFileSync(path.join(root, "production", "session-state", "active.md"), content, "utf8")

    const output = handlePostCompact(root)
    assert.ok(output.includes("(50 lines)"))
    cleanup(root)
  })

  // ── S4: production dir missing entirely — no crash ──
  it("S4: Missing production/ dir — no crash", () => {
    const root = makeTempProject()
    // No production/ dir at all
    const output = handlePostCompact(root)
    assert.ok(output.includes("No session state file found"))
    cleanup(root)
  })

  // ── S5: session-state dir exists but no active.md — no crash ──
  it("S5: session-state dir without active.md — no crash", () => {
    const root = makeTempProject()
    fs.mkdirSync(path.join(root, "production", "session-state"), { recursive: true })
    // No active.md inside
    const output = handlePostCompact(root)
    assert.ok(output.includes("No session state file found"))
    cleanup(root)
  })

})

// ── Summary ──
function cleanup(root) {
  try { fs.rmSync(root, { recursive: true }) } catch { /* ignore */ }
}
