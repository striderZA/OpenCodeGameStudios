/**
 * Test suite for pre-compact hook (buildCompactionContext)
 *
 * Tests behavioral equivalence with bash pre-compact.sh:
 *   - Session state file output (truncated at 100 lines)
 *   - No-state-file suggestion
 *   - Git working tree listing (unstaged, staged, untracked)
 *   - WIP markers in design/gdd/*.md
 *   - Recovery instructions
 *   - Compaction log entry
 */

import * as fs from "node:fs"
import * as path from "node:path"
import { execSync } from "node:child_process"
import { tmpdir } from "node:os"
import { strict as assert } from "node:assert"
import { describe, it } from "node:test"
import { buildCompactionContext, logCompactionEvent } from "../ccgs-hooks.ts"

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function makeTempProject() {
  return fs.mkdtempSync(path.join(tmpdir(), "ccgs-compact-"))
}

function initGit(root) {
  execSync("git init", { cwd: root, stdio: "ignore" })
  execSync('git config user.email "test@test.com"', { cwd: root, stdio: "ignore" })
  execSync('git config user.name "Test"', { cwd: root, stdio: "ignore" })
}

function makeCommit(root, msg) {
  fs.writeFileSync(path.join(root, "dummy.txt"), `${msg}\n`, "utf8")
  execSync("git add -A", { cwd: root, stdio: "ignore" })
  execSync(`git commit -m "${msg}"`, { cwd: root, stdio: "ignore" })
}

function cleanup(root) {
  try { fs.rmSync(root, { recursive: true }) } catch { /* ignore */ }
}

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────

