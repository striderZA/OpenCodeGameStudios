/**
 * Test suite for validate-commit hook (validateCommitFiles)
 *
 * Tests behavioral equivalence with bash validate-commit.sh:
 *   - Design doc section requirements
 *   - JSON validation (blocking)
 *   - Hardcoded gameplay values
 *   - TODO/FIXME without owner tag
 */

import * as fs from "node:fs"
import * as path from "node:path"
import { tmpdir } from "node:os"
import { strict as assert } from "node:assert"

// ──────────────────────────────────────────────
// Copy of handler logic (mirrors ccgs-hooks.ts)
// ──────────────────────────────────────────────

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

function validateJson(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8")
    JSON.parse(content)
    return true
  } catch {
    return false
  }
}

function validateCommitFiles(projectRoot, stagedFiles) {
  const warnings = []
  const errors = []

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
      const badTodos = content.split("\n").filter((l) => /(TODO|FIXME|HACK)[^(]/.test(l))
      if (badTodos.length > 0) {
        warnings.push(`STYLE: ${file} has TODO/FIXME without owner tag. Use TODO(name) format.`)
      }
    }
  }

  return { warnings, errors }
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
  return fs.mkdtempSync(path.join(tmpdir(), "ccgs-commit-"))
}

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────

console.log("\n🧪 validate-commit hook tests\n")

// ── S1: Design doc with all sections — no warnings ──
{
  const root = makeTempProject()
  fs.mkdirSync(path.join(root, "design", "gdd"), { recursive: true })
  const content = DESIGN_SECTIONS.map((s) => `## ${s}\nContent here.\n`).join("\n")
  fs.writeFileSync(path.join(root, "design", "gdd", "combat.md"), content, "utf8")

  const r = validateCommitFiles(root, ["design/gdd/combat.md"])
  run("S1: Complete design doc — no warnings", () => {
    assert.equal(r.warnings.length, 0)
    assert.equal(r.errors.length, 0)
  })
  cleanup(root)
}

// ── S2: Design doc missing sections ──
{
  const root = makeTempProject()
  fs.mkdirSync(path.join(root, "design", "gdd"), { recursive: true })
  fs.writeFileSync(path.join(root, "design", "gdd", "combat.md"), "## Overview\nOnly overview.\n", "utf8")

  const r = validateCommitFiles(root, ["design/gdd/combat.md"])
  run("S2: Design doc missing sections — warnings per missing section", () => {
    assert.equal(r.warnings.length, DESIGN_SECTIONS.length - 1, "should warn for each missing section")
    assert.ok(r.warnings[0].includes("DESIGN:"))
    assert.ok(r.warnings[0].includes("missing required section"))
  })
  cleanup(root)
}

// ── S3: Design doc section check is case-insensitive ──
{
  const root = makeTempProject()
  fs.mkdirSync(path.join(root, "design", "gdd"), { recursive: true })
  fs.writeFileSync(path.join(root, "design", "gdd", "combat.md"), "## overview\nsome content\n## edge cases\nmore\n", "utf8")

  const r = validateCommitFiles(root, ["design/gdd/combat.md"])
  run("S3: Case-insensitive section matching", () => {
    const overviewCount = r.warnings.filter((w) => w.includes("Overview")).length
    const edgeCount = r.warnings.filter((w) => w.includes("Edge Cases")).length
    // "overview" matches "Overview" via toLowerCase
    assert.ok(r.warnings.length <= DESIGN_SECTIONS.length - 2, "should match case-insensitively")
  })
  cleanup(root)
}

// ── S4: Design doc outside design/gdd/ — not checked ──
{
  const root = makeTempProject()
  fs.writeFileSync(path.join(root, "notes.md"), "## Overview\nNo sections needed.\n", "utf8")

  const r = validateCommitFiles(root, ["notes.md"])
  run("S4: Non-gdd markdown files — not checked", () => {
    assert.equal(r.warnings.length, 0)
  })
  cleanup(root)
}

