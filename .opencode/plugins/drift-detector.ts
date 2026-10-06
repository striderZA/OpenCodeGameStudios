import type { Plugin as OpenCodePlugin } from "@opencode/plugin"
import type { Session as OpenCodeSession } from "@opencode/schema/session"
import * as fs from "fs"
import * as path from "path"

/**
 * Drift Detector Plugin
 *
 * Detects when agent or skill definition files drift from expected structural
 * templates. Runs on file write operations and reports drift severity.
 */

interface DriftIssue {
  file: string
  section: string
  severity: "LOW" | "MEDIUM" | "HIGH"
  message: string
}

const AGENT_REQUIRED_FRONTMATTER = ["description", "mode", "model", "maxTurns"]
const AGENT_RECOMMENDED_SECTIONS = [
  "Collaboration Protocol",
  "Key Responsibilities",
  "What This Agent Must NOT Do",
  "Delegation Map",
]
const AGENT_OPTIONAL_SECTIONS = [
  "Version Awareness",
  "Common Anti-Patterns",
  "MCP Integration",
  "When Consulted",
]

const SKILL_REQUIRED_FRONTMATTER = ["description", "user-invocable", "allowed-tools"]
const SKILL_RECOMMENDED_SECTIONS = [
  "Phase",
  "Next Steps",
]

