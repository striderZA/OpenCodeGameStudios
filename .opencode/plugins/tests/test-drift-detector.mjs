/**
 * Test suite for drift-detector plugin
 *
 * Tests parseFrontmatter, detectAgentDrift, detectSkillDrift, detectCommandDrift
 * using isolated temp directories for filesystem operations.
 */

import { describe, it } from "node:test"
import assert from "node:assert"
import * as fs from "node:fs"
import * as path from "node:path"
import { tmpdir } from "node:os"

import {
  parseFrontmatter,
  detectAgentDrift,
  detectSkillDrift,
  detectCommandDrift,
} from "../drift-detector.ts"

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function tempRoot() {
  return fs.mkdtempSync(path.join(tmpdir(), "drift-test-"))
}

function cleanup(dir) {
  try {
    fs.rmSync(dir, { recursive: true })
  } catch {
    /* ignore */
  }
}

function write(root, relPath, content) {
  const fp = path.join(root, relPath)
  fs.mkdirSync(path.dirname(fp), { recursive: true })
  fs.writeFileSync(fp, content, "utf8")
}

// ──────────
// Complete agent template (>= 80 lines, all frontmatter + all sections)
// ──────────
const COMPLETE_AGENT_CONTENT = `---
description: Test agent for drift testing
mode: subagent
model: claude-sonnet-4-20250514
maxTurns: 20
---

# Test Agent

This is a test agent used to verify drift detection.

## Collaboration Protocol

This agent communicates via structured messages.

## Key Responsibilities

- Test the drift detector
- Verify agent templates

## What This Agent Must NOT Do

- Modify production data
- Delete files

## Delegation Map

Reports to the main agent for coordination.

## Version Awareness

This agent is version 1.0.

## Common Anti-Patterns

- Hardcoding paths
- Ignoring errors

## MCP Integration

Uses the filesystem MCP server.

## When Consulted

This agent is consulted on drift detection matters.

## Detailed Behavior

When running tests, this agent creates temporary files and verifies output.

## Error Handling

All errors are caught and reported gracefully.

## Additional Padding

This section adds lines to ensure the agent content exceeds the 80-line threshold.
Line 1 of padding.
Line 2 of padding.
Line 3 of padding.
Line 4 of padding.
Line 5 of padding.
Line 6 of padding.
Line 7 of padding.
Line 8 of padding.
Line 9 of padding.
Line 10 of padding.
Line 11 of padding.
Line 12 of padding.
Line 13 of padding.
Line 14 of padding.
Line 15 of padding.
Line 16 of padding.
Line 17 of padding.
Line 18 of padding.
Line 19 of padding.
Line 20 of padding.
Line 21 of padding.
Line 22 of padding.
Line 23 of padding.
Line 24 of padding.
Line 25 of padding.
Line 26 of padding.
`

// ──────────
// Minimal agent (only frontmatter, recommended sections, but short content)
// ──────────
const MINIMAL_AGENT_CONTENT = `---
description: A test agent
mode: subagent
model: claude-sonnet-4-20250514
maxTurns: 10
---

# Minimal Agent

## Collaboration Protocol

N/A

## Key Responsibilities

Test.

## What This Agent Must NOT Do

Harm.

## Delegation Map

None.
`

// ──────────
// Complete skill template
// ──────────
const COMPLETE_SKILL_CONTENT = `---
description: Test skill for drift detection
user-invocable: true
allowed-tools: [read, write]
agent: generic
---

# Test Skill

## Phase

1. Initialize context
2. Execute operation
3. Report results

### Step 1: Initialize

Gather all required inputs.

### Step 2: Execute

Perform the operation with gathered inputs.

### Step 3: Report

Return results to the caller.

## Next Steps

Verify the results and clean up temporary files.

## Notes

This skill is used only for testing.
`

// ──────────
// Complete command template
// ──────────
const COMPLETE_COMMAND_CONTENT = `---
description: Test command for drift detection
skill: test-skill
category: testing
---

# Test Command

This is a test command that references the test-skill.
`

// ──────────────────────────────────────────────
// parseFrontmatter
// ──────────────────────────────────────────────