// ── S5: Valid JSON asset data — no error ──
{
  const root = makeTempProject()
  fs.mkdirSync(path.join(root, "assets", "data"), { recursive: true })
  fs.writeFileSync(path.join(root, "assets", "data", "weapons.json"), JSON.stringify([{ name: "sword", damage: 10 }]), "utf8")

  const r = validateCommitFiles(root, ["assets/data/weapons.json"])
  run("S5: Valid JSON asset — no error", () => {
    assert.equal(r.errors.length, 0)
  })
  cleanup(root)
}

// ── S6: Invalid JSON asset data — blocking error ──
{
  const root = makeTempProject()
  fs.mkdirSync(path.join(root, "assets", "data"), { recursive: true })
  fs.writeFileSync(path.join(root, "assets", "data", "broken.json"), `{ invalid: json }`, "utf8")

  const r = validateCommitFiles(root, ["assets/data/broken.json"])
  run("S6: Invalid JSON asset — blocking error", () => {
    assert.equal(r.errors.length, 1)
    assert.ok(r.errors[0].includes("BLOCKED:"))
    assert.ok(r.errors[0].includes("broken.json"))
  })
  cleanup(root)
}

// ── S7: JSON file outside assets/data/ — not validated ──
{
  const root = makeTempProject()
  fs.mkdirSync(path.join(root, "config"), { recursive: true })
  fs.writeFileSync(path.join(root, "config", "bad.json"), `not json`, "utf8")

  const r = validateCommitFiles(root, ["config/bad.json"])
  run("S7: JSON outside assets/data/ — not validated", () => {
    assert.equal(r.errors.length, 0)
  })
  cleanup(root)
}

// ── S8: Hardcoded gameplay values ──
{
  const root = makeTempProject()
  fs.mkdirSync(path.join(root, "src", "gameplay"), { recursive: true })
  fs.writeFileSync(path.join(root, "src", "gameplay", "player.gd"),
    "var health = 100\nvar speed = 5.0\nfunc take_damage(amount):\n  health -= amount\n", "utf8")

  const r = validateCommitFiles(root, ["src/gameplay/player.gd"])
  run("S8: Hardcoded gameplay values — warning", () => {
    assert.equal(r.warnings.length, 1)
    assert.ok(r.warnings[0].includes("CODE:"))
    assert.ok(r.warnings[0].includes("hardcoded gameplay values"))
  })
  cleanup(root)
}

// ── S9: Gameplay code without hardcoded values — clean ──
{
  const root = makeTempProject()
  fs.mkdirSync(path.join(root, "src", "gameplay"), { recursive: true })
  fs.writeFileSync(path.join(root, "src", "gameplay", "player.gd"),
    "var health = GameData.get('player_health')\nvar speed = get_stat('speed')\n", "utf8")

  const r = validateCommitFiles(root, ["src/gameplay/player.gd"])
  run("S9: Data-driven gameplay code — no warning", () => {
    assert.equal(r.warnings.length, 0)
  })
  cleanup(root)
}

// ── S10: Code outside src/gameplay/ — not checked for hardcoded values ──
{
  const root = makeTempProject()
  fs.mkdirSync(path.join(root, "src", "ui"), { recursive: true })
  fs.writeFileSync(path.join(root, "src", "ui", "hud.gd"), "var health = 100\n", "utf8")

  const r = validateCommitFiles(root, ["src/ui/hud.gd"])
  run("S10: Non-gameplay code with hardcoded values — no warning", () => {
    // src/ check for TODO/FIXME happens, but gameplay check only triggers for src/gameplay/
    assert.ok(r.warnings.length === 0 || !r.warnings.some((w) => w.includes("CODE:")))
  })
  cleanup(root)
}

// ── S11: TODO/FIXME/HACK without owner tag ──
{
  const root = makeTempProject()
  fs.mkdirSync(path.join(root, "src"), { recursive: true })
  fs.writeFileSync(path.join(root, "src", "main.gd"),
    "# TODO: fix this\n# FIXME: broken\n# HACK: ugly workaround\n", "utf8")

  const r = validateCommitFiles(root, ["src/main.gd"])
  run("S11: TODO/FIXME/HACK without owner — warning", () => {
    assert.equal(r.warnings.length, 1)
    assert.ok(r.warnings[0].includes("STYLE:"))
    assert.ok(r.warnings[0].includes("without owner tag"))
  })
  cleanup(root)
}

