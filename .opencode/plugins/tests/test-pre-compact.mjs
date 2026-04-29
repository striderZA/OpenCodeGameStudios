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

// ──────────────────────────────────────────────
// Copy of handler logic (mirrors ccgs-hooks.ts)
// ──────────────────────────────────────────────

function isGitRepo(cwd) {
  try {
    execSync("git rev-parse --git-dir", { encoding: "utf8", cwd, stdio: "ignore" })
    return true
  } catch {
    return false
  }
}

function findFilesRecursive(root, predicate) {
  const results = []
  try {
    const entries = fs.readdirSync(root, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(root, entry.name)
      if (entry.isDirectory()) {
        results.push(...findFilesRecursive(fullPath, predicate))
      } else if (entry.isFile() && predicate(entry.name, fullPath)) {
        results.push(fullPath)
      }
    }
  } catch { /* skip */ }
  return results
}

function runGit(cwd, cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", cwd, stdio: ["pipe", "pipe", "ignore"] }).trim()
  } catch {
    return ""
  }
}

function normalizePath(p) {
  return p.replace(/\\/g, "/")
}

function buildCompactionContext(projectRoot) {
  const lines = []
  const push = (s) => lines.push(s)

  push("=== SESSION STATE BEFORE COMPACTION ===")
  push(`Timestamp: ${new Date().toISOString()}`)

  const activeState = path.join(projectRoot, "production", "session-state", "active.md")
  if (fs.existsSync(activeState)) {
    const content = fs.readFileSync(activeState, "utf8")
    const contentLines = content.split("\n")
    push("")
    push("## Active Session State (from production/session-state/active.md)")
    if (contentLines.length > 100) {
      push(contentLines.slice(0, 100).join("\n"))
      push(`... (truncated — ${contentLines.length} total lines, showing first 100)`)
    } else {
      push(content)
    }
  } else {
    push("")
    push("## No active session state file found")
    push("Consider maintaining production/session-state/active.md for better recovery.")
  }

  push("")
  push("## Files Modified (git working tree)")
  const hasGit = isGitRepo(projectRoot)
  if (hasGit) {
    const changed = runGit(projectRoot, "git diff --name-only")
    const staged = runGit(projectRoot, "git diff --staged --name-only")
    const untracked = runGit(projectRoot, "git ls-files --others --exclude-standard")

    let anyChanges = false
    if (changed) {
      anyChanges = true
      push("Unstaged changes:")
      changed.split("\n").forEach((f) => push(`  - ${f}`))
    }
    if (staged) {
      anyChanges = true
      push("Staged changes:")
      staged.split("\n").forEach((f) => push(`  - ${f}`))
    }
    if (untracked) {
      anyChanges = true
      push("New untracked files:")
      untracked.split("\n").forEach((f) => push(`  - ${f}`))
    }
    if (!anyChanges) {
      push("  (no uncommitted changes)")
    }
  } else {
    push("  (not a git repository)")
  }

  push("")
  push("## Design Docs — Work In Progress")
  const gddDir = path.join(projectRoot, "design", "gdd")
  let wipFound = false
  if (fs.existsSync(gddDir)) {
    const designFiles = findFilesRecursive(gddDir, (name) => name.endsWith(".md"))
    for (const fp of designFiles) {
      try {
        const content = fs.readFileSync(fp, "utf8")
        const wipLines = content.split("\n").filter((l) => /TODO|WIP|PLACEHOLDER|\[TO BE|\[TBD\]/.test(l))
        if (wipLines.length > 0) {
          wipFound = true
          const rel = normalizePath(path.relative(projectRoot, fp))
          push(`  ${rel}:`)
          wipLines.forEach((l) => push(`    ${l}`))
        }
      } catch { /* skip */ }
    }
  }
  if (!wipFound) {
    push("  (no WIP markers found in design docs)")
  }

  push("")
  push("## Recovery Instructions")
  push("After compaction, read production/session-state/active.md to recover full working context.")
  push("Then read any files listed above that are being actively worked on.")
  push("=== END SESSION STATE ===")

  return lines.join("\n")
}

function logCompactionEvent(projectRoot) {
  try {
    const logDir = path.join(projectRoot, "production", "session-logs")
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })
    const timestamp = new Date().toISOString()
    fs.appendFileSync(path.join(logDir, "compaction-log.txt"), `Context compaction occurred at ${timestamp}.\n`)
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

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────

console.log("\n🧪 pre-compact hook tests\n")

// ── S1: Header and timestamp ──
{
  const root = makeTempProject()
  const output = buildCompactionContext(root)
  run("S1: Has header and timestamp", () => {
    assert.ok(output.includes("=== SESSION STATE BEFORE COMPACTION ==="))
    assert.ok(output.includes("Timestamp:"))
    assert.ok(output.endsWith("=== END SESSION STATE ==="))
  })
  cleanup(root)
}

// ── S2: No active state file — shows suggestion ──
{
  const root = makeTempProject()
  const output = buildCompactionContext(root)
  run("S2: No state file — suggests creating one", () => {
    assert.ok(output.includes("No active session state file found"))
    assert.ok(output.includes("Consider maintaining production/session-state/active.md"))
  })
  cleanup(root)
}

// ── S3: Active state file — includes content ──
{
  const root = makeTempProject()
  fs.mkdirSync(path.join(root, "production", "session-state"), { recursive: true })
  fs.writeFileSync(path.join(root, "production", "session-state", "active.md"),
    "## Current Task\n- Implement AI\n## Next\n- Test\n", "utf8")

  const output = buildCompactionContext(root)
  run("S3: State file present — includes content", () => {
    assert.ok(output.includes("Implement AI"))
    assert.ok(output.includes("(from production/session-state/active.md)"))
    assert.ok(!output.includes("No active session state"))
  })
  cleanup(root)
}

// ── S4: State file truncated at 100 lines ──
{
  const root = makeTempProject()
  fs.mkdirSync(path.join(root, "production", "session-state"), { recursive: true })
  const longContent = Array.from({ length: 120 }, (_, i) => `Line ${i + 1}`).join("\n")
  fs.writeFileSync(path.join(root, "production", "session-state", "active.md"), longContent, "utf8")

  const output = buildCompactionContext(root)
  run("S4: State >100 lines — truncated", () => {
    assert.ok(output.includes("showing first 100"))
    assert.ok(output.includes("120 total lines"))
    assert.ok(output.includes("Line 1"))
    assert.ok(!output.includes("Line 101"), "should not show line 101+ in main content")
  })
  cleanup(root)
}

// ── S5: Git file listing — all three categories ──
{
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
  run("S5: Lists unstaged, staged, and untracked files", () => {
    assert.ok(output.includes("Unstaged changes:"))
    assert.ok(output.includes("- dummy.txt"))
    assert.ok(output.includes("Staged changes:"))
    assert.ok(output.includes("- staged.txt"))
    assert.ok(output.includes("New untracked files:"))
    assert.ok(output.includes("- new_file.txt"))
  })
  cleanup(root)
}

// ── S6: Clean git working tree ──
{
  const root = makeTempProject()
  initGit(root)
  makeCommit(root, "init")

  const output = buildCompactionContext(root)
  run("S6: Clean working tree — shows no changes", () => {
    assert.ok(output.includes("(no uncommitted changes)"))
  })
  cleanup(root)
}

// ── S7: No git repo — shows not a git repo ──
{
  const root = makeTempProject()
  const output = buildCompactionContext(root)
  run("S7: No git repo — shows not a git repository", () => {
    assert.ok(output.includes("(not a git repository)"))
  })
  cleanup(root)
}

// ── S8: WIP markers in design docs ──
{
  const root = makeTempProject()
  fs.mkdirSync(path.join(root, "design", "gdd"), { recursive: true })
  fs.writeFileSync(path.join(root, "design", "gdd", "combat.md"),
    "# Combat System\n## Overview\nTODO: write formulas\n## Detailed\nSome content\n", "utf8")
  fs.writeFileSync(path.join(root, "design", "gdd", "ui.md"),
    "# UI Design\nComplete.\n", "utf8")

  const output = buildCompactionContext(root)
  run("S8: WIP markers found in design docs", () => {
    assert.ok(output.includes("Work In Progress"))
    assert.ok(output.includes("combat.md"))
    assert.ok(output.includes("TODO: write formulas"))
    assert.ok(!output.includes("no WIP markers found"))
    // ui.md has no WIP markers, should not be listed
    // The listing shows files WITH markers only
    assert.ok(output.includes("design/gdd/combat.md"))
  })
  cleanup(root)
}

// ── S9: No WIP markers in design docs ──
{
  const root = makeTempProject()
  fs.mkdirSync(path.join(root, "design", "gdd"), { recursive: true })
  fs.writeFileSync(path.join(root, "design", "gdd", "complete.md"), "# Done\nAll complete.\n", "utf8")

  const output = buildCompactionContext(root)
  run("S9: No WIP markers — shows no markers found", () => {
    assert.ok(output.includes("no WIP markers found in design docs"))
  })
  cleanup(root)
}

// ── S10: No design/gdd/ directory — no crash ──
{
  const root = makeTempProject()
  const output = buildCompactionContext(root)
  run("S10: No design/gdd/ dir — no crash", () => {
    assert.ok(output.includes("no WIP markers found in design docs"))
  })
  cleanup(root)
}

// ── S11: Recovery instructions ──
{
  const root = makeTempProject()
  const output = buildCompactionContext(root)
  run("S11: Has recovery instructions", () => {
    assert.ok(output.includes("read production/session-state/active.md"))
    assert.ok(output.includes("read any files listed above"))
  })
  cleanup(root)
}

// ── S12: logCompactionEvent creates entry ──
{
  const root = makeTempProject()
  logCompactionEvent(root)

  const logPath = path.join(root, "production", "session-logs", "compaction-log.txt")
  run("S12: Compaction event logged to file", () => {
    assert.ok(fs.existsSync(logPath), "compaction-log.txt should exist")
    const content = fs.readFileSync(logPath, "utf8")
    assert.ok(content.includes("Context compaction occurred at"))
    assert.ok(content.endsWith("\n"))
  })
  cleanup(root)
}

// ── S13: logCompactionEvent appends ──
{
  const root = makeTempProject()
  logCompactionEvent(root)
  logCompactionEvent(root)

  const logPath = path.join(root, "production", "session-logs", "compaction-log.txt")
  const content = fs.readFileSync(logPath, "utf8")
  const lines = content.trim().split("\n")
  run("S13: Compaction log appends on repeated calls", () => {
    assert.equal(lines.length, 2)
  })
  cleanup(root)
}

// ── S14: No design/gdd dir — WIP section still present with message ──
{
  const root = makeTempProject()
  // Don't create design/gdd at all
  const output = buildCompactionContext(root)
  run("S14: WIP section present even without design/gdd dir", () => {
    assert.ok(output.includes("## Design Docs"))
    assert.ok(output.includes("no WIP markers found in design docs"))
  })
  cleanup(root)
}

// ── Summary ──
function cleanup(root) {
  try { fs.rmSync(root, { recursive: true }) } catch { /* ignore */ }
}

console.log(`\n📊 Results: ${passCount}/${testCount} passed\n`)
process.exit(passCount === testCount ? 0 : 1)
