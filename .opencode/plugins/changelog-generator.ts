import type { Plugin } from "@opencode-ai/plugin"
import { execSync } from "child_process"
import * as fs from "fs"
import * as path from "path"

/**
 * Changelog Generator Plugin
 *
 * Generates CHANGELOG.md entries from conventional commits since the last tag.
 * Supports both internal (full) and player-facing (summary) formats.
 */

interface CommitEntry {
  hash: string
  type: string
  scope: string
  message: string
  body: string
  date: string
}

const TYPE_PLAYER_LABELS: Record<string, string> = {
  feat: "New Features",
  fix: "Bug Fixes",
  perf: "Performance",
  refactor: "Under the Hood",
  revert: "Rollbacks",
}

const TYPE_CATEGORIES = ["feat", "fix", "perf", "refactor", "revert", "docs", "test", "ci", "chore", "style", "build"]

function git(projectRoot: string, args: string[]): string {
  try {
    return execSync(`git ${args.join(" ")}`, { encoding: "utf8", cwd: projectRoot, stdio: ["pipe", "pipe", "ignore"] }).trim()
  } catch {
    return ""
  }
}

function getLastTag(projectRoot: string): string {
  const tag = git(projectRoot, ["describe", "--tags", "--abbrev=0"])
  return tag || "initial"
}

function parseConventionalCommits(projectRoot: string, sinceTag: string): CommitEntry[] {
  const range = sinceTag === "initial"
    ? "HEAD"
    : `${sinceTag}..HEAD`

  const log = git(projectRoot, [
    "log",
    range,
    "--format=%H||%s||%b||%ai",
    "--no-merges",
  ])

  if (!log) return []

  const entries: CommitEntry[] = []

  for (const line of log.split("\n")) {
    const parts = line.split("||")
    if (parts.length < 4) continue

    const hash = parts[0].substring(0, 7)
    const subject = parts[1]
    const body = parts[2]
    const date = parts[3].split(" ")[0] // YYYY-MM-DD

    // Parse conventional commit: type(scope): message
    const match = subject.match(/^(\w+)(?:\(([^)]+)\))?:\s*(.+)/)
    if (!match) {
      // Non-conventional commit — include under "Other Changes"
      entries.push({
        hash,
        type: "other",
        scope: "",
        message: subject,
        body,
        date,
      })
      continue
    }

    entries.push({
      hash,
      type: match[1],
      scope: match[2] || "",
      message: match[3],
      body,
      date,
    })
  }

  return entries
}

function generateInternalChangelog(entries: CommitEntry[], version: string, date: string): string {
  const lines: string[] = []
  lines.push(`# Changelog`)
  lines.push(``)
  lines.push(`## [${version}] — ${date}`)
  lines.push(``)

  for (const category of TYPE_CATEGORIES) {
    const catEntries = entries.filter((e) => e.type === category)
    if (catEntries.length === 0) continue

    const label = category.toUpperCase()
    lines.push(`### ${label}`)
    lines.push(``)

    for (const entry of catEntries) {
      const scope = entry.scope ? `**${entry.scope}**: ` : ""
      const hashLink = `[\`${entry.hash}\`]`
      lines.push(`- ${scope}${entry.message} ${hashLink}`)
    }
    lines.push(``)
  }

  // Other (non-conventional commits)
  const otherEntries = entries.filter((e) => e.type === "other")
  if (otherEntries.length > 0) {
    lines.push(`### Other Changes`)
    lines.push(``)
    for (const entry of otherEntries) {
      lines.push(`- ${entry.message} [\`${entry.hash}\`]`)
    }
    lines.push(``)
  }

  return lines.join("\n")
}

function generatePlayerChangelog(entries: CommitEntry[], version: string, date: string): string {
  const lines: string[] = []
  lines.push(`# Update ${version} — ${date}`)
  lines.push(``)

  const playerTypes = ["feat", "fix", "perf", "refactor", "revert"]

  for (const type of playerTypes) {
    const catEntries = entries.filter((e) => e.type === type)
    if (catEntries.length === 0) continue

    const label = TYPE_PLAYER_LABELS[type] || type
    lines.push(`## ${label}`)
    lines.push(``)

    for (const entry of catEntries) {
      // Player-facing: capitalize first letter, remove technical references
      let message = entry.message
      message = message.charAt(0).toUpperCase() + message.slice(1)
      // Remove issue references like (#123)
      message = message.replace(/\s+\(#\d+\)$/, "")
      lines.push(`- ${message}`)
    }
    lines.push(``)
  }

  return lines.join("\n")
}

function updateChangelogFile(projectRoot: string, version: string, content: string, isPlayerFacing: boolean) {
  const filename = isPlayerFacing ? "CHANGELOG.md" : "CHANGELOG_INTERNAL.md"
  const filePath = path.join(projectRoot, filename)

  let existing = ""
  if (fs.existsSync(filePath)) {
    existing = fs.readFileSync(filePath, "utf8")
  }

  // Prepend new version content, keep existing below
  const updated = existing
    ? content + "\n\n" + existing.replace(/^# Changelog\n\n/m, "") + "\n"
    : content + "\n"

  fs.writeFileSync(filePath, updated)
}

type PluginLogger = ReturnType<typeof createPluginLogger>
function createPluginLogger(client: any, service: string) {
  const log = (level: string, message: string, extra?: any) => {
    client?.app?.log({ body: { service, level, message, extra } }).catch(() => {})
  }
  return {
    debug: (m: string, x?: any) => log("debug", m, x),
    info: (m: string, x?: any) => log("info", m, x),
    warn: (m: string, x?: any) => log("warn", m, x),
    error: (m: string, x?: any) => log("error", m, x),
  }
}

export function generateChangelogs(projectRoot: string, version?: string): { internal: string; player: string } {
  const lastTag = getLastTag(projectRoot)
  const entries = parseConventionalCommits(projectRoot, lastTag)
  const date = new Date().toISOString().split("T")[0]
  const ver = version || `unreleased`

  if (entries.length === 0) {
    return {
      internal: `# Changelog\n\n## [${ver}] — ${date}\n\nNo changes since ${lastTag}.\n`,
      player: `# Update ${ver} — ${date}\n\nNo player-facing changes in this update.\n`,
    }
  }

  return {
    internal: generateInternalChangelog(entries, ver, date),
    player: generatePlayerChangelog(entries, ver, date),
  }
}

export const ChangelogGenerator: Plugin = async ({ project, client, directory, worktree }) => {
  const projectRoot = directory || worktree || process.cwd()
  const logger = createPluginLogger(client, "changelog-generator")

  logger.info("Changelog generator loaded", { projectRoot })

  return {
    event: async ({ event }) => {
      // Auto-generate changelog on session idle for uncommitted work
      if (event.type === "session.idle" || event.type === "server.instance.disposed") {
        try {
          const { internal, player } = generateChangelogs(projectRoot, "unreleased")
          if (!internal.includes("No changes")) {
            logger.info("Changelog generated with unreleased changes — run changelog-generator to write CHANGELOG.md.")
          }
        } catch (err) {
          logger.error("Failed to generate changelog preview", { error: String(err) })
        }
      }
    },

    "tool.execute.before": async (input, output) => {
      if (input.tool !== "bash") return

      const cmd = output.args?.command as string || ""

      // Detect changelog-related commands
      if (cmd.includes("changelog") || cmd.includes("CHANGELOG")) {
        logger.info("Changelog-related command detected — consider running the changelog generator")
      }
    },
  }
}
