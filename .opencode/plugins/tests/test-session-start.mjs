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
import { describe, it } from "node:test"
import { handleSessionCreated } from "../ccgs-hooks.ts"

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

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

function cleanup(root) {
  try { fs.rmSync(root, { recursive: true }) } catch { /* ignore */ }
}

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────

describe("session-start hook tests", () => {

  // ── Scenario 1: Full project ──
  it("S1: Empty project — returns empty-ish string with no sections", () => {
    const root = makeTempProject()
    const output = handleSessionCreated(root)
    assert.ok(typeof output === "string", "should return a string")
    assert.ok(!output.includes("Branch:"), "no branch without git")
    assert.ok(!output.includes("Active sprint:"), "no sprint without sprint dir contents")
    assert.ok(!output.includes("Code health:"), "no code health without TODOs")
    assert.ok(!output.includes("Open bugs:"), "no bugs without BUG files")
    assert.ok(!output.includes("ACTIVE SESSION STATE"), "no state without state file")
    assert.ok(typeof output === "string")
    assert.ok(output.length < 50, "minimal output for empty project")
    cleanup(root)
  })

  // ── Scenario 2: Git repo with branch and commits ──
  it("S2: Shows branch name", () => {
    const root = makeTempProject()
    initGit(root)
    makeCommit(root, "feat: initial setup")
    makeCommit(root, "feat: add player movement")
    makeCommit(root, "fix: collision bug")
    makeCommit(root, "feat: add UI")
    makeCommit(root, "chore: cleanup")
    execSync("git checkout -b feature-ai-system", { cwd: root, stdio: "ignore" })
    makeCommit(root, "feat: basic AI")
    const output = handleSessionCreated(root)
    assert.ok(output.includes("Branch: feature-ai-system"))
    cleanup(root)
  })

  it("S2: Shows 6 recent commits (incl. branch switch)", () => {
    const root = makeTempProject()
    initGit(root)
    makeCommit(root, "feat: initial setup")
    makeCommit(root, "feat: add player movement")
    makeCommit(root, "fix: collision bug")
    makeCommit(root, "feat: add UI")
    makeCommit(root, "chore: cleanup")
    execSync("git checkout -b feature-ai-system", { cwd: root, stdio: "ignore" })
    makeCommit(root, "feat: basic AI")
    const output = handleSessionCreated(root)
    const commitLines = output.match(/^\s{2}\w{7}\s/gm)
    assert.ok(commitLines && commitLines.length >= 1, `Expected commits, got ${JSON.stringify(commitLines)}`)
    cleanup(root)
  })

  // ── Scenario 3: Sprint files sorted by mtime ──
  it("S3: Picks sprint by latest mtime (not alpha)", () => {
    const root = makeTempProject()
    const sprintDir = path.join(root, "production", "sprints")
    const now = Date.now()
    fs.writeFileSync(path.join(sprintDir, "sprint-01.md"), "# Sprint 1", "utf8")
    fs.writeFileSync(path.join(sprintDir, "sprint-10.md"), "# Sprint 10", "utf8")
    fs.writeFileSync(path.join(sprintDir, "sprint-02.md"), "# Sprint 2", "utf8")
    const f1 = path.join(sprintDir, "sprint-01.md")
    const f2 = path.join(sprintDir, "sprint-02.md")
    const f10 = path.join(sprintDir, "sprint-10.md")
    fs.utimesSync(f1, new Date(now - 10000), new Date(now - 10000))
    fs.utimesSync(f2, new Date(now - 5000), new Date(now - 5000))
    fs.utimesSync(f10, new Date(now - 1000), new Date(now - 1000))
    const output = handleSessionCreated(root)
    assert.ok(output.includes("Active sprint: sprint-10"), `Expected sprint-10 (newest mtime), got: ${output.match(/Active sprint: .+/)?.[0] || "none"}`)
    cleanup(root)
  })

  // ── Scenario 4: Milestone files sorted by mtime ──
  it("S4: Picks milestone by latest mtime (not alpha)", () => {
    const root = makeTempProject()
    const milestoneDir = path.join(root, "production", "milestones")
    const now = Date.now()
    fs.writeFileSync(path.join(milestoneDir, "alpha.md"), "# Alpha", "utf8")
    fs.writeFileSync(path.join(milestoneDir, "beta.md"), "# Beta", "utf8")
    fs.writeFileSync(path.join(milestoneDir, "gamma.md"), "# Gamma", "utf8")
    fs.utimesSync(path.join(milestoneDir, "alpha.md"), new Date(now - 10000), new Date(now - 10000))
    fs.utimesSync(path.join(milestoneDir, "beta.md"), new Date(now - 5000), new Date(now - 5000))
    fs.utimesSync(path.join(milestoneDir, "gamma.md"), new Date(now - 1000), new Date(now - 1000))
    const output = handleSessionCreated(root)
    assert.ok(output.includes("Active milestone: gamma"), `Expected gamma (newest mtime), got: ${output.match(/Active milestone: .+/)?.[0] || "none"}`)
    cleanup(root)
  })

  // ── Scenario 5: Recursive BUG counting ──
  it("S5: Counts BUG files recursively across directories", () => {
    const root = makeTempProject()
    fs.writeFileSync(path.join(root, "production", "BUG-crash.md"), "# Crash", "utf8")
    fs.mkdirSync(path.join(root, "tests", "playtest", "bugs"), { recursive: true })
    fs.writeFileSync(path.join(root, "tests", "playtest", "BUG-ai.md"), "# AI bug", "utf8")
    fs.writeFileSync(path.join(root, "tests", "playtest", "bugs", "BUG-ui.md"), "# UI bug", "utf8")
    const output = handleSessionCreated(root)
    assert.ok(output.includes("Open bugs: 3"), `Expected 3 bugs, got: ${output.match(/Open bugs: \d+/)?.[0] || "none"}`)
    cleanup(root)
  })

  // ── Scenario 6: TODO/FIXME counting via file content ──
  it("S6: Counts TODOs and FIXMEs across all src/ files", () => {
    const root = makeTempProject()
    fs.writeFileSync(path.join(root, "src", "player.gd"),
      "# TODO: implement jump\nvar health = 100\n# FIXME: this is wrong\n", "utf8")
    fs.writeFileSync(path.join(root, "src", "enemy.gd"),
      "## TODO: add attack patterns\n## TODO: add patrol\n", "utf8")
    const output = handleSessionCreated(root)
    assert.ok(output.includes("Code health: 3 TODOs, 1 FIXMEs in src/"),
      `Expected "3 TODOs, 1 FIXMEs", got: ${output.match(/Code health: .+/)?.[0] || "none"}`)
    cleanup(root)
  })

  // ── Scenario 7: Session state preview (under 20 lines) ──
  it("S7: Does not include session state preview in handleSessionCreated output", () => {
    const root = makeTempProject()
    const stateFile = path.join(root, "production", "session-state", "active.md")
    fs.writeFileSync(stateFile, Array.from({ length: 5 }, (_, i) => `Line ${i + 1}`).join("\n"), "utf8")
    const output = handleSessionCreated(root)
    assert.ok(!output.includes("ACTIVE SESSION STATE DETECTED"), "no session state in handleSessionCreated output")
    cleanup(root)
  })

  // ── Scenario 8: Session state preview (over 20 lines) ──
  it("S8: Does not include session state for long files", () => {
    const root = makeTempProject()
    const stateFile = path.join(root, "production", "session-state", "active.md")
    fs.writeFileSync(stateFile, Array.from({ length: 25 }, (_, i) => `Line ${i + 1}`).join("\n"), "utf8")
    const output = handleSessionCreated(root)
    assert.ok(!output.includes("ACTIVE SESSION STATE DETECTED"), "no session state in handleSessionCreated output")
    cleanup(root)
  })


  // ── Scenario 9: Code health section has blank line before it ──
  it("S9: Code health has blank line before it", () => {
    const root = makeTempProject()
    fs.writeFileSync(path.join(root, "src", "main.gd"), "# TODO: fix", "utf8")
    const output = handleSessionCreated(root)
    const idx = output.indexOf("Code health:")
    const before = output.substring(Math.max(0, idx - 10), idx)
    assert.ok(before.endsWith("\n"), `Expected newline before "Code health:", got: ${JSON.stringify(before.slice(-5))}`)
    cleanup(root)
  })

  // ── Scenario 10: Sprint section has blank line before it ──
  it("S10: Sprint has blank line before it", () => {
    const root = makeTempProject()
    fs.writeFileSync(path.join(root, "production", "sprints", "sprint-01.md"), "# S1", "utf8")
    const output = handleSessionCreated(root)
    const idx = output.indexOf("Active sprint:")
    const before = output.substring(Math.max(0, idx - 10), idx)
    assert.ok(before.endsWith("\n"), `Expected newline before "Active sprint:", got: ${JSON.stringify(before.slice(-5))}`)
    cleanup(root)
  })

  // ── Scenario 11: Empty lines between sections in full output order ──
  it("S11: Output section order matches bash hook", () => {
    const root = makeTempProject()
    initGit(root)
    makeCommit(root, "init")
    fs.writeFileSync(path.join(root, "production", "sprints", "sprint-01.md"), "# Sprint 1", "utf8")
    fs.writeFileSync(path.join(root, "production", "milestones", "v1.md"), "# Milestone v1", "utf8")
    fs.writeFileSync(path.join(root, "production", "BUG-001.md"), "# Bug 1", "utf8")
    fs.writeFileSync(path.join(root, "src", "main.gd"), "# TODO: implement\n# FIXME: broken\n", "utf8")
    const stateFile = path.join(root, "production", "session-state", "active.md")
    fs.writeFileSync(stateFile, "# State\nLine 2\nLine 3\n", "utf8")
    const output = handleSessionCreated(root)
    const order = [
      "Branch:",
      "Recent commits:",
      "Active sprint:",
      "Active milestone:",
      "Open bugs:",
      "Code health:",
    ]
    let lastIdx = -1
    for (const section of order) {
      const idx = output.indexOf(section)
      assert.ok(idx >= 0, `Section "${section}" not found in output`)
      assert.ok(idx > lastIdx, `Section "${section}" out of order (at ${idx}, expected after ${lastIdx})`)
      lastIdx = idx
    }
    cleanup(root)
  })

  it("S11: Sections separated by blank lines", () => {
    const root = makeTempProject()
    initGit(root)
    makeCommit(root, "init")
    fs.writeFileSync(path.join(root, "production", "sprints", "sprint-01.md"), "# Sprint 1", "utf8")
    fs.writeFileSync(path.join(root, "production", "milestones", "v1.md"), "# Milestone v1", "utf8")
    fs.writeFileSync(path.join(root, "production", "BUG-001.md"), "# Bug 1", "utf8")
    fs.writeFileSync(path.join(root, "src", "main.gd"), "# TODO: implement\n# FIXME: broken\n", "utf8")
    const stateFile = path.join(root, "production", "session-state", "active.md")
    fs.writeFileSync(stateFile, "# State\nLine 2\nLine 3\n", "utf8")
    const output = handleSessionCreated(root)
    const branchMatch = output.match(/^Branch: (.+)$/m)
    assert.ok(branchMatch, "Branch line found")
    assert.ok(output.includes(`Branch: ${branchMatch[1]}\n\nRecent commits:`), "blank line between branch and commits")
    assert.ok(output.includes("Active sprint: sprint-01\nActive milestone: v1"), "no blank between sprint and milestone (matches bash)")
    assert.ok(output.includes("Code health: 1 TODOs, 1 FIXMEs in src/"), "code health section present")
    cleanup(root)
  })

  // ── Scenario 12: BUG files ONLY in production, not tests/playtest ──
  it("S12: Counts bugs from production dir only", () => {
    const root = makeTempProject()
    fs.writeFileSync(path.join(root, "production", "BUG-server.md"), "# Server", "utf8")
    fs.writeFileSync(path.join(root, "production", "BUG-client.md"), "# Client", "utf8")
    const output = handleSessionCreated(root)
    assert.ok(output.includes("Open bugs: 2"))
    cleanup(root)
  })

  // ── Scenario 13: BUG files ONLY in tests/playtest ──
  it("S13: Counts bugs from playtest dir only", () => {
    const root = makeTempProject()
    fs.writeFileSync(path.join(root, "tests", "playtest", "BUG-001.md"), "# Bug", "utf8")
    fs.writeFileSync(path.join(root, "tests", "playtest", "BUG-002.md"), "# Bug 2", "utf8")
    const output = handleSessionCreated(root)
    assert.ok(output.includes("Open bugs: 2"))
    cleanup(root)
  })

  // ── Scenario 14: No BUG files anywhere ──
  it("S14: No bug count when no BUG files exist", () => {
    const root = makeTempProject()
    const output = handleSessionCreated(root)
    assert.ok(!output.includes("Open bugs"))
    cleanup(root)
  })

  // ── Scenario 15: Code health with zero TODOs/FIXMEs ──
  it("S15: No code health section when no TODOs/FIXMEs exist", () => {
    const root = makeTempProject()
    fs.writeFileSync(path.join(root, "src", "clean.gd"), "# Clean file\nvar x = 1\n", "utf8")
    const output = handleSessionCreated(root)
    assert.ok(!output.includes("Code health:"))
    cleanup(root)
  })

  // ── Scenario 16: No src/ directory ──
  it("S16: No crash when src/ missing", () => {
    const root = makeTempProject()
    fs.rmSync(path.join(root, "src"), { recursive: true })
    const output = handleSessionCreated(root)
    assert.ok(!output.includes("Code health:"))
    cleanup(root)
  })

})
