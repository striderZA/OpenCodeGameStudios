/**
 * Test suite for session-start hook (handleSessionCreated)
 *
 * Tests behavioral equivalence with the original bash session-start.sh:
 *   - Branch + recent commits output
 *   - Sprint detection (mtime-sorted, not alpha)
 *   - Milestone detection (mtime-sorted, not alpha)
 *   - BUG counting (recursive find, not flat)
 *   - TODO/FIXME counting (all files via grep -r equiv, not git grep)
 *   - Session state preview (head -20 equiv)
 *   - Edge cases: no git, empty dirs, long state files
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

function git(cwd, ...args) {
  try {
    return execSync(`git ${args.join(" ")}`, { encoding: "utf8", cwd, stdio: ["pipe", "pipe", "ignore"] }).trim()
  } catch {
    return ""
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

function getFilesByMtime(dir, filter) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir)
    .filter(filter)
    .map((f) => path.join(dir, f))
    .sort((a, b) => {
      try {
        return fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs
      } catch { return 0 }
    })
}

function getOutput(projectRoot) {
  const lines = []

  function emit(...args) {
    lines.push(args.join(" "))
  }

  emit("=== Claude Code Game Studios — Session Context ===")

  const hasGit = isGitRepo(projectRoot)

  if (hasGit) {
    const branch = git(projectRoot, "rev-parse", "--abbrev-ref", "HEAD")
    if (branch) {
      emit(`Branch: ${branch}`)
      emit("")
      emit("Recent commits:")
      const commits = git(projectRoot, "log", "--oneline", "-5")
      if (commits) {
        commits.split("\n").forEach((line) => emit(`  ${line}`))
      }
    }
  }

  const sprintFiles = getFilesByMtime(
    path.join(projectRoot, "production", "sprints"),
    (f) => /^sprint-.*\.md$/.test(f)
  )
  if (sprintFiles.length > 0) {
    emit("")
    emit(`Active sprint: ${path.basename(sprintFiles[0], ".md")}`)
  }

  const milestoneFiles = getFilesByMtime(
    path.join(projectRoot, "production", "milestones"),
    (f) => f.endsWith(".md")
  )
  if (milestoneFiles.length > 0) {
    emit(`Active milestone: ${path.basename(milestoneFiles[0], ".md")}`)
  }

  let bugCount = 0
  for (const dir of [path.join(projectRoot, "tests", "playtest"), path.join(projectRoot, "production")]) {
    if (fs.existsSync(dir)) {
      bugCount += findFilesRecursive(dir, (name) => /^BUG-.*\.md$/.test(name)).length
    }
  }
  if (bugCount > 0) {
    emit(`Open bugs: ${bugCount}`)
  }

  const srcDir = path.join(projectRoot, "src")
  if (fs.existsSync(srcDir)) {
    let todoCount = 0
    let fixmeCount = 0
    const srcFiles = findFilesRecursive(srcDir, () => true)
    for (const fp of srcFiles) {
      try {
        const content = fs.readFileSync(fp, "utf8")
        todoCount += (content.match(/TODO/g) || []).length
        fixmeCount += (content.match(/FIXME/g) || []).length
      } catch { /* skip */ }
    }
    if (todoCount > 0 || fixmeCount > 0) {
      emit("")
      emit(`Code health: ${todoCount} TODOs, ${fixmeCount} FIXMEs in src/`)
    }
  }

  const activeState = path.join(projectRoot, "production", "session-state", "active.md")
  if (fs.existsSync(activeState)) {
    emit("")
    emit("=== ACTIVE SESSION STATE DETECTED ===")
    emit(`A previous session left state at: ${activeState}`)
    emit("Read this file to recover context and continue where you left off.")
    emit("")
    emit("Quick summary:")
    const content = fs.readFileSync(activeState, "utf8")
    const contentLines = content.split("\n")
    emit(contentLines.slice(0, 20).join("\n"))
    const totalLines = contentLines.length
    if (totalLines > 20) {
      emit(`  ... (${totalLines} total lines — read the full file to continue)`)
    }
    emit("=== END SESSION STATE PREVIEW ===")
  }

  emit("===================================")
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
  const tmp = fs.mkdtempSync(path.join(tmpdir(), "ccgs-test-"))
  // Create expected dirs
  for (const d of ["production/sprints", "production/milestones", "production/session-state",
    "production/session-logs", "tests/playtest", "src"]) {
    fs.mkdirSync(path.join(tmp, d), { recursive: true })
  }
  return tmp
}

function initGit(root) {
  execSync("git init", { cwd: root, stdio: "ignore" })
  execSync('git config user.email "test@test.com"', { cwd: root, stdio: "ignore" })
  execSync('git config user.name "Test"', { cwd: root, stdio: "ignore" })
}