describe("pre-compact hook tests", () => {

  // ── S1: Header and timestamp ──
  it("S1: Has header and timestamp", () => {
    const root = makeTempProject()
    const output = buildCompactionContext(root)
    assert.ok(output.includes("=== SESSION STATE BEFORE COMPACTION ==="))
    assert.ok(output.includes("Timestamp:"))
    assert.ok(output.endsWith("=== END SESSION STATE ==="))
    cleanup(root)
  })

  // ── S2: No active state file — shows suggestion ──
  it("S2: No state file — suggests creating one", () => {
    const root = makeTempProject()
    const output = buildCompactionContext(root)
    assert.ok(output.includes("No active session state file found"))
    assert.ok(output.includes("Consider maintaining production/session-state/active.md"))
    cleanup(root)
  })

  // ── S3: Active state file — includes content ──
  it("S3: State file present — includes content", () => {
    const root = makeTempProject()
    fs.mkdirSync(path.join(root, "production", "session-state"), { recursive: true })
    fs.writeFileSync(path.join(root, "production", "session-state", "active.md"),
      "## Current Task\n- Implement AI\n## Next\n- Test\n", "utf8")

    const output = buildCompactionContext(root)
    assert.ok(output.includes("Implement AI"))
    assert.ok(output.includes("(from production/session-state/active.md)"))
    assert.ok(!output.includes("No active session state"))
    cleanup(root)
  })

  // ── S4: State file truncated at 100 lines ──
  it("S4: State >100 lines — truncated", () => {
    const root = makeTempProject()
    fs.mkdirSync(path.join(root, "production", "session-state"), { recursive: true })
    const longContent = Array.from({ length: 120 }, (_, i) => `Line ${i + 1}`).join("\n")
    fs.writeFileSync(path.join(root, "production", "session-state", "active.md"), longContent, "utf8")

    const output = buildCompactionContext(root)
    assert.ok(output.includes("showing first 100"))
    assert.ok(output.includes("120 total lines"))
    assert.ok(output.includes("Line 1"))
    assert.ok(!output.includes("Line 101"), "should not show line 101+ in main content")
    cleanup(root)
  })

  // ── S5: Git file listing — all three categories ──
  it("S5: Lists unstaged, staged, and untracked files", () => {
    const root = makeTempProject()
    initGit(root)
    makeCommit(root, "init")

    // Unstaged change
    fs.writeFileSync(path.join(root, "dummy.txt"), "modified\n", "utf8")
    // Staged change
    fs.writeFileSync(path.join(root, "staged.txt"), "staged\n", "utf8")
    execSync("git add staged.txt", { cwd: root, stdio: "ignore" })
    // Untracked file
    fs.writeFileSync(path.join(root, "new_file.txt"), "untracked\n", "utf8")

    const output = buildCompactionContext(root)
    assert.ok(output.includes("Unstaged changes:"))
    assert.ok(output.includes("- dummy.txt"))
    assert.ok(output.includes("Staged changes:"))
    assert.ok(output.includes("- staged.txt"))
    assert.ok(output.includes("New untracked files:"))
    assert.ok(output.includes("- new_file.txt"))
    cleanup(root)
  })

  // ── S6: Clean git working tree ──
  it("S6: Clean working tree — shows no changes", () => {
    const root = makeTempProject()
    initGit(root)
    makeCommit(root, "init")

    const output = buildCompactionContext(root)
    assert.ok(output.includes("(no uncommitted changes)"))
    cleanup(root)
  })

  // ── S7: No git repo — shows not a git repo ──
  it("S7: No git repo — shows not a git repository", () => {
    const root = makeTempProject()
    const output = buildCompactionContext(root)
    assert.ok(output.includes("(not a git repository)"))
    cleanup(root)
  })

  // ── S8: WIP markers in design docs ──
  it("S8: WIP markers found in design docs", () => {
    const root = makeTempProject()
    fs.mkdirSync(path.join(root, "design", "gdd"), { recursive: true })
    fs.writeFileSync(path.join(root, "design", "gdd", "combat.md"),
      "# Combat System\n## Overview\nTODO: write formulas\n## Detailed\nSome content\n", "utf8")
    fs.writeFileSync(path.join(root, "design", "gdd", "ui.md"),
      "# UI Design\nComplete.\n", "utf8")

    const output = buildCompactionContext(root)
    assert.ok(output.includes("Work In Progress"))
    assert.ok(output.includes("combat.md"))
    assert.ok(output.includes("TODO: write formulas"))
    assert.ok(!output.includes("no WIP markers found"))
    // ui.md has no WIP markers, should not be listed
    // The listing shows files WITH markers only
    assert.ok(output.includes("design/gdd/combat.md"))
    cleanup(root)
  })

  // ── S9: No WIP markers in design docs ──
  it("S9: No WIP markers — shows no markers found", () => {
    const root = makeTempProject()
    fs.mkdirSync(path.join(root, "design", "gdd"), { recursive: true })
    fs.writeFileSync(path.join(root, "design", "gdd", "complete.md"), "# Done\nAll complete.\n", "utf8")

    const output = buildCompactionContext(root)
    assert.ok(output.includes("no WIP markers found in design docs"))
    cleanup(root)
  })

  // ── S10: No design/gdd/ directory — no crash ──
  it("S10: No design/gdd/ dir — no crash", () => {
    const root = makeTempProject()
    const output = buildCompactionContext(root)
    assert.ok(output.includes("no WIP markers found in design docs"))
    cleanup(root)
  })

  // ── S11: Recovery instructions ──
  it("S11: Has recovery instructions", () => {
    const root = makeTempProject()
    const output = buildCompactionContext(root)
    assert.ok(output.includes("read production/session-state/active.md"))
    assert.ok(output.includes("read any files listed above"))
    cleanup(root)
  })

  // ── S12: logCompactionEvent creates entry ──
  it("S12: Compaction event logged to file", () => {
    const root = makeTempProject()
    logCompactionEvent(root)

    const logPath = path.join(root, "production", "session-logs", "compaction-log.txt")
    assert.ok(fs.existsSync(logPath), "compaction-log.txt should exist")
    const content = fs.readFileSync(logPath, "utf8")
    assert.ok(content.includes("Context compaction occurred at"))
    assert.ok(content.endsWith("\n"))
    cleanup(root)
  })

  // ── S13: logCompactionEvent appends ──
  it("S13: Compaction log appends on repeated calls", () => {
    const root = makeTempProject()
    logCompactionEvent(root)
    logCompactionEvent(root)

    const logPath = path.join(root, "production", "session-logs", "compaction-log.txt")
    const content = fs.readFileSync(logPath, "utf8")
    const lines = content.trim().split("\n")
    assert.equal(lines.length, 2)
    cleanup(root)
  })

  // ── S14: No design/gdd dir — WIP section still present with message ──
  it("S14: WIP section present even without design/gdd dir", () => {
    const root = makeTempProject()
    // Don't create design/gdd at all
    const output = buildCompactionContext(root)
    assert.ok(output.includes("## Design Docs"))
    assert.ok(output.includes("no WIP markers found in design docs"))
    cleanup(root)
  })

})
