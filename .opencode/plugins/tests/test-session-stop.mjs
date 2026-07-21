/**
 * Test suite for session-stop hook (handleSessionIdle)
 *
 * Tests behavioral equivalence with the original bash session-stop.sh:
 *   - Archives active session state to session-log.md
 *   - Logs recent commits and modified files
 *   - Timestamp format: YYYY-MM-DDTHH-MM-SS
 *   - Section headers: ## Archived Session State, ## Session End, etc.
 */

import * as fs from "node:fs"
import * as path from "node:path"
import { execSync } from "node:child_process"
import { tmpdir } from "node:os"
import { strict as assert } from "node:assert"
import { describe, it } from "node:test"

import { handleSessionIdle, handleLogAgentStop } from "../ccgs-hooks.ts"

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function makeTempProject() {
  const tmp = fs.mkdtempSync(path.join(tmpdir(), "ccgs-stop-test-"))
  for (const d of ["production/session-logs", "production/session-state", "src"]) {
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
  fs.writeFileSync(path.join(root, "dummy.txt"), `${msg}\n`, "utf8")
  execSync("git add -A", { cwd: root, stdio: "ignore" })
  execSync(`git commit -m "${msg}"`, { cwd: root, stdio: "ignore" })
}

function readLog(root) {
  const logPath = path.join(root, "production", "session-logs", "session-log.md")
  if (!fs.existsSync(logPath)) return ""
  return fs.readFileSync(logPath, "utf8")
}

function cleanup(root) {
  try { fs.rmSync(root, { recursive: true }) } catch { /* ignore */ }
}

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────

describe("session-stop hook tests", () => {

  it("S1: Archives session state to session-log.md", () => {
    const root = makeTempProject()
    try {
      const stateFile = path.join(root, "production", "session-state", "active.md")
      fs.writeFileSync(stateFile, "## Current Task\n- Implement AI\n## Next\n- Test\n", "utf8")

      handleSessionIdle(root)

      const log = readLog(root)
      assert.ok(log.includes("## Archived Session State:"), "should have state archive header")
      assert.ok(log.includes("Implement AI"), "should include state content")
      assert.ok(log.includes("---"), "should end with separator")
      assert.ok(log.endsWith("---\n") || log.includes("---\n\n"), "should have trailing separator")
      // Timestamp format: YYYY-MM-DDTHH-MM-SS
      const tsMatch = log.match(/## Archived Session State: (\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/)
      assert.ok(tsMatch, `expected ISO timestamp, got: ${log.slice(0, 60)}`)
    } finally {
      cleanup(root)
    }
  })

  it("S2: Logs recent commits and modified files", () => {
    const root = makeTempProject()
    try {
      initGit(root)
      makeCommit(root, "feat: add player")
      makeCommit(root, "fix: collision")

      // Modify a tracked file (git diff --name-only only tracks changes to tracked files)
      fs.writeFileSync(path.join(root, "dummy.txt"), "modified content\n", "utf8")

      handleSessionIdle(root)

      const log = readLog(root)
      assert.ok(log.includes("## Session End:"), "should have session end header")
      assert.ok(log.includes("### Commits"), "should have commits section")
      assert.ok(log.includes("fix: collision"), "should include recent commit messages")
      assert.ok(log.includes("### Uncommitted Changes"), "should have modified files section")
      assert.ok(log.includes("dummy.txt"), "should list modified tracked file")
      assert.ok(log.includes("---"), "should end with separator")
    } finally {
      cleanup(root)
    }
  })

  it("S3: Timestamp in ISO format", () => {
    const root = makeTempProject()
    try {
      const stateFile = path.join(root, "production", "session-state", "active.md")
      fs.writeFileSync(stateFile, "# state", "utf8")

      handleSessionIdle(root)

      const log = readLog(root)
      const matches = log.match(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/g)
      assert.ok(matches && matches.length > 0, "no ISO timestamp found")
      for (const ts of matches) {
        assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/.test(ts), `bad timestamp format: ${ts}`)
      }
    } finally {
      cleanup(root)
    }
  })

  it("S4: Both state archive AND git log present", () => {
    const root = makeTempProject()
    try {
      initGit(root)
      makeCommit(root, "feat: init")
      const stateFile = path.join(root, "production", "session-state", "active.md")
      fs.writeFileSync(stateFile, "# State content", "utf8")

      handleSessionIdle(root)

      const log = readLog(root)
      assert.ok(log.includes("## Archived Session State:"))
      assert.ok(log.includes("## Session End:"))
      // State archive should come before session end
      assert.ok(log.indexOf("## Archived Session State:") < log.indexOf("## Session End:"),
        "state archive should precede session end")
    } finally {
      cleanup(root)
    }
  })

  it("S5: No state file -- only git section logged", () => {
    const root = makeTempProject()
    try {
      initGit(root)
      makeCommit(root, "feat: init")

      handleSessionIdle(root)

      const log = readLog(root)
      assert.ok(!log.includes("## Archived Session State:"), "should not have state archive")
      assert.ok(log.includes("## Session End:"), "should still log session end")
    } finally {
      cleanup(root)
    }
  })

  it("S6: No git repo -- only state archive logged", () => {
    const root = makeTempProject()
    try {
      const stateFile = path.join(root, "production", "session-state", "active.md")
      fs.writeFileSync(stateFile, "# State", "utf8")

      handleSessionIdle(root)

      const log = readLog(root)
      assert.ok(log.includes("## Archived Session State:"), "should have state archive")
      assert.ok(!log.includes("## Session End:"), "should not have session end (no git)")
    } finally {
      cleanup(root)
    }
  })

  it("S7: Nothing to log -- file is empty or absent", () => {
    const root = makeTempProject()
    try {
      handleSessionIdle(root)

      const log = readLog(root)
      assert.equal(log, "", "should not create log file when nothing to log")
    } finally {
      cleanup(root)
    }
  })

  it("S8: Appends to log file, does not overwrite", () => {
    const root = makeTempProject()
    try {
      const stateFile = path.join(root, "production", "session-state", "active.md")
      fs.writeFileSync(stateFile, "# State v1", "utf8")

      handleSessionIdle(root)
      handleSessionIdle(root)

      const log = readLog(root)
      const count = (log.match(/## Archived Session State:/g) || []).length
      assert.equal(count, 2, `expected 2 archive entries, got ${count}`)
    } finally {
      cleanup(root)
    }
  })

  it("S9: Lists modified tracked file", () => {
    const root = makeTempProject()
    try {
      initGit(root)
      makeCommit(root, "feat: init")
      // Modify tracked file
      fs.writeFileSync(path.join(root, "dummy.txt"), "changed\n", "utf8")

      handleSessionIdle(root)

      const log = readLog(root)
      assert.ok(log.includes("dummy.txt"), "should list modified tracked file")
    } finally {
      cleanup(root)
    }
  })

  it("S10: Both commits and modified files sections present", () => {
    const root = makeTempProject()
    try {
      initGit(root)
      makeCommit(root, "feat: recent commit")
      fs.writeFileSync(path.join(root, "dummy.txt"), "modified\n", "utf8")

      handleSessionIdle(root)

      const log = readLog(root)
      assert.ok(log.includes("### Commits"))
      assert.ok(log.includes("feat: recent commit"))
      assert.ok(log.includes("### Uncommitted Changes"))
    } finally {
      cleanup(root)
    }
  })

})