// ── S12: TODO with owner tag — clean ──
{
  const root = makeTempProject()
  fs.mkdirSync(path.join(root, "src"), { recursive: true })
  fs.writeFileSync(path.join(root, "src", "main.gd"),
    "# TODO(john): fix this\n# FIXME(jane): broken\n", "utf8")

  const r = validateCommitFiles(root, ["src/main.gd"])
  run("S12: TODO/FIXME with owner tag — no warning", () => {
    const todoWarnings = r.warnings.filter((w) => w.includes("STYLE:"))
    assert.equal(todoWarnings.length, 0)
  })
  cleanup(root)
}

// ── S13: Mixed checks on single file — gameplay code with hardcoded values AND TODOs ──
{
  const root = makeTempProject()
  fs.mkdirSync(path.join(root, "src", "gameplay"), { recursive: true })
  fs.writeFileSync(path.join(root, "src", "gameplay", "combat.gd"),
    "# TODO: implement crit\nvar damage = 50\n", "utf8")

  const r = validateCommitFiles(root, ["src/gameplay/combat.gd"])
  run("S13: Both gameplay value and TODO warnings on same file", () => {
    const codeWarnings = r.warnings.filter((w) => w.includes("CODE:"))
    const styleWarnings = r.warnings.filter((w) => w.includes("STYLE:"))
    assert.equal(codeWarnings.length, 1, "should flag hardcoded damage")
    assert.equal(styleWarnings.length, 1, "should flag TODO without owner")
  })
  cleanup(root)
}

// ── S14: Multiple files in one commit ──
{
  const root = makeTempProject()
  fs.mkdirSync(path.join(root, "design", "gdd"), { recursive: true })
  fs.writeFileSync(path.join(root, "design", "gdd", "spec.md"), "## Overview\nbarely\n", "utf8")
  fs.mkdirSync(path.join(root, "src", "gameplay"), { recursive: true })
  fs.writeFileSync(path.join(root, "src", "gameplay", "ai.gd"), "var speed = 99\n", "utf8")

  const r = validateCommitFiles(root, ["design/gdd/spec.md", "src/gameplay/ai.gd"])
  run("S14: Multiple staged files — warnings from each", () => {
    const designMissing = DESIGN_SECTIONS.length - 1 // only Overview present
    const gameplayWarning = 1 // speed = 99
    const msg = r.warnings.map((w) => w.split("\n")[0])
    assert.equal(r.warnings.length, designMissing + gameplayWarning, `expected ${designMissing + gameplayWarning} warnings, got ${r.warnings.length}: ${msg}`)
  })
  cleanup(root)
}

// ── S15: Non-existent staged file — skipped ──
{
  const root = makeTempProject()
  const r = validateCommitFiles(root, ["src/gameplay/ghost.gd"])
  run("S15: Staged file deleted before commit — no crash", () => {
    assert.equal(r.warnings.length, 0)
    assert.equal(r.errors.length, 0)
  })
  cleanup(root)
}

// ── S16: Empty staged files list ──
{
  const root = makeTempProject()
  const r = validateCommitFiles(root, [])
  run("S16: Empty staged list — no warnings", () => {
    assert.equal(r.warnings.length, 0)
    assert.equal(r.errors.length, 0)
  })
  cleanup(root)
}

// ── S17: JSON error takes priority over warnings ──
{
  const root = makeTempProject()
  fs.mkdirSync(path.join(root, "assets", "data"), { recursive: true })
  fs.writeFileSync(path.join(root, "assets", "data", "weapons.json"), `{ bad json }`, "utf8")

  const r = validateCommitFiles(root, ["assets/data/weapons.json"])
  run("S17: Invalid JSON produces error (blocking), not warning", () => {
    assert.equal(r.errors.length, 1, "should produce blocking error")
    assert.equal(r.warnings.length, 0, "no warnings for JSON file")
  })
  cleanup(root)
}

// ── Summary ──
function cleanup(root) {
  try { fs.rmSync(root, { recursive: true }) } catch { /* ignore */ }
}

console.log(`\n📊 Results: ${passCount}/${testCount} passed\n`)
process.exit(passCount === testCount ? 0 : 1)