describe("parseFrontmatter", () => {
  it("parses valid YAML frontmatter", () => {
    const content = `---
name: test-agent
description: An agent for testing
maxTurns: 10
---
# Content`
    const result = parseFrontmatter(content)
    assert.ok(result !== null, "should return an object")
    assert.strictEqual(result.name, "test-agent")
    assert.strictEqual(result.description, "An agent for testing")
    assert.strictEqual(result.maxTurns, "10")
  })

  it("returns null when no frontmatter present", () => {
    const content = "# Just a heading\n\nSome content without frontmatter."
    const result = parseFrontmatter(content)
    assert.strictEqual(result, null)
  })

  it("handles quoted values (strips quotes)", () => {
    const content = `---
name: "quoted-agent"
description: 'A quoted description'
---
# Content`
    const result = parseFrontmatter(content)
    assert.ok(result !== null)
    assert.strictEqual(result.name, "quoted-agent")
    assert.strictEqual(result.description, "A quoted description")
  })

  it("handles missing values gracefully (empty string)", () => {
    const content = `---
name: test-agent
description: ""
---
# Content`
    const result = parseFrontmatter(content)
    assert.ok(result !== null)
    assert.strictEqual(result.name, "test-agent")
    assert.strictEqual(result.description, "")
  })
})

// ──────────────────────────────────────────────
// detectAgentDrift
// ──────────────────────────────────────────────

describe("detectAgentDrift", () => {
  it("returns no issues for complete agent (all frontmatter + all sections)", () => {
    const root = tempRoot()
    try {
      write(root, ".agents/agents/test-agent.md", COMPLETE_AGENT_CONTENT)
      const issues = detectAgentDrift(root, ".agents/agents/test-agent.md")
      assert.strictEqual(issues.length, 0, `Expected 0 issues, got ${issues.length}: ${JSON.stringify(issues)}`)
    } finally {
      cleanup(root)
    }
  })

  it("reports HIGH severity for missing/malformed frontmatter", () => {
    const root = tempRoot()
    try {
      const content = `# No Frontmatter Agent\n\nThis file has no frontmatter block.`
      write(root, ".agents/agents/bad-agent.md", content)
      const issues = detectAgentDrift(root, ".agents/agents/bad-agent.md")
      assert.ok(issues.length > 0, "should report issues")
      const hasHigh = issues.some((i) => i.severity === "HIGH" && i.section === "frontmatter")
      assert.ok(hasHigh, JSON.stringify(issues))
    } finally {
      cleanup(root)
    }
  })

  it("reports HIGH severity for missing required frontmatter fields", () => {
    const root = tempRoot()
    try {
      // missing mode, model, maxTurns
      const content = `---
description: Incomplete agent
---
# Incomplete Agent`
      write(root, ".agents/agents/incomplete-agent.md", content)
      const issues = detectAgentDrift(root, ".agents/agents/incomplete-agent.md")
      const highFields = issues
        .filter((i) => i.severity === "HIGH" && i.section.startsWith("frontmatter."))
        .map((i) => i.section)
      assert.ok(
        highFields.some((s) => s.includes("mode")),
        `missing mode not flagged: ${JSON.stringify(highFields)}`,
      )
      assert.ok(
        highFields.some((s) => s.includes("model")),
        `missing model not flagged: ${JSON.stringify(highFields)}`,
      )
      assert.ok(
        highFields.some((s) => s.includes("maxTurns")),
        `missing maxTurns not flagged: ${JSON.stringify(highFields)}`,
      )
    } finally {
      cleanup(root)
    }
  })

  it("reports MEDIUM severity for missing recommended sections", () => {
    const root = tempRoot()
    try {
      // Has full frontmatter but only "Collaboration Protocol" section
      const content = `---
description: Sparse agent
mode: subagent
model: claude-sonnet-4-20250514
maxTurns: 10
---
# Sparse Agent

## Collaboration Protocol

Basic communication.

Some padding to approach 80 lines.
${Array.from({ length: 70 }, (_, i) => `Line ${i + 1} for padding.`).join("\n")}
`
      write(root, ".agents/agents/sparse-agent.md", content)
      const issues = detectAgentDrift(root, ".agents/agents/sparse-agent.md")
      const mediumSections = issues
        .filter((i) => i.severity === "MEDIUM" && !i.section.startsWith("frontmatter"))
        .map((i) => i.section)

      assert.ok(
        mediumSections.includes("Key Responsibilities"),
        `Key Responsibilities not in ${JSON.stringify(mediumSections)}`,
      )
      assert.ok(
        mediumSections.includes("What This Agent Must NOT Do"),
        `What This Agent Must NOT Do not in ${JSON.stringify(mediumSections)}`,
      )
      assert.ok(
        mediumSections.includes("Delegation Map"),
        `Delegation Map not in ${JSON.stringify(mediumSections)}`,
      )
    } finally {
      cleanup(root)
    }
  })

  it("ignores non-agent files (returns empty array)", () => {
    const root = tempRoot()
    try {
      write(root, "src/gameplay/test.md", COMPLETE_AGENT_CONTENT)
      const issues = detectAgentDrift(root, "src/gameplay/test.md")
      assert.strictEqual(issues.length, 0)
    } finally {
      cleanup(root)
    }
  })
})