export function parseFrontmatter(content: string): Record<string, string> | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return null

  const lines = match[1].split("\n")
  const data: Record<string, string> = {}
  for (const line of lines) {
    const kv = line.match(/^(\w[\w-]*):\s*(.*)/)
    if (kv) {
      data[kv[1]] = (kv[2] || "").trim().replace(/^["']|["']$/g, "")
    }
  }
  return data
}

export function detectAgentDrift(projectRoot: string, filePath: string): DriftIssue[] {
  const issues: DriftIssue[] = []

  if (!filePath.startsWith(".agents/agents/") || !filePath.endsWith(".md")) return issues

  const fp = path.join(projectRoot, filePath)
  if (!fs.existsSync(fp)) return issues

  const content = fs.readFileSync(fp, "utf8")
  const fm = parseFrontmatter(content)

  // Frontmatter drift
  if (!fm) {
    issues.push({
      file: filePath,
      section: "frontmatter",
      severity: "HIGH",
      message: "Missing or malformed YAML frontmatter — agent will not load correctly",
    })
    return issues
  }

  for (const field of AGENT_REQUIRED_FRONTMATTER) {
    if (!fm[field]) {
      issues.push({
        file: filePath,
        section: `frontmatter.${field}`,
        severity: "HIGH",
        message: `Missing required frontmatter field '${field}'`,
      })
    }
  }

  if (fm.mode && !["primary", "subagent"].includes(fm.mode)) {
    issues.push({
      file: filePath,
      section: "frontmatter.mode",
      severity: "HIGH",
      message: `Invalid mode '${fm.mode}' — must be 'primary' or 'subagent'`,
    })
  }

  // Section drift
  for (const section of AGENT_RECOMMENDED_SECTIONS) {
    if (!content.includes(section)) {
      // Allow alternate phrasings
      if (section === "Key Responsibilities" && content.includes("Core Responsibilities")) continue
      if (section === "Delegation Map" && content.includes("Reports to")) continue
      if (section === "What This Agent Must NOT Do" && content.includes("Must NOT")) continue

      issues.push({
        file: filePath,
        section,
        severity: "MEDIUM",
        message: `Missing recommended section '${section}' — agent may lack important behavioral constraints`,
      })
    }
  }

  // Optional section bonus tracking
  for (const section of AGENT_OPTIONAL_SECTIONS) {
    if (!content.includes(section)) {
      issues.push({
        file: filePath,
        section,
        severity: "LOW",
        message: `Missing optional section '${section}' — agent could benefit from this content`,
      })
    }
  }

  // Length drift
  const lines = content.split("\n").length
  if (lines < 80) {
    issues.push({
      file: filePath,
      section: "size",
      severity: "MEDIUM",
      message: `Agent is short (${lines} lines) — may lack sufficient domain guidance`,
    })
  }

  return issues
}

export function detectSkillDrift(projectRoot: string, filePath: string): DriftIssue[] {
  const issues: DriftIssue[] = []

  if (!filePath.startsWith(".agents/skills/") || !filePath.endsWith("SKILL.md")) return issues

  const fp = path.join(projectRoot, filePath)
  if (!fs.existsSync(fp)) return issues

  const content = fs.readFileSync(fp, "utf8")
  const fm = parseFrontmatter(content)

  if (!fm) {
    issues.push({
      file: filePath,
      section: "frontmatter",
      severity: "HIGH",
      message: "Missing or malformed YAML frontmatter — skill will not load correctly",
    })
    return issues
  }

  for (const field of SKILL_REQUIRED_FRONTMATTER) {
    if (!fm[field]) {
      issues.push({
        file: filePath,
        section: `frontmatter.${field}`,
        severity: "HIGH",
        message: `Missing required frontmatter field '${field}'`,
      })
    }
  }

  // Check for structured workflow
  const hasWorkflow =
    content.includes("Phase") ||
    content.includes("## 1.") ||
    content.includes("### Step") ||
    content.includes("### 1.")

  if (!hasWorkflow) {
    issues.push({
      file: filePath,
      section: "workflow",
      severity: "MEDIUM",
      message: "No structured workflow detected — skill may lack operational clarity",
    })
  }

  // Check for agent routing
  const hasAgentRouting =
    content.includes("subagent_type") ||
    content.includes("Task") ||
    fm.agent

  if (!hasAgentRouting && !content.includes("read-only")) {
    issues.push({
      file: filePath,
      section: "agent-routing",
      severity: "LOW",
      message: "No agent routing detected — skill works alone without specialist delegation",
    })
  }

  // Check for next steps
  if (!content.includes("Next Steps") && !content.includes("next step")) {
    issues.push({
      file: filePath,
      section: "next-steps",
      severity: "LOW",
      message: "No 'Next Steps' section — users won't know what to do after the skill completes",
    })
  }

  return issues
}

export function detectCommandDrift(projectRoot: string, filePath: string): DriftIssue[] {
  const issues: DriftIssue[] = []

  if (!filePath.startsWith(".agents/commands/") || !filePath.endsWith(".md")) return issues
  if (filePath.endsWith("README.md")) return issues

  const fp = path.join(projectRoot, filePath)
  if (!fs.existsSync(fp)) return issues

  const content = fs.readFileSync(fp, "utf8")
  const fm = parseFrontmatter(content)

  if (!fm) {
    issues.push({
      file: filePath,
      section: "frontmatter",
      severity: "HIGH",
      message: "Missing or malformed YAML frontmatter — command will not be recognized",
    })
    return issues
  }

  const REQUIRED = ["description", "skill", "category"]
  for (const field of REQUIRED) {
    if (!fm[field]) {
      issues.push({
        file: filePath,
        section: `frontmatter.${field}`,
        severity: "HIGH",
        message: `Missing required frontmatter field '${field}'`,
      })
    }
  }

  // Validate skill reference exists
  if (fm.skill) {
    const skillDir = path.join(projectRoot, ".agents", "skills", fm.skill)
    if (!fs.existsSync(skillDir)) {
      issues.push({
        file: filePath,
        section: "frontmatter.skill",
        severity: "HIGH",
        message: `Referenced skill '${fm.skill}' directory not found`,
      })
    }
  }

  return issues
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

/** OpenCode V2 plugin that reports agent, skill, and command drift. */
export const DriftDetector: OpenCodePlugin.Plugin = {
  id: "ocgs.drift-detector",
  async setup(ctx) {
    const projectRoot = ctx.location.directory || process.cwd()
    const logger = createPluginLogger("drift-detector")

    logger.info("Drift detector loaded", { projectRoot })

    await ctx.tool.hook("execute.after", (event) => {
      if (event.status !== "completed") return

      const args = getToolArgs(event.input)
      const filePath = (
        (typeof args.filePath === "string" ? args.filePath : "") ||
        (typeof args.path === "string" ? args.path : "")
      ).replace(/\\/g, "/")

      if (!filePath) return

      // Quick single-file drift check on write/edit.
      let issues: DriftIssue[] = []

      if (filePath.startsWith(".agents/agents/")) {
        issues = detectAgentDrift(projectRoot, filePath)
      } else if (filePath.includes("/SKILL.md") && filePath.startsWith(".agents/skills/")) {
        issues = detectSkillDrift(projectRoot, filePath)
      } else if (filePath.startsWith(".agents/commands/")) {
        issues = detectCommandDrift(projectRoot, filePath)
      }

      if (issues.length > 0) {
        const high = issues.filter((issue) => issue.severity === "HIGH")
        if (high.length > 0) {
          logger.error(`Drift in ${filePath}: ${high.length} HIGH issues`, { issues: high })
        }

        const remaining = issues.filter((issue) => issue.severity !== "HIGH")
        if (remaining.length > 0) {
          logger.info(`Drift in ${filePath}: ${remaining.length} advisory items`, { issues: remaining })
        }
      }
    })

    const controller = new AbortController()
    void (async () => {
      try {
        for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
          if (event.type !== "session.created") continue
          if (!await isEventForProject(ctx, event, projectRoot, logger)) continue

          try {
            // Full scan on session start.
            logger.info("Running drift detection scan...")
            const allIssues: DriftIssue[] = []

            const agentsDir = path.join(projectRoot, ".agents", "agents")
            if (fs.existsSync(agentsDir)) {
              for (const file of fs.readdirSync(agentsDir)) {
                if (!file.endsWith(".md")) continue
                const relPath = `.agents/agents/${file}`
                allIssues.push(...detectAgentDrift(projectRoot, relPath))
              }
            }

            const skillsDir = path.join(projectRoot, ".agents", "skills")
            if (fs.existsSync(skillsDir)) {
              for (const dir of fs.readdirSync(skillsDir)) {
                const skillPath = path.join(skillsDir, dir)
                if (!fs.statSync(skillPath).isDirectory()) continue
                const relPath = `.agents/skills/${dir}/SKILL.md`
                if (fs.existsSync(path.join(projectRoot, relPath))) {
                  allIssues.push(...detectSkillDrift(projectRoot, relPath))
                }
              }
            }

            const commandsDir = path.join(projectRoot, ".agents", "commands")
            if (fs.existsSync(commandsDir)) {
              for (const file of fs.readdirSync(commandsDir)) {
                if (!file.endsWith(".md") || file === "README.md") continue
                const relPath = `.agents/commands/${file}`
                allIssues.push(...detectCommandDrift(projectRoot, relPath))
              }
            }

            const high = allIssues.filter((issue) => issue.severity === "HIGH")
            const medium = allIssues.filter((issue) => issue.severity === "MEDIUM")
            const low = allIssues.filter((issue) => issue.severity === "LOW")

            if (high.length > 0) {
              logger.error(`Drift detected: ${high.length} HIGH severity issues`, { issues: high })
            }
            if (medium.length > 0) {
              logger.warn(`Drift detected: ${medium.length} MEDIUM severity issues`, { issues: medium })
            }
            if (low.length > 0) {
              logger.info(`Drift advisory: ${low.length} LOW severity suggestions`, { issues: low })
            }

            if (allIssues.length === 0) {
              logger.info("Drift scan: CLEAN — all agent/skill/command files match templates")
            }
          } catch (error) {
            logger.error("Drift detection scan failed", { error: String(error) })
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

export default DriftDetector
