import type { Plugin } from "@opencode-ai/plugin"
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

function parseFrontmatter(content: string): Record<string, string> | null {
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

function detectAgentDrift(projectRoot: string, filePath: string): DriftIssue[] {
  const issues: DriftIssue[] = []

  if (!filePath.startsWith(".opencode/agents/") || !filePath.endsWith(".md")) return issues

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

function detectSkillDrift(projectRoot: string, filePath: string): DriftIssue[] {
  const issues: DriftIssue[] = []

  if (!filePath.startsWith(".opencode/skills/") || !filePath.endsWith("SKILL.md")) return issues

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

function detectCommandDrift(projectRoot: string, filePath: string): DriftIssue[] {
  const issues: DriftIssue[] = []

  if (!filePath.startsWith(".opencode/commands/") || !filePath.endsWith(".md")) return issues
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
    const skillDir = path.join(projectRoot, ".opencode", "skills", fm.skill)
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

export const DriftDetector: Plugin = async ({ project, client, directory, worktree }) => {
  const projectRoot = directory || worktree || process.cwd()
  const logger = createPluginLogger(client, "drift-detector")

  logger.info("Drift detector loaded", { projectRoot })

  return {
    event: async ({ event }) => {
      if (event.type !== "session.created") return

      // Full scan on session start
      logger.info("Running drift detection scan...")
      const allIssues: DriftIssue[] = []

      const agentsDir = path.join(projectRoot, ".opencode", "agents")
      if (fs.existsSync(agentsDir)) {
        for (const file of fs.readdirSync(agentsDir)) {
          if (!file.endsWith(".md")) continue
          const relPath = `.opencode/agents/${file}`
          allIssues.push(...detectAgentDrift(projectRoot, relPath))
        }
      }

      const skillsDir = path.join(projectRoot, ".opencode", "skills")
      if (fs.existsSync(skillsDir)) {
        for (const dir of fs.readdirSync(skillsDir)) {
          const skillPath = path.join(skillsDir, dir)
          if (!fs.statSync(skillPath).isDirectory()) continue
          const relPath = `.opencode/skills/${dir}/SKILL.md`
          if (fs.existsSync(path.join(projectRoot, relPath))) {
            allIssues.push(...detectSkillDrift(projectRoot, relPath))
          }
        }
      }

      const commandsDir = path.join(projectRoot, ".opencode", "commands")
      if (fs.existsSync(commandsDir)) {
        for (const file of fs.readdirSync(commandsDir)) {
          if (!file.endsWith(".md") || file === "README.md") continue
          const relPath = `.opencode/commands/${file}`
          allIssues.push(...detectCommandDrift(projectRoot, relPath))
        }
      }

      const high = allIssues.filter((i) => i.severity === "HIGH")
      const medium = allIssues.filter((i) => i.severity === "MEDIUM")
      const low = allIssues.filter((i) => i.severity === "LOW")

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
    },

    "tool.execute.after": async (input, output) => {
      const filePath = ((input.args?.filePath as string) || (output.args?.filePath as string) || "")
        .replace(/\\/g, "/")

      if (!filePath) return

      // Quick single-file drift check on write/edit
      let issues: DriftIssue[] = []

      if (filePath.startsWith(".opencode/agents/")) {
        issues = detectAgentDrift(projectRoot, filePath)
      } else if (filePath.includes("/SKILL.md") && filePath.startsWith(".opencode/skills/")) {
        issues = detectSkillDrift(projectRoot, filePath)
      } else if (filePath.startsWith(".opencode/commands/")) {
        issues = detectCommandDrift(projectRoot, filePath)
      }

      if (issues.length > 0) {
        const high = issues.filter((i) => i.severity === "HIGH")
        if (high.length > 0) {
          logger.error(`Drift in ${filePath}: ${high.length} HIGH issues`, { issues: high })
        }

        const remaining = issues.filter((i) => i.severity !== "HIGH")
        if (remaining.length > 0) {
          logger.info(`Drift in ${filePath}: ${remaining.length} advisory items`, { issues: remaining })
        }
      }
    },
  }
}