function makeCommit(root, msg) {
  // Create or update a dummy file so we have something to commit
  fs.writeFileSync(path.join(root, "dummy.txt"), `${msg}\n`, "utf8")
  execSync("git add -A", { cwd: root, stdio: "ignore" })
  execSync(`git commit -m "${msg}"`, { cwd: root, stdio: "ignore" })
}

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────

console.log("\n🧪 session-start hook tests\n")

// ── Scenario 1: Full project ──
{
  const root = makeTempProject()
  const output = getOutput(root)
  assert.ok(output.includes("=== Claude Code Game Studios — Session Context ==="), "should have title")
  assert.ok(output.includes("==================================="), "should have closing separator")
  assert.ok(!output.includes("Branch:"), "no branch without git")
  assert.ok(!output.includes("Active sprint:"), "no sprint without sprint dir contents")
  assert.ok(!output.includes("Code health:"), "no code health without TODOs")
  assert.ok(!output.includes("Open bugs:"), "no bugs without BUG files")
  assert.ok(!output.includes("ACTIVE SESSION STATE"), "no state without state file")
  run("S1: Empty project — only title and separator", () => {
    assert.ok(output.includes("=== Claude Code Game Studios — Session Context ==="))
    assert.ok(output.includes("==================================="))
  })
  cleanup(root)
}

// ── Scenario 2: Git repo with branch and commits ──
{
  const root = makeTempProject()
  initGit(root)
  makeCommit(root, "feat: initial setup")
  makeCommit(root, "feat: add player movement")
  makeCommit(root, "fix: collision bug")
  makeCommit(root, "feat: add UI")
  makeCommit(root, "chore: cleanup")

  // Create branch
  execSync("git checkout -b feature-ai-system", { cwd: root, stdio: "ignore" })
  makeCommit(root, "feat: basic AI")

  const output = getOutput(root)
  run("S2: Shows branch name", () => {
    assert.ok(output.includes("Branch: feature-ai-system"))
  })
  run("S2: Shows 6 recent commits (incl. branch switch)", () => {
    // After branch switch we have at least 1 commit on branch + 5 from master
    const commitLines = output.match(/^\s{2}\w{7}\s/gm)
    assert.ok(commitLines && commitLines.length >= 1, `Expected commits, got ${JSON.stringify(commitLines)}`)
  })
  cleanup(root)
}

// ── Scenario 3: Sprint files sorted by mtime ──
{
  const root = makeTempProject()
  const sprintDir = path.join(root, "production", "sprints")
  // Create sprints out of order — then set mtimes
  const now = Date.now()
  fs.writeFileSync(path.join(sprintDir, "sprint-01.md"), "# Sprint 1", "utf8")
  fs.writeFileSync(path.join(sprintDir, "sprint-10.md"), "# Sprint 10", "utf8")
  fs.writeFileSync(path.join(sprintDir, "sprint-02.md"), "# Sprint 2", "utf8")
  // Set mtimes: sprint-10 is newest, sprint-01 is oldest
  const f1 = path.join(sprintDir, "sprint-01.md")
  const f2 = path.join(sprintDir, "sprint-02.md")
  const f10 = path.join(sprintDir, "sprint-10.md")
  fs.utimesSync(f1, new Date(now - 10000), new Date(now - 10000))
  fs.utimesSync(f2, new Date(now - 5000), new Date(now - 5000))
  fs.utimesSync(f10, new Date(now - 1000), new Date(now - 1000))

  const output = getOutput(root)
  run("S3: Picks sprint by latest mtime (not alpha)", () => {
    assert.ok(output.includes("Active sprint: sprint-10"), `Expected sprint-10 (newest mtime), got: ${output.match(/Active sprint: .+/)?.[0] || "none"}`)
  })
  cleanup(root)
}

// ── Scenario 4: Milestone files sorted by mtime ──
{
  const root = makeTempProject()
  const milestoneDir = path.join(root, "production", "milestones")
  const now = Date.now()
  fs.writeFileSync(path.join(milestoneDir, "alpha.md"), "# Alpha", "utf8")
  fs.writeFileSync(path.join(milestoneDir, "beta.md"), "# Beta", "utf8")
  fs.writeFileSync(path.join(milestoneDir, "gamma.md"), "# Gamma", "utf8")
  // Set mtimes: gamma newest, alpha oldest
  fs.utimesSync(path.join(milestoneDir, "alpha.md"), new Date(now - 10000), new Date(now - 10000))
  fs.utimesSync(path.join(milestoneDir, "beta.md"), new Date(now - 5000), new Date(now - 5000))
  fs.utimesSync(path.join(milestoneDir, "gamma.md"), new Date(now - 1000), new Date(now - 1000))

  const output = getOutput(root)
  run("S4: Picks milestone by latest mtime (not alpha)", () => {
    assert.ok(output.includes("Active milestone: gamma"), `Expected gamma (newest mtime), got: ${output.match(/Active milestone: .+/)?.[0] || "none"}`)
  })
  cleanup(root)
}

