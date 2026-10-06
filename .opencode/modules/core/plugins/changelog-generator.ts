import type { Plugin as OpenCodePlugin } from "@opencode/plugin"
import type { Session as OpenCodeSession } from "@opencode/schema/session"
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

interface PluginLogger {
  debug(message: string, extra?: unknown): void
  info(message: string, extra?: unknown): void
  warn(message: string, extra?: unknown): void
  error(message: string, extra?: unknown): void
}

function createPluginLogger(service: string): PluginLogger {
  const log = (level: "debug" | "info" | "warn" | "error", message: string, extra?: unknown) => {
    const formatted = `[${service}] ${message}`
    if (extra === undefined) console[level](formatted)
    else console[level](formatted, extra)
  }
  return {
    debug: (message: string, extra?: unknown) => log("debug", message, extra),
    info: (message: string, extra?: unknown) => log("info", message, extra),
    warn: (message: string, extra?: unknown) => log("warn", message, extra),
    error: (message: string, extra?: unknown) => log("error", message, extra),
  }
}

function getToolArgs(input: unknown): Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return {}
  return input as Record<string, unknown>
}

async function isEventForProject(
  ctx: OpenCodePlugin.Context,
  event: { type: string; location?: { directory?: string }; data?: unknown },
  projectRoot: string,
  logger: PluginLogger,
): Promise<boolean> {
  const data = event.data && typeof event.data === "object"
    ? event.data as { location?: { directory?: string }; sessionID?: OpenCodeSession.ID }
    : undefined
  const directory = event.location?.directory ?? data?.location?.directory
  const matchesProject = (candidate: string) => {
    const eventDirectory = path.resolve(candidate)
    const pluginDirectory = path.resolve(projectRoot)
    return process.platform === "win32"
      ? eventDirectory.toLowerCase() === pluginDirectory.toLowerCase()
      : eventDirectory === pluginDirectory
  }

  if (typeof directory === "string") return matchesProject(directory)
  if (typeof data?.sessionID !== "string") {
    logger.warn("Ignoring session event without a resolvable location", { type: event.type })
    return false
  }

  try {
    const session = await ctx.session.get({ sessionID: data.sessionID })
    return matchesProject(session.location.directory)
  } catch (error) {
    logger.warn("Could not resolve session location; ignoring event", {
      type: event.type,
      sessionID: data.sessionID,
      error: String(error),
    })
    return false
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

/** OpenCode V2 plugin that previews changelog updates and detects changelog commands. */
export const ChangelogGenerator: OpenCodePlugin.Plugin = {
  id: "ocgs.changelog-generator",
  async setup(ctx) {
    const projectRoot = ctx.location.directory || process.cwd()
    const logger = createPluginLogger("changelog-generator")

    logger.info("Changelog generator loaded", { projectRoot })

    await ctx.tool.hook("execute.before", (event) => {
      if (event.tool !== "shell") return

      const args = getToolArgs(event.input)
      const command = typeof args.command === "string" ? args.command : ""
      if (command.includes("changelog") || command.includes("CHANGELOG")) {
        logger.info("Changelog-related command detected — consider running the changelog generator")
      }
    })

    const controller = new AbortController()
    void (async () => {
      try {
        for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
          if (event.type !== "session.idle") continue
          if (!await isEventForProject(ctx, event, projectRoot, logger)) continue

          try {
            const { internal } = generateChangelogs(projectRoot, "unreleased")
            if (!internal.includes("No changes")) {
              logger.info("Changelog generated with unreleased changes — run changelog-generator to write CHANGELOG.md.")
            }
          } catch (error) {
            logger.error("Failed to generate changelog preview", { error: String(error) })
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          logger.error("Event subscription failed", { error: String(error) })
        }
      }
    })()

    return () => controller.abort()
  },
}

export default ChangelogGenerator
