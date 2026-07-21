/**
 * Test suite for validate-skill-change hook (detectSkillChange)
 *
 * Tests behavioral equivalence with bash validate-skill-change.sh:
 *   - Detects file edits inside .agents/skills/ or .agents/commands/ (canonical)
 *   - Also matches .opencode/skills/ or .opencode/commands/ (backward compat)
 *   - Extracts skill/command name from path
 *   - Returns null for non-skill paths
 *   - Works with Windows-style paths
 */

import { strict as assert } from "node:assert"
import { detectSkillChange } from "../ccgs-hooks.ts"


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

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────

console.log("\n🧪 validate-skill-change hook tests\n")

// ── S1: Detects skill file in .agents/skills/ (canonical path) ──
{
  const result = detectSkillChange("/project/.agents/skills/my-skill/SKILL.md")
  run("S1: .agents/skills/ path — extracts name", () => {
    assert.equal(result, "my-skill")
  })
}

// ── S2: Detects command file in .agents/commands/ (canonical path) ──
{
  const result = detectSkillChange("/project/.agents/commands/my-command/COMMAND.md")
  run("S2: .agents/commands/ path — extracts name", () => {
    assert.equal(result, "my-command")
  })
}

// ── S2b: Backward compat — .opencode/ paths still match ──
{
  const r1 = detectSkillChange("/project/.opencode/skills/legacy-skill/SKILL.md")
  const r2 = detectSkillChange("/project/.opencode/commands/legacy-cmd/COMMAND.md")
  run("S2b: .opencode/ paths (legacy) — still extract name", () => {
    assert.equal(r1, "legacy-skill")
    assert.equal(r2, "legacy-cmd")
  })
}

// ── S3: Returns null for non-skill paths ──
{
  const r1 = detectSkillChange("/project/src/main.gd")
  const r2 = detectSkillChange("/project/design/gdd/combat.md")
  const r3 = detectSkillChange("/project/opencode.json")
  const r4 = detectSkillChange("/project/.opencode/plugins/ccgs-hooks.ts")
  const r5 = detectSkillChange("/project/.agents/plugins/some-tool.ts")

  run("S3: Non-skill paths return null", () => {
    assert.equal(r1, null)
    assert.equal(r2, null)
    assert.equal(r3, null)
    assert.equal(r4, null)
    assert.equal(r5, null)
  })
}

// ── S4: Windows backslash paths — still matches ──
{
  run("S4: Windows backslash path — still extracts name", () => {
    // Backslashes don't match forward-slash regex before normalization
    const rawResult = detectSkillChange("E:\\Project\\.opencode\\skills\\my-skill\\SKILL.md")
    assert.equal(rawResult, null)
    // After normalizePath (backslashes → forward slashes) it matches
    const normResult = detectSkillChange("E:/Project/.agents/skills/my-skill/SKILL.md")
    assert.equal(normResult, "my-skill")
  })
}

// ── S5: Relative path without leading / ──
{
  const result = detectSkillChange(".agents/commands/format-code/COMMAND.md")
  run("S5: Relative path — still extracts name", () => {
    assert.equal(result, "format-code")
  })
}

// ── S6: Deeply nested file inside skill directory ──
{
  const result = detectSkillChange("/project/.agents/skills/debugging/reference/examples.json")
  run("S6: Deep file in skill dir — extracts name", () => {
    assert.equal(result, "debugging")
  })
}

// ── S7: Name with hyphens and numbers ──
{
  const result = detectSkillChange("/project/.agents/skills/test-driven-development/SCRIPTS.md")
  run("S7: Name with hyphens — extracted correctly", () => {
    assert.equal(result, "test-driven-development")
  })
}

// ── S8: Path with .opencode but no skills/ or commands/ subdir ──
{
  const result = detectSkillChange("/project/.opencode/plugins/ccgs-hooks.ts")
  run("S8: .opencode/ but not skills/commands/ — null", () => {
    assert.equal(result, null)
  })
}

// ── S9: Skills directory NOT under .agents/ or .opencode/ — not matched ──
{
  const result = detectSkillChange("/project/src/skills/stuff.txt")
  run("S9: skills/ dir not under .agents/.opencode — null", () => {
    assert.equal(result, null)
  })
}

// ── S10: Commands directory NOT under .agents/ or .opencode/ — not matched ──
{
  const result = detectSkillChange("/project/other/commands/foo.md")
  run("S10: commands/ dir not under .agents/.opencode — null", () => {
    assert.equal(result, null)
  })
}

// ── S11: Empty string ──
{
  const result = detectSkillChange("")
  run("S11: Empty path — null", () => {
    assert.equal(result, null)
  })
}

// ── S12: Path ending with the skill directory itself ──
{
  const result = detectSkillChange("/project/.agents/skills/caveman")
  run("S12: Path ends at skill dir (no file) — still extracts name", () => {
    assert.equal(result, "caveman")
  })
}

// ── Summary ──

console.log(`\n📊 Results: ${passCount}/${testCount} passed\n`)
process.exit(passCount === testCount ? 0 : 1)