// ──────────────────────────────────────────────
// detectSkillDrift
// ──────────────────────────────────────────────

describe("detectSkillDrift", () => {
  it("returns no issues for complete skill", () => {
    const root = tempRoot()
    try {
      write(root, ".agents/skills/test-skill/SKILL.md", COMPLETE_SKILL_CONTENT)
      const issues = detectSkillDrift(root, ".agents/skills/test-skill/SKILL.md")
      assert.strictEqual(issues.length, 0, `Expected 0 issues, got ${issues.length}: ${JSON.stringify(issues)}`)
    } finally {
      cleanup(root)
    }
  })

  it("reports HIGH severity for missing frontmatter", () => {
    const root = tempRoot()
    try {
      const content = `# No Frontmatter Skill\n\nThis skill has no frontmatter block.`
      write(root, ".agents/skills/bad-skill/SKILL.md", content)
      const issues = detectSkillDrift(root, ".agents/skills/bad-skill/SKILL.md")
      const hasHigh = issues.some((i) => i.severity === "HIGH" && i.section === "frontmatter")
      assert.ok(hasHigh, JSON.stringify(issues))
    } finally {
      cleanup(root)
    }
  })

  it("ignores non-skill files", () => {
    const root = tempRoot()
    try {
      write(root, "some/file.md", COMPLETE_SKILL_CONTENT)
      const issues = detectSkillDrift(root, "some/file.md")
      assert.strictEqual(issues.length, 0)
    } finally {
      cleanup(root)
    }
  })
})

// ──────────────────────────────────────────────
// detectCommandDrift
// ──────────────────────────────────────────────

describe("detectCommandDrift", () => {
  it("returns no issues for complete command", () => {
    const root = tempRoot()
    try {
      // Create the referenced skill directory so the skill reference check passes
      write(root, ".agents/skills/test-skill/SKILL.md", COMPLETE_SKILL_CONTENT)
      write(root, ".agents/commands/test-cmd.md", COMPLETE_COMMAND_CONTENT)
      const issues = detectCommandDrift(root, ".agents/commands/test-cmd.md")
      assert.strictEqual(issues.length, 0, `Expected 0 issues, got ${issues.length}: ${JSON.stringify(issues)}`)
    } finally {
      cleanup(root)
    }
  })

  it("reports HIGH severity for missing required frontmatter", () => {
    const root = tempRoot()
    try {
      const content = `---
description: Only description
---
# Incomplete Command`
      write(root, ".agents/commands/incomplete-cmd.md", content)
      const issues = detectCommandDrift(root, ".agents/commands/incomplete-cmd.md")
      const highFields = issues
        .filter((i) => i.severity === "HIGH")
        .map((i) => i.section)
      assert.ok(
        highFields.some((s) => s.includes("skill")),
        `missing skill not flagged: ${JSON.stringify(highFields)}`,
      )
      assert.ok(
        highFields.some((s) => s.includes("category")),
        `missing category not flagged: ${JSON.stringify(highFields)}`,
      )
    } finally {
      cleanup(root)
    }
  })

  it("reports HIGH severity when referenced skill directory doesn't exist", () => {
    const root = tempRoot()
    try {
      const content = `---
description: Broken command
skill: nonexistent-skill
category: testing
---
# Broken Command`
      write(root, ".agents/commands/broken-cmd.md", content)
      const issues = detectCommandDrift(root, ".agents/commands/broken-cmd.md")
      const skillIssues = issues.filter(
        (i) => i.section === "frontmatter.skill" && i.severity === "HIGH",
      )
      assert.ok(skillIssues.length > 0, JSON.stringify(issues))
      assert.ok(
        skillIssues[0].message.includes("nonexistent-skill"),
        `Expected message to mention nonexistent-skill: ${skillIssues[0].message}`,
      )
    } finally {
      cleanup(root)
    }
  })
})
