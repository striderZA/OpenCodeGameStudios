import type { Plugin } from "@opencode-ai/plugin"
import { execSync } from "child_process"
import * as fs from "fs"
import * as path from "path"

/**
 * CCGS Hooks Plugin — OpenCode port of Claude Code Game Studios hooks
 * Translates the 12 bash hooks from .claude/hooks/ into TypeScript plugin hooks.
 */

const PROTECTED_BRANCHES = ["main", "master", "develop"]
const SOURCE_EXTENSIONS = [".gd", ".cs", ".cpp", ".c", ".h", ".hpp", ".rs", ".py", ".js", ".ts"]
const DESIGN_SECTIONS = [
  "Overview",
  "Player Fantasy",
  "Detailed",
  "Formulas",
  "Edge Cases",
  "Dependencies",
  "Tuning Knobs",
  "Acceptance Criteria",
]

function isGitRepo(cwd: string): boolean {
  try {
    execSync("git rev-parse --git-dir", { encoding: "utf8", cwd, stdio: "ignore" })
    return true
  } catch {
    return false
  }
}

function git(cwd: string, ...args: string[]): string {
  try {
    const cmd = args.map((a) => (a.includes(" ") ? `"${a}"` : a)).join(" ")
    return execSync(`git ${cmd}`, { encoding: "utf8", cwd, stdio: ["pipe", "pipe", "ignore"] }).trim()
  } catch {
    return ""
  }
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, "/")
}

function getProjectRoot(directory: string | undefined, worktree: string | undefined): string {
  return directory || worktree || process.cwd()
}

function logAudit(projectRoot: string, message: string) {
  try {
    const dir = path.join(projectRoot, "production", "session-logs")
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
    fs.appendFileSync(path.join(dir, "agent-audit.log"), `${timestamp} | ${message}\n`)
  } catch (err) {
    console.error("[CCGS Plugin] Failed to write audit log:", err)
  }
}

function validateJson(filePath: string): boolean {
  try {
    const content = fs.readFileSync(filePath, "utf8")
    JSON.parse(content)
    return true
  } catch {
    return false
  }
}

function findFilesRecursive(root: string, predicate: (name: string, filePath: string) => boolean): string[] {
  const results: string[] = []
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
  } catch { /* permission denied, skip */ }
  return results
}

function getFilesByMtime(dir: string, filter: (name: string) => boolean): string[] {
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

export function handleSessionCreated(projectRoot: string) {
  console.log("=== Claude Code Game Studios — Session Context ===")
  logAudit(projectRoot, "session.created fired")

  const hasGit = isGitRepo(projectRoot)

  if (hasGit) {
    const branch = git(projectRoot, "rev-parse", "--abbrev-ref", "HEAD")
    if (branch) {
      console.log(`Branch: ${branch}`)
      console.log("")
      console.log("Recent commits:")
      const commits = git(projectRoot, "log", "--oneline", "-5")
      if (commits) {
        commits.split("\n").forEach((line) => console.log(`  ${line}`))
      }
    }
  }

  const sprintFiles = getFilesByMtime(
    path.join(projectRoot, "production", "sprints"),
    (f) => /^sprint-.*\.md$/.test(f)
  )
  if (sprintFiles.length > 0) {
    console.log("")
    console.log(`Active sprint: ${path.basename(sprintFiles[0], ".md")}`)
  }

  const milestoneFiles = getFilesByMtime(
    path.join(projectRoot, "production", "milestones"),
    (f) => f.endsWith(".md")
  )
  if (milestoneFiles.length > 0) {
    console.log(`Active milestone: ${path.basename(milestoneFiles[0], ".md")}`)
  }

  let bugCount = 0
  for (const dir of [path.join(projectRoot, "tests", "playtest"), path.join(projectRoot, "production")]) {
    if (fs.existsSync(dir)) {
      bugCount += findFilesRecursive(dir, (name) => /^BUG-.*\.md$/.test(name)).length
    }
  }
  if (bugCount > 0) {
    console.log(`Open bugs: ${bugCount}`)
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
      } catch { /* skip binary/unreadable */ }
    }
    if (todoCount > 0 || fixmeCount > 0) {
      console.log("")
      console.log(`Code health: ${todoCount} TODOs, ${fixmeCount} FIXMEs in src/`)
    }
  }

  const activeState = path.join(projectRoot, "production", "session-state", "active.md")
  if (fs.existsSync(activeState)) {
    console.log("")
    console.log("=== ACTIVE SESSION STATE DETECTED ===")
    console.log(`A previous session left state at: ${activeState}`)
    console.log("Read this file to recover context and continue where you left off.")
    console.log("")
    console.log("Quick summary:")
    const content = fs.readFileSync(activeState, "utf8")
    const lines = content.split("\n")
    console.log(lines.slice(0, 20).join("\n"))
    const totalLines = lines.length
    if (totalLines > 20) {
      console.log(`  ... (${totalLines} total lines — read the full file to continue)`)
    }
    console.log("=== END SESSION STATE PREVIEW ===")
  }

  console.log("===================================")
}

