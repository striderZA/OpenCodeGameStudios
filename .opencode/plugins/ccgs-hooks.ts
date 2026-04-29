import type { Plugin } from "@opencode-ai/plugin"
import { execSync } from "child_process"
import * as fs from "fs"
import * as path from "path"

/**
 * CCGS Hooks Plugin — OpenCode port of Claude Code Game Studios hooks
 * Translates the 12 bash hooks from .claude/hooks/ into TypeScript plugin hooks.
 */

const PROTECTED_BRANCHES = ["main", "master", "develop"]
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
      const extraContext: string[] = []
      extraContext.push("=== SESSION STATE BEFORE COMPACTION ===")
      extraContext.push(`Timestamp: ${new Date().toISOString()}`)

      const activeState = path.join(projectRoot, "production", "session-state", "active.md")
      if (fs.existsSync(activeState)) {
        const content = fs.readFileSync(activeState, "utf8")
        const lines = content.split("\n")
        extraContext.push(`## Active Session State`)
        if (lines.length > 100) {
          extraContext.push(...lines.slice(0, 100))
          extraContext.push(`... (truncated — ${lines.length} total lines)`)
        } else {
          extraContext.push(content)
        }
      } else {
        extraContext.push("No active session state file found.")
      }

      extraContext.push(`## Files with WIP markers`)
      let wipFound = false
      const srcDir = path.join(projectRoot, "src")
      if (fs.existsSync(srcDir)) {
        const allFiles = fs.readdirSync(srcDir, { recursive: true }).filter((f: string) =>
          [".gd", ".cs", ".cpp", ".c", ".h", ".hpp", ".rs", ".py", ".js", ".ts"].some((e) => String(f).endsWith(e))
        ) as string[]
        for (const file of allFiles) {
          const fp = path.join(srcDir, file)
          if (!fs.existsSync(fp)) continue
          const content = fs.readFileSync(fp, "utf8")
          const wipLines = content.split("\n").filter((l: string) => /TODO|WIP|PLACEHOLDER|\[TO BE|\[TBD\]/.test(l))
          if (wipLines.length > 0) {
            wipFound = true
            extraContext.push(`  ${file}:`)
            wipLines.forEach((l: string) => extraContext.push(`    ${l}`))
          }
        }
      }
      if (!wipFound) extraContext.push("  (no WIP markers found)")

      extraContext.push("## Recovery Instructions")
      extraContext.push("After compaction, read production/session-state/active.md to recover full working context.")
      extraContext.push("=== END SESSION STATE ===")

      output.context.push(extraContext.join("\n"))
    },

    // ================================================================
    // PRE-TOOL-USE VALIDATION (replaces validate-commit.sh + validate-push.sh)
    // ================================================================
    "tool.execute.before": async (input, output) => {

      // --- validate-push: warn on protected branches ---
      if (isGitRepo(projectRoot) && input.tool === "bash" && output.args?.command) {
        const cmd = output.args.command as string
        if (/^git\s+push/.test(cmd)) {
          const currentBranch = git(projectRoot, "rev-parse", "--abbrev-ref", "HEAD")
          let matched = ""
          for (const b of PROTECTED_BRANCHES) {
            if (currentBranch === b || new RegExp(`\\s${b}(\\s|$)`).test(cmd)) {
              matched = b
              break
            }
          }
          if (matched) {
            logAudit(projectRoot, `WARN: Push to protected branch '${matched}' detected.`)
          }
        }
      }

      // --- validate-commit: validate staged files before commit ---
      if (isGitRepo(projectRoot) && input.tool === "bash" && output.args?.command) {
        const cmd = output.args.command as string
        if (/^git\s+commit/.test(cmd)) {
          const staged = git(projectRoot, "diff", "--cached", "--name-only")
          if (!staged) return

          const warnings: string[] = []
          const files = staged.split("\n")

          for (const file of files) {
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
                throw new Error(`BLOCKED: ${file} is not valid JSON. Fix before committing.`)
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

          if (warnings.length > 0) {
            logAudit(projectRoot, "=== Commit Validation Warnings ===")
            warnings.forEach((w) => logAudit(projectRoot, w))
          }
        }
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
      if (filePath.includes("/assets/")) {
        const filename = path.basename(filePath)
        const warnings: string[] = []
        const errors: string[] = []

        if (/[A-Z\s-]/.test(filename)) {
          warnings.push(`NAMING: ${filePath} must be lowercase with underscores (got: ${filename})`)
        }

        if (/\/assets\/data\/.*\.json$/.test(filePath)) {
          if (fs.existsSync(filePath) && !validateJson(filePath)) {
            errors.push(`FORMAT: ${filePath} is not valid JSON`)
          }
        }

        if (warnings.length > 0) {
          logAudit(projectRoot, "=== Asset Validation: Warnings ===")
          warnings.forEach((w) => logAudit(projectRoot, w))
          logAudit(projectRoot, "(Warnings are advisory. Fix before final commit.)")
        }
        if (errors.length > 0) {
          logAudit(projectRoot, "=== Asset Validation: ERRORS (Blocking) ===")
          errors.forEach((e) => logAudit(projectRoot, e))
          throw new Error("Asset validation failed. Fix errors before proceeding.")
        }
      }

      // --- validate-skill-change: advise test after skill edit ---
      if (filePath.includes("/.opencode/commands/") || filePath.includes("/.opencode/commands/")) {
        const match = filePath.match(/\/(skills|commands)\/([^/]+)/)
        if (match) {
          const skillName = match[2]
          logAudit(projectRoot, `=== Skill Modified: ${skillName} ===`)
          logAudit(projectRoot, `Run /skill-test static ${skillName} to validate structural compliance.`)
        }
      }
    },
  }
}