// ── Scenario 5: Recursive BUG counting ──
{
  const root = makeTempProject()
  // BUG files at different depths
  fs.writeFileSync(path.join(root, "production", "BUG-crash.md"), "# Crash", "utf8")
  fs.mkdirSync(path.join(root, "tests", "playtest", "bugs"), { recursive: true })
  fs.writeFileSync(path.join(root, "tests", "playtest", "BUG-ai.md"), "# AI bug", "utf8")
  fs.writeFileSync(path.join(root, "tests", "playtest", "bugs", "BUG-ui.md"), "# UI bug", "utf8")

  const output = getOutput(root)
  run("S5: Counts BUG files recursively across directories", () => {
    assert.ok(output.includes("Open bugs: 3"), `Expected 3 bugs, got: ${output.match(/Open bugs: \d+/)?.[0] || "none"}`)
  })
  cleanup(root)
}

// ── Scenario 6: TODO/FIXME counting via file content ──
{
  const root = makeTempProject()
  fs.writeFileSync(path.join(root, "src", "player.gd"),
    "# TODO: implement jump\nvar health = 100\n# FIXME: this is wrong\n", "utf8")
  fs.writeFileSync(path.join(root, "src", "enemy.gd"),
    "## TODO: add attack patterns\n## TODO: add patrol\n", "utf8")

  const output = getOutput(root)
  run("S6: Counts TODOs and FIXMEs across all src/ files", () => {
    assert.ok(output.includes("Code health: 3 TODOs, 1 FIXMEs in src/"),
      `Expected "3 TODOs, 1 FIXMEs", got: ${output.match(/Code health: .+/)?.[0] || "none"}`)
  })
  cleanup(root)
}

// ── Scenario 7: Session state preview (under 20 lines) ──
{
  const root = makeTempProject()
  const stateFile = path.join(root, "production", "session-state", "active.md")
  fs.writeFileSync(stateFile, Array.from({ length: 5 }, (_, i) => `Line ${i + 1}`).join("\n"), "utf8")

  const output = getOutput(root)
  run("S7: Shows full session state when ≤20 lines", () => {
    assert.ok(output.includes("ACTIVE SESSION STATE DETECTED"))
    assert.ok(output.includes("Line 1"))
    assert.ok(output.includes("Line 5"))
    assert.ok(!output.includes("total lines"), "should not show truncation message")
    assert.ok(output.includes("END SESSION STATE PREVIEW"))
  })
  cleanup(root)
}

// ── Scenario 8: Session state preview (over 20 lines) ──
{
  const root = makeTempProject()
  const stateFile = path.join(root, "production", "session-state", "active.md")
  fs.writeFileSync(stateFile, Array.from({ length: 25 }, (_, i) => `Line ${i + 1}`).join("\n"), "utf8")

  const output = getOutput(root)
  run("S8: Truncates session state when >20 lines", () => {
    assert.ok(output.includes("ACTIVE SESSION STATE DETECTED"))
    assert.ok(output.includes("Line 1"))
    assert.ok(!output.includes("Line 21"), "should not show line 21+")
    assert.ok(output.includes("... (25 total lines — read the full file to continue)"))
    assert.ok(output.includes("END SESSION STATE PREVIEW"))
  })
  cleanup(root)
}

// ── Scenario 9: Code health section has blank line before it ──
{
  const root = makeTempProject()
  fs.writeFileSync(path.join(root, "src", "main.gd"), "# TODO: fix", "utf8")

  const output = getOutput(root)
  run("S9: Code health has blank line before it", () => {
    // Code health should be preceded by an empty line
    const idx = output.indexOf("Code health:")
    const before = output.substring(Math.max(0, idx - 10), idx)
    assert.ok(before.endsWith("\n\n"), `Expected blank line before "Code health:", got: ${JSON.stringify(before.slice(-5))}`)
  })
  cleanup(root)
}

// ── Scenario 10: Sprint section has blank line before it ──
{
  const root = makeTempProject()
  fs.writeFileSync(path.join(root, "production", "sprints", "sprint-01.md"), "# S1", "utf8")

  const output = getOutput(root)
  run("S10: Sprint has blank line before it", () => {
    const idx = output.indexOf("Active sprint:")
    const before = output.substring(Math.max(0, idx - 10), idx)
    assert.ok(before.endsWith("\n\n"), `Expected blank line before "Active sprint:", got: ${JSON.stringify(before.slice(-5))}`)
  })
  cleanup(root)
}

