/**
 * Test suite for session-stop hook (handleSessionIdle)
 *
 * Tests behavioral equivalence with the original bash session-stop.sh:
 *   - Archives active session state to session-log.md
 *   - Logs recent commits and modified files
 *   - Timestamp format: YYYYMMDD_HHMMSS (matching `date +%Y%m%d_%H%M%S`)
 *   - Section headers: ## Archived Session State, ## Session End, etc.
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
    const cmd = args.map((a) => (a.includes(" ") ? `"${a}"` : a)).join(" ")
    return execSync(`git ${cmd}`, { encoding: "utf8", cwd, stdio: ["pipe", "pipe", "ignore"] }).trim()
  } catch {
    return ""
  }
}

function sessionTimestamp() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, "0")
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

function handleSessionIdle(projectRoot) {
  const timestamp = sessionTimestamp()
  const logDir = path.join(projectRoot, "production", "session-logs")
  if (!fs.existsSync(logDir)) {
    try { fs.mkdirSync(logDir, { recursive: true }) } catch { /* ignore */ }
  }

  const stateFile = path.join(projectRoot, "production", "session-state", "active.md")
  if (fs.existsSync(stateFile)) {
    const block = `## Archived Session State: ${timestamp}\n${fs.readFileSync(stateFile, "utf8")}\n---\n`
    try { fs.appendFileSync(path.join(logDir, "session-log.md"), block) } catch { /* ignore */ }
  }

  const hasGit = isGitRepo(projectRoot)
  if (hasGit) {
    const recentCommits = git(projectRoot, "log", "--oneline", "--since=8 hours ago")
    const modifiedFiles = git(projectRoot, "diff", "--name-only")
    if (recentCommits || modifiedFiles) {
      let entry = `## Session End: ${timestamp}\n`
      if (recentCommits) entry += `### Commits\n${recentCommits}\n`
      if (modifiedFiles) entry += `### Uncommitted Changes\n${modifiedFiles}\n`
      entry += "---\n"
      try { fs.appendFileSync(path.join(logDir, "session-log.md"), entry) } catch { /* ignore */ }
    }
  }
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

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────

console.log("\n🧪 session-stop hook tests\n")