function sessionTimestamp(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

export function handleSessionIdle(projectRoot: string) {
  logAudit(projectRoot, "Session idle/shutdown")

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

function isEngineConfigured(projectRoot: string): boolean {
  const agentsMd = path.join(projectRoot, "AGENTS.md")
  if (!fs.existsSync(agentsMd)) return false
  try {
    const content = fs.readFileSync(agentsMd, "utf8")
    const engineLine = content.split("\n").find((l) => /^\s*-\s*\*\*Engine\*\*:/.test(l))
    return !engineLine?.includes("[CHOOSE:")
  } catch {
    return false
  }
}

function countSourceFiles(projectRoot: string): number {
  const srcDir = path.join(projectRoot, "src")
  if (!fs.existsSync(srcDir)) return 0
  return findFilesRecursive(srcDir, (name) => SOURCE_EXTENSIONS.some((ext) => name.endsWith(ext))).length
}

function countDesignDocs(projectRoot: string): number {
  const gddDir = path.join(projectRoot, "design", "gdd")
  if (!fs.existsSync(gddDir)) return 0
  return findFilesRecursive(gddDir, (name) => name.endsWith(".md")).length
}

function getSubdirNames(root: string): string[] {
  if (!fs.existsSync(root)) return []
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
}

export function handleLogAgentStop(projectRoot: string, agentType: string) {
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

export function handleLogAgent(projectRoot: string, agentType: string) {
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

export function handleDetectGaps(projectRoot: string) {
  console.log("=== Checking for Documentation Gaps ===")

  // --- Check 0: Fresh project ---
  const engineConfigured = isEngineConfigured(projectRoot)
  const hasGameConcept = fs.existsSync(path.join(projectRoot, "design", "gdd", "game-concept.md"))
  const srcCount = countSourceFiles(projectRoot)
  const isFresh = !engineConfigured && !hasGameConcept && srcCount === 0

  if (isFresh) {
    console.log("")
    console.log("NEW PROJECT: No engine configured, no game concept, no source code.")
    console.log("   This looks like a fresh start! Run: /start")
    console.log("")
    console.log("To get a comprehensive project analysis, run: /project-stage-detect")
    console.log("===================================")
    return
  }

  // --- Check 1: Code without design docs ---
  const designCount = countDesignDocs(projectRoot)
  if (srcCount > 50 && designCount < 5) {
    console.log(`GAP: Substantial codebase (${srcCount} source files) but sparse design docs (${designCount} files)`)
    console.log("    Suggested action: /reverse-document design src/[system]")
    console.log("    Or run: /project-stage-detect to get full analysis")
  }

  // --- Check 2: Undocumented prototypes ---
  const protoDir = path.join(projectRoot, "prototypes")
  if (fs.existsSync(protoDir)) {
    const undocumented: string[] = []
    for (const dir of getSubdirNames(protoDir)) {
      const readme = path.join(protoDir, dir, "README.md")
      const concept = path.join(protoDir, dir, "CONCEPT.md")
      if (!fs.existsSync(readme) && !fs.existsSync(concept)) {
        undocumented.push(dir)
      }
    }
    if (undocumented.length > 0) {
      console.log(`GAP: ${undocumented.length} undocumented prototype(s) found:`)
      for (const proto of undocumented) {
        console.log(`    - prototypes/${proto}/ (no README or CONCEPT doc)`)
      }
      console.log("    Suggested action: /reverse-document concept prototypes/[name]")
    }
  }

  // --- Check 3: Core systems without architecture docs ---
  const coreDir = path.join(projectRoot, "src", "core")
  const engineDir = path.join(projectRoot, "src", "engine")
  const archDir = path.join(projectRoot, "docs", "architecture")
  if (fs.existsSync(coreDir) || fs.existsSync(engineDir)) {
    if (!fs.existsSync(archDir)) {
      console.log("GAP: Core engine/systems exist but no docs/architecture/ directory")
      console.log("    Suggested action: Create docs/architecture/ and run /architecture-decision")
    } else {
      const adrCount = findFilesRecursive(archDir, (name) => name.endsWith(".md")).length
      if (adrCount < 3) {
        console.log(`GAP: Core systems exist but only ${adrCount} ADR(s) documented`)
        console.log("    Suggested action: /reverse-document architecture src/core/[system]")
      }
    }
  }

  // --- Check 4: Gameplay systems without design docs ---
  const gameplayDir = path.join(projectRoot, "src", "gameplay")
  if (fs.existsSync(gameplayDir)) {
    for (const system of getSubdirNames(gameplayDir)) {
      const sysPath = path.join(gameplayDir, system)
      const fileCount = findFilesRecursive(sysPath, () => true).length
      if (fileCount >= 5) {
        const doc1 = path.join(projectRoot, "design", "gdd", `${system}-system.md`)
        const doc2 = path.join(projectRoot, "design", "gdd", `${system}.md`)
        if (!fs.existsSync(doc1) && !fs.existsSync(doc2)) {
          console.log(`GAP: Gameplay system 'src/gameplay/${system}/' (${fileCount} files) has no design doc`)
          console.log(`    Expected: design/gdd/${system}-system.md or design/gdd/${system}.md`)
          console.log(`    Suggested action: /reverse-document design src/gameplay/${system}`)
        }
      }
    }
  }

  // --- Check 5: Production planning ---
  if (srcCount > 100) {
    if (!fs.existsSync(path.join(projectRoot, "production", "sprints")) &&
        !fs.existsSync(path.join(projectRoot, "production", "milestones"))) {
      console.log(`GAP: Large codebase (${srcCount} files) but no production planning found`)
      console.log("    Suggested action: /sprint-plan or create production/ directory")
    }
  }

  console.log("")
  console.log("To get a comprehensive project analysis, run: /project-stage-detect")
  console.log("===================================")
}

const ASSETS_PATH_RE = /(?:^|\/)assets\//

export function validateCommitFiles(projectRoot: string, stagedFiles: string[]): { warnings: string[]; errors: string[] } {
  const warnings: string[] = []
  const errors: string[] = []

  for (const file of stagedFiles) {
    const fp = path.join(projectRoot, file)
    if (!fs.existsSync(fp)) continue

    if (file.startsWith("design/gdd/") && file.endsWith(".md")) {
      const content = fs.readFileSync(fp, "utf8")
      for (const section of DESIGN_SECTIONS) {
        if (!content.toLowerCase().includes(section.toLowerCase())) {
          warnings.push(`DESIGN: ${file} missing required section: ${section}`)
        }
      }
    }

    if (/^assets\/data\/.*\.json$/.test(file)) {
      if (!validateJson(fp)) {
        errors.push(`BLOCKED: ${file} is not valid JSON. Fix before committing.`)
      }
    }

    if (file.startsWith("src/gameplay/")) {
      const content = fs.readFileSync(fp, "utf8")
      if (/(damage|health|speed|rate|chance|cost|duration)\s*[:=]\s*\d+/.test(content)) {
        warnings.push(`CODE: ${file} may contain hardcoded gameplay values. Use data files.`)
      }
    }

    if (file.startsWith("src/")) {
      const content = fs.readFileSync(fp, "utf8")
      const badTodos = content.split("\n").filter((l: string) => /(TODO|FIXME|HACK)[^(]/.test(l))
      if (badTodos.length > 0) {
        warnings.push(`STYLE: ${file} has TODO/FIXME without owner tag. Use TODO(name) format.`)
      }
    }
  }

  return { warnings, errors }
}

const SKILL_CHANGE_RE = /\.opencode\/(?:skills|commands)\/([^/]+)/

export function detectSkillChange(filePath: string): string | null {
  const match = filePath.match(SKILL_CHANGE_RE)
  return match ? match[1] : null
}

export function validateAssetPath(projectRoot: string, filePath: string): { warnings: string[]; errors: string[] } {
  const warnings: string[] = []
  const errors: string[] = []

  if (!ASSETS_PATH_RE.test(filePath)) {
    return { warnings, errors }
  }

  const filename = path.basename(filePath)

  if (/[A-Z\s-]/.test(filename)) {
    warnings.push(`NAMING: ${filePath} must be lowercase with underscores (got: ${filename})`)
  }

  if (/\/assets\/data\/.*\.json$/.test(filePath)) {
    if (fs.existsSync(filePath) && !validateJson(filePath)) {
      errors.push(`FORMAT: ${filePath} is not valid JSON`)
    }
  }

  return { warnings, errors }
}

function runGit(cwd: string, cmd: string): string {
  try {
    return execSync(cmd, { encoding: "utf8", cwd, stdio: ["pipe", "pipe", "ignore"] }).trim()
  } catch {
    return ""
  }
}

export function buildCompactionContext(projectRoot: string): string {
  const lines: string[] = []
  const push = (s: string) => lines.push(s)

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

  // Git working tree changes
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

  // WIP markers in design docs
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

function logCompactionEvent(projectRoot: string) {
  try {
    const logDir = path.join(projectRoot, "production", "session-logs")
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })
    const timestamp = new Date().toISOString()
    fs.appendFileSync(path.join(logDir, "compaction-log.txt"), `Context compaction occurred at ${timestamp}.\n`)
  } catch { /* ignore */ }
}

export function handlePostCompact(projectRoot: string) {
  console.log("=== Context Restored After Compaction ===")
  const active = path.join(projectRoot, "production", "session-state", "active.md")
  if (fs.existsSync(active)) {
    let size = "?"
    try {
      size = String(fs.readFileSync(active, "utf8").split("\n").length)
    } catch { /* ignore */ }
    console.log(`Session state file exists: production/session-state/active.md (${size} lines)`)
    console.log("IMPORTANT: Read this file now to restore your working context.")
    console.log("It contains: current task, decisions made, files in progress, open questions.")
  } else {
    console.log("No session state file found at production/session-state/active.md")
    console.log("If you were mid-task, check production/session-logs/ for the last session audit.")
  }
  console.log("=========================================")
}

export function showNotification(message: string) {
  const text = (message || "Claude Code needs your attention").slice(0, 200)
  try {
    execSync(
      `powershell.exe -NonInteractive -WindowStyle Hidden -Command "` +
      `Add-Type -AssemblyName System.Windows.Forms; ` +
      `$n = New-Object System.Windows.Forms.NotifyIcon; ` +
      `$n.Icon = [System.Drawing.SystemIcons]::Information; ` +
      `$n.BalloonTipTitle = 'Claude Code'; ` +
      `$n.BalloonTipText = '${text.replace(/'/g, "''")}'; ` +
      `$n.Visible = $true; ` +
      `$n.ShowBalloonTip(5000); ` +
      `Start-Sleep -Seconds 6; ` +
      `$n.Dispose()"`,
      { stdio: "ignore", timeout: 10000 }
    )
  } catch { /* ignore */ }
}

export function detectPushToProtected(cmd: string, currentBranch: string): string {
  for (const b of PROTECTED_BRANCHES) {
    if (currentBranch === b || new RegExp(`\\s${b}(\\s|$)`).test(cmd)) {
      return b
    }
  }
  return ""
}

export const CCGSHooks: Plugin = async ({ project, client, $, directory, worktree }) => {
  const projectRoot = getProjectRoot(directory, worktree)
  console.log(`[CCGS Plugin] Loaded. Project root: ${projectRoot}`)
  logAudit(projectRoot, "Plugin loaded")

  return {
    // ================================================================
    // EVENT HANDLER (session.created, session.idle, etc.)
    // ================================================================
    event: async ({ event }) => {
      try {
        if (event.type === "session.created") {
          handleSessionCreated(projectRoot)
          handleDetectGaps(projectRoot)
        } else if (event.type === "session.idle" || event.type === "server.instance.disposed") {
          handleSessionIdle(projectRoot)
        }
      } catch (err) {
        logAudit(projectRoot, `ERROR in event ${event.type}: ${err}`)
      }
    },

    // ================================================================
    // PRE-COMPACT (replaces pre-compact.sh)
    // ================================================================
    "experimental.session.compacting": async (input, output) => {
      const context = buildCompactionContext(projectRoot)
      logCompactionEvent(projectRoot)
      output.context.push(context)
    },

    // ================================================================
    // POST-COMPACT (replaces post-compact.sh)
    // ================================================================
    "experimental.compaction.autocontinue": async (input, output) => {
      handlePostCompact(projectRoot)
    },

    // ================================================================
    // PRE-TOOL-USE VALIDATION (replaces validate-commit.sh + validate-push.sh)
    // ================================================================
    "tool.execute.before": async (input, output) => {

      // --- validate-push: warn on protected branches ---
      if (isGitRepo(projectRoot) && input.tool === "bash" && output.args?.command) {
        const cmd = output.args.command as string
        if (/^git\s+push/.test(cmd)) {
          const matched = detectPushToProtected(cmd, git(projectRoot, "rev-parse", "--abbrev-ref", "HEAD"))
          if (matched) {
            logAudit(projectRoot, `Push to protected branch '${matched}' detected.`)
            logAudit(projectRoot, "Reminder: Ensure build passes, unit tests pass, and no S1/S2 bugs exist.")
          }
        }
      }

      // --- validate-commit: validate staged files before commit ---
      if (isGitRepo(projectRoot) && input.tool === "bash" && output.args?.command) {
        const cmd = output.args.command as string
        if (/^git\s+commit/.test(cmd)) {
          const staged = git(projectRoot, "diff", "--cached", "--name-only")
          if (!staged) return

          const result = validateCommitFiles(projectRoot, staged.split("\n"))

          if (result.errors.length > 0) {
            throw new Error(result.errors.join("\n"))
          }

          if (result.warnings.length > 0) {
            logAudit(projectRoot, "=== Commit Validation Warnings ===")
            result.warnings.forEach((w) => logAudit(projectRoot, w))
          }
        }
      }

      // --- log-agent: track subagent invocations ---
      if (input.tool === "task") {
        const agentType =
          (output.args?.subagent_type as string) ||
          (output.args?.subagentType as string) ||
          (output.args?.agent_type as string) ||
          (output.args?.agentType as string) ||
          ""
        handleLogAgent(projectRoot, agentType)
      }
    },

    // ================================================================
    // POST-TOOL-USE VALIDATION (replaces validate-assets.sh + validate-skill-change.sh)
    // ================================================================
    "tool.execute.after": async (input, output) => {

      // Get file path from all possible locations
      const filePath = normalizePath(
        (input.args?.filePath as string) ||
        (input.args?.path as string) ||
        (output.args?.filePath as string) ||
        (output.args?.path as string) ||
        ""
      )

      if (!filePath) return

      // --- validate-assets: check assets/ files ---
      const assetResult = validateAssetPath(projectRoot, filePath)
      if (assetResult.warnings.length > 0) {
        logAudit(projectRoot, "=== Asset Validation: Warnings ===")
        assetResult.warnings.forEach((w) => logAudit(projectRoot, w))
        logAudit(projectRoot, "(Warnings are advisory. Fix before final commit.)")
      }
      if (assetResult.errors.length > 0) {
        logAudit(projectRoot, "=== Asset Validation: ERRORS (Blocking) ===")
        assetResult.errors.forEach((e) => logAudit(projectRoot, e))
        throw new Error("Asset validation failed. Fix errors before proceeding.")
      }

      // --- log-agent-stop: track subagent completion ---
      if (input.tool === "task") {
        const agentType =
          (output.args?.subagent_type as string) ||
          (output.args?.subagentType as string) ||
          (output.args?.agent_type as string) ||
          (output.args?.agentType as string) ||
          ""
        handleLogAgentStop(projectRoot, agentType)
      }

      // --- validate-skill-change: advise test after skill edit ---
      const skillChange = detectSkillChange(filePath)
      if (skillChange) {
        logAudit(projectRoot, `=== Skill Modified: ${skillChange} ===`)
        logAudit(projectRoot, `Run /skill-test static ${skillChange} to validate structural compliance.`)
      }
    },
  }
}