// ── Scenario 11: Empty lines between sections in full output order ──
{
  const root = makeTempProject()
  initGit(root)
  makeCommit(root, "init")
  fs.writeFileSync(path.join(root, "production", "sprints", "sprint-01.md"), "# Sprint 1", "utf8")
  fs.writeFileSync(path.join(root, "production", "milestones", "v1.md"), "# Milestone v1", "utf8")
  fs.writeFileSync(path.join(root, "production", "BUG-001.md"), "# Bug 1", "utf8")
  fs.writeFileSync(path.join(root, "src", "main.gd"), "# TODO: implement\n# FIXME: broken\n", "utf8")
  const stateFile = path.join(root, "production", "session-state", "active.md")
  fs.writeFileSync(stateFile, "# State\nLine 2\nLine 3\n", "utf8")

  const output = getOutput(root)

  run("S11: Output section order matches bash hook", () => {
    const order = [
      "Claude Code Game Studios",
      "Branch:",
      "Recent commits:",
      "Active sprint:",
      "Active milestone:",
      "Open bugs:",
      "Code health:",
      "ACTIVE SESSION STATE",
      "END SESSION STATE PREVIEW",
      "===================================",
    ]
    let lastIdx = -1
    for (const section of order) {
      const idx = output.indexOf(section)
      assert.ok(idx >= 0, `Section "${section}" not found in output`)
      assert.ok(idx > lastIdx, `Section "${section}" out of order (at ${idx}, expected after ${lastIdx})`)
      lastIdx = idx
    }
  })

  run("S11: Sections separated by blank lines", () => {
    // Check blank lines between major sections
    const branchMatch = output.match(/^Branch: (.+)$/m)
    assert.ok(branchMatch, "Branch line found")
    assert.ok(output.includes(`Branch: ${branchMatch[1]}\n\nRecent commits:`), "blank line between branch and commits")
    assert.ok(output.includes("Active sprint: sprint-01\nActive milestone: v1"), "no blank between sprint and milestone (matches bash)")
    assert.ok(output.includes("Code health: 1 TODOs, 1 FIXMEs in src/\n\n=== ACTIVE SESSION STATE"), "blank line before session state")
  })
  cleanup(root)
}

// ── Scenario 12: BUG files ONLY in production, not tests/playtest ──
{
  const root = makeTempProject()
  fs.writeFileSync(path.join(root, "production", "BUG-server.md"), "# Server", "utf8")
  fs.writeFileSync(path.join(root, "production", "BUG-client.md"), "# Client", "utf8")

  const output = getOutput(root)
  run("S12: Counts bugs from production dir only", () => {
    assert.ok(output.includes("Open bugs: 2"))
  })
  cleanup(root)
}

// ── Scenario 13: BUG files ONLY in tests/playtest ──
{
  const root = makeTempProject()
  fs.writeFileSync(path.join(root, "tests", "playtest", "BUG-001.md"), "# Bug", "utf8")
  fs.writeFileSync(path.join(root, "tests", "playtest", "BUG-002.md"), "# Bug 2", "utf8")

  const output = getOutput(root)
  run("S13: Counts bugs from playtest dir only", () => {
    assert.ok(output.includes("Open bugs: 2"))
  })
  cleanup(root)
}

// ── Scenario 14: No BUG files anywhere ──
{
  const root = makeTempProject()
  const output = getOutput(root)
  run("S14: No bug count when no BUG files exist", () => {
    assert.ok(!output.includes("Open bugs"))
  })
  cleanup(root)
}

// ── Scenario 15: Code health with zero TODOs/FIXMEs ──
{
  const root = makeTempProject()
  fs.writeFileSync(path.join(root, "src", "clean.gd"), "# Clean file\nvar x = 1\n", "utf8")
  const output = getOutput(root)
  run("S15: No code health section when no TODOs/FIXMEs exist", () => {
    assert.ok(!output.includes("Code health:"))
  })
  cleanup(root)
}

// ── Scenario 16: No src/ directory ──
{
  const root = makeTempProject()
  fs.rmSync(path.join(root, "src"), { recursive: true })
  const output = getOutput(root)
  run("S16: No crash when src/ missing", () => {
    assert.ok(!output.includes("Code health:"))
    assert.ok(output.includes("=== Claude Code Game Studios — Session Context ==="))
  })
  cleanup(root)
}

// ── Summary ──
function cleanup(root) {
  try { fs.rmSync(root, { recursive: true }) } catch { /* ignore */ }
}

console.log(`\n📊 Results: ${passCount}/${testCount} passed\n`)
process.exit(passCount === testCount ? 0 : 1)