// ── S1: Archives session state when active.md exists ──
{
  const root = makeTempProject()
  const stateFile = path.join(root, "production", "session-state", "active.md")
  fs.writeFileSync(stateFile, "## Current Task\n- Implement AI\n## Next\n- Test\n", "utf8")

  handleSessionIdle(root)

  const log = readLog(root)
  run("S1: Archives session state to session-log.md", () => {
    assert.ok(log.includes("## Archived Session State:"), "should have state archive header")
    assert.ok(log.includes("Implement AI"), "should include state content")
    assert.ok(log.includes("---"), "should end with separator")
    assert.ok(log.endsWith("---\n") || log.includes("---\n\n"), "should have trailing separator")
    // Timestamp format: YYYYMMDD_HHMMSS
    const tsMatch = log.match(/## Archived Session State: (\d{8}_\d{6})/)
    assert.ok(tsMatch, `expected YYYYMMDD_HHMMSS timestamp, got: ${log.slice(0, 60)}`)
  })
  cleanup(root)
}

// ── S2: Logs git activity (commits + modified files) ──
{
  const root = makeTempProject()
  initGit(root)
  makeCommit(root, "feat: add player")
  makeCommit(root, "fix: collision")

  // Modify a tracked file (git diff --name-only only tracks changes to tracked files)
  fs.writeFileSync(path.join(root, "dummy.txt"), "modified content\n", "utf8")

  handleSessionIdle(root)

  const log = readLog(root)
  run("S2: Logs recent commits and modified files", () => {
    assert.ok(log.includes("## Session End:"), "should have session end header")
    assert.ok(log.includes("### Commits"), "should have commits section")
    assert.ok(log.includes("fix: collision"), "should include recent commit messages")
    assert.ok(log.includes("### Uncommitted Changes"), "should have modified files section")
    assert.ok(log.includes("dummy.txt"), "should list modified tracked file")
    assert.ok(log.includes("---"), "should end with separator")
  })
  cleanup(root)
}

// ── S3: Timestamp format matches bash `date +%Y%m%d_%H%M%S` ──
{
  const root = makeTempProject()
  const stateFile = path.join(root, "production", "session-state", "active.md")
  fs.writeFileSync(stateFile, "# state", "utf8")

  handleSessionIdle(root)

  const log = readLog(root)
  run("S3: Timestamp in YYYYMMDD_HHMMSS format", () => {
    const matches = log.match(/\d{8}_\d{6}/g)
    assert.ok(matches && matches.length > 0, "no YYYYMMDD_HHMMSS timestamp found")
    for (const ts of matches) {
      assert.ok(/^\d{8}_\d{6}$/.test(ts), `bad timestamp format: ${ts}`)
    }
  })
  cleanup(root)
}

// ── S4: Both state archive and git log appear together ──
{
  const root = makeTempProject()
  initGit(root)
  makeCommit(root, "feat: init")
  const stateFile = path.join(root, "production", "session-state", "active.md")
  fs.writeFileSync(stateFile, "# State content", "utf8")

  handleSessionIdle(root)

  const log = readLog(root)
  run("S4: Both state archive AND git log present", () => {
    assert.ok(log.includes("## Archived Session State:"))
    assert.ok(log.includes("## Session End:"))
    // State archive should come before session end
    assert.ok(log.indexOf("## Archived Session State:") < log.indexOf("## Session End:"),
      "state archive should precede session end")
  })
  cleanup(root)
}

// ── S5: No crash when no session state ──
{
  const root = makeTempProject()
  initGit(root)
  makeCommit(root, "feat: init")

  handleSessionIdle(root)

  const log = readLog(root)
  run("S5: No state file — only git section logged", () => {
    assert.ok(!log.includes("## Archived Session State:"), "should not have state archive")
    assert.ok(log.includes("## Session End:"), "should still log session end")
  })
  cleanup(root)
}

// ── S6: No crash when no git repo ──
{
  const root = makeTempProject()
  const stateFile = path.join(root, "production", "session-state", "active.md")
  fs.writeFileSync(stateFile, "# State", "utf8")

  handleSessionIdle(root)

  const log = readLog(root)
  run("S6: No git repo — only state archive logged", () => {
    assert.ok(log.includes("## Archived Session State:"), "should have state archive")
    assert.ok(!log.includes("## Session End:"), "should not have session end (no git)")
  })
  cleanup(root)
}

// ── S7: No activity (no state, no git) ──
{
  const root = makeTempProject()

  handleSessionIdle(root)

  const log = readLog(root)
  run("S7: Nothing to log — file is empty or absent", () => {
    assert.equal(log, "", "should not create log file when nothing to log")
  })
  cleanup(root)
}

// ── S8: Log file is appended (not overwritten) on repeated calls ──
{
  const root = makeTempProject()
  const stateFile = path.join(root, "production", "session-state", "active.md")
  fs.writeFileSync(stateFile, "# State v1", "utf8")

  handleSessionIdle(root)
  handleSessionIdle(root)

  const log = readLog(root)
  const count = (log.match(/## Archived Session State:/g) || []).length
  run("S8: Appends to log file, does not overwrite", () => {
    assert.equal(count, 2, `expected 2 archive entries, got ${count}`)
  })
  cleanup(root)
}

// ── S9: Modified tracked files listed (untracked files NOT in git diff) ──
{
  const root = makeTempProject()
  initGit(root)
  makeCommit(root, "feat: init")
  // Modify tracked file
  fs.writeFileSync(path.join(root, "dummy.txt"), "changed\n", "utf8")

  handleSessionIdle(root)

  const log = readLog(root)
  run("S9: Lists modified tracked file", () => {
    assert.ok(log.includes("dummy.txt"), "should list modified tracked file")
  })
  cleanup(root)
}

// ── S10: Commits and modified files both present ──
{
  const root = makeTempProject()
  initGit(root)
  makeCommit(root, "feat: recent commit")
  fs.writeFileSync(path.join(root, "dummy.txt"), "modified\n", "utf8")

  handleSessionIdle(root)

  const log = readLog(root)
  run("S10: Both commits and modified files sections present", () => {
    assert.ok(log.includes("### Commits"))
    assert.ok(log.includes("feat: recent commit"))
    assert.ok(log.includes("### Uncommitted Changes"))
  })
  cleanup(root)
}

// ── Summary ──
function cleanup(root) {
  try { fs.rmSync(root, { recursive: true }) } catch { /* ignore */ }
}

console.log(`\n📊 Results: ${passCount}/${testCount} passed\n`)
process.exit(passCount === testCount ? 0 : 1)
