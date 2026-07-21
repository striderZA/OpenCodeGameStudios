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
import { describe, it } from "node:test"
import { validateCommitFiles, DESIGN_SECTIONS } from "../ccgs-hooks.ts"


// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function makeTempProject() {
  return fs.mkdtempSync(path.join(tmpdir(), "ccgs-commit-"))
}

function cleanup(root) {
  try { fs.rmSync(root, { recursive: true }) } catch { /* ignore */ }
}

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────

describe("validate-commit hook tests", () => {

  // ── S1: Design doc with all sections — no warnings ──
  it("S1: Complete design doc — no warnings", () => {
    const root = makeTempProject()
    fs.mkdirSync(path.join(root, "design", "gdd"), { recursive: true })
    const content = DESIGN_SECTIONS.map((s) => `## ${s}\nContent here.\n`).join("\n")
    fs.writeFileSync(path.join(root, "design", "gdd", "combat.md"), content, "utf8")

    const r = validateCommitFiles(root, ["design/gdd/combat.md"])
    assert.equal(r.warnings.length, 0)
    assert.equal(r.errors.length, 0)
    cleanup(root)
  })

  // ── S2: Design doc missing sections ──
  it("S2: Design doc missing sections — warnings per missing section", () => {
    const root = makeTempProject()
    fs.mkdirSync(path.join(root, "design", "gdd"), { recursive: true })
    fs.writeFileSync(path.join(root, "design", "gdd", "combat.md"), "## Overview\nOnly overview.\n", "utf8")

    const r = validateCommitFiles(root, ["design/gdd/combat.md"])
    assert.equal(r.warnings.length, DESIGN_SECTIONS.length - 1, "should warn for each missing section")
    assert.ok(r.warnings[0].includes("DESIGN:"))
    assert.ok(r.warnings[0].includes("missing required section"))
    cleanup(root)
  })

  // ── S3: Design doc section check is case-insensitive ──
  it("S3: Case-insensitive section matching", () => {
    const root = makeTempProject()
    fs.mkdirSync(path.join(root, "design", "gdd"), { recursive: true })
    fs.writeFileSync(path.join(root, "design", "gdd", "combat.md"), "## overview\nsome content\n## edge cases\nmore\n", "utf8")

    const r = validateCommitFiles(root, ["design/gdd/combat.md"])
    const overviewCount = r.warnings.filter((w) => w.includes("Overview")).length
    const edgeCount = r.warnings.filter((w) => w.includes("Edge Cases")).length
    // "overview" matches "Overview" via toLowerCase
    assert.ok(r.warnings.length <= DESIGN_SECTIONS.length - 2, "should match case-insensitively")
    cleanup(root)
  })

  // ── S4: Design doc outside design/gdd/ — not checked ──
  it("S4: Non-gdd markdown files — not checked", () => {
    const root = makeTempProject()
    fs.writeFileSync(path.join(root, "notes.md"), "## Overview\nNo sections needed.\n", "utf8")

    const r = validateCommitFiles(root, ["notes.md"])
    assert.equal(r.warnings.length, 0)
    cleanup(root)
  })

  // ── S5: Valid JSON asset data — no error ──
  it("S5: Valid JSON asset — no error", () => {
    const root = makeTempProject()
    fs.mkdirSync(path.join(root, "assets", "data"), { recursive: true })
    fs.writeFileSync(path.join(root, "assets", "data", "weapons.json"), JSON.stringify([{ name: "sword", damage: 10 }]), "utf8")

    const r = validateCommitFiles(root, ["assets/data/weapons.json"])
    assert.equal(r.errors.length, 0)
    cleanup(root)
  })

  // ── S6: Invalid JSON asset data — blocking error ──
  it("S6: Invalid JSON asset — blocking error", () => {
    const root = makeTempProject()
    fs.mkdirSync(path.join(root, "assets", "data"), { recursive: true })
    fs.writeFileSync(path.join(root, "assets", "data", "broken.json"), "{ invalid: json }", "utf8")

    const r = validateCommitFiles(root, ["assets/data/broken.json"])
    assert.equal(r.errors.length, 1)
    assert.ok(r.errors[0].includes("BLOCKED:"))
    assert.ok(r.errors[0].includes("broken.json"))
    cleanup(root)
  })

  // ── S7: JSON file outside assets/data/ — not validated ──
  it("S7: JSON outside assets/data/ — not validated", () => {
    const root = makeTempProject()
    fs.mkdirSync(path.join(root, "config"), { recursive: true })
    fs.writeFileSync(path.join(root, "config", "bad.json"), "not json", "utf8")

    const r = validateCommitFiles(root, ["config/bad.json"])
    assert.equal(r.errors.length, 0)
    cleanup(root)
  })

  // ── S8: Hardcoded gameplay values ──
  it("S8: Hardcoded gameplay values — warning", () => {
    const root = makeTempProject()
    fs.mkdirSync(path.join(root, "src", "gameplay"), { recursive: true })
    fs.writeFileSync(path.join(root, "src", "gameplay", "player.gd"),
      "var health = 100\nvar speed = 5.0\nfunc take_damage(amount):\n  health -= amount\n", "utf8")

    const r = validateCommitFiles(root, ["src/gameplay/player.gd"])
    assert.equal(r.warnings.length, 1)
    assert.ok(r.warnings[0].includes("CODE:"))
    assert.ok(r.warnings[0].includes("hardcoded gameplay values"))
    cleanup(root)
  })

  // ── S9: Gameplay code without hardcoded values — clean ──
  it("S9: Data-driven gameplay code — no warning", () => {
    const root = makeTempProject()
    fs.mkdirSync(path.join(root, "src", "gameplay"), { recursive: true })
    fs.writeFileSync(path.join(root, "src", "gameplay", "player.gd"),
      "var health = GameData.get('player_health')\nvar speed = get_stat('speed')\n", "utf8")

    const r = validateCommitFiles(root, ["src/gameplay/player.gd"])
    assert.equal(r.warnings.length, 0)
    cleanup(root)
  })

  // ── S10: Code outside src/gameplay/ — not checked for hardcoded values ──
  it("S10: Non-gameplay code with hardcoded values — no warning", () => {
    const root = makeTempProject()
    fs.mkdirSync(path.join(root, "src", "ui"), { recursive: true })
    fs.writeFileSync(path.join(root, "src", "ui", "hud.gd"), "var health = 100\n", "utf8")

    const r = validateCommitFiles(root, ["src/ui/hud.gd"])
    // src/ check for TODO/FIXME happens, but gameplay check only triggers for src/gameplay/
    assert.ok(r.warnings.length === 0 || !r.warnings.some((w) => w.includes("CODE:")))
    cleanup(root)
  })

  // ── S11: TODO/FIXME/HACK without owner tag ──
  it("S11: TODO/FIXME/HACK without owner — warning", () => {
    const root = makeTempProject()
    fs.mkdirSync(path.join(root, "src"), { recursive: true })
    fs.writeFileSync(path.join(root, "src", "main.gd"),
      "# TODO: fix this\n# FIXME: broken\n# HACK: ugly workaround\n", "utf8")

    const r = validateCommitFiles(root, ["src/main.gd"])
    assert.equal(r.warnings.length, 1)
    assert.ok(r.warnings[0].includes("STYLE:"))
    assert.ok(r.warnings[0].includes("without owner tag"))
    cleanup(root)
  })

  // ── S12: TODO with owner tag — clean ──
  it("S12: TODO/FIXME with owner tag — no warning", () => {
    const root = makeTempProject()
    fs.mkdirSync(path.join(root, "src"), { recursive: true })
    fs.writeFileSync(path.join(root, "src", "main.gd"),
      "# TODO(john): fix this\n# FIXME(jane): broken\n", "utf8")

    const r = validateCommitFiles(root, ["src/main.gd"])
    const todoWarnings = r.warnings.filter((w) => w.includes("STYLE:"))
    assert.equal(todoWarnings.length, 0)
    cleanup(root)
  })

  // ── S13: Mixed checks on single file — gameplay code with hardcoded values AND TODOs ──
  it("S13: Both gameplay value and TODO warnings on same file", () => {
    const root = makeTempProject()
    fs.mkdirSync(path.join(root, "src", "gameplay"), { recursive: true })
    fs.writeFileSync(path.join(root, "src", "gameplay", "combat.gd"),
      "# TODO: implement crit\nvar damage = 50\n", "utf8")

    const r = validateCommitFiles(root, ["src/gameplay/combat.gd"])
    const codeWarnings = r.warnings.filter((w) => w.includes("CODE:"))
    const styleWarnings = r.warnings.filter((w) => w.includes("STYLE:"))
    assert.equal(codeWarnings.length, 1, "should flag hardcoded damage")
    assert.equal(styleWarnings.length, 1, "should flag TODO without owner")
    cleanup(root)
  })

  // ── S14: Multiple files in one commit ──
  it("S14: Multiple staged files — warnings from each", () => {
    const root = makeTempProject()
    fs.mkdirSync(path.join(root, "design", "gdd"), { recursive: true })
    fs.writeFileSync(path.join(root, "design", "gdd", "spec.md"), "## Overview\nbarely\n", "utf8")
    fs.mkdirSync(path.join(root, "src", "gameplay"), { recursive: true })
    fs.writeFileSync(path.join(root, "src", "gameplay", "ai.gd"), "var speed = 99\n", "utf8")

    const r = validateCommitFiles(root, ["design/gdd/spec.md", "src/gameplay/ai.gd"])
    const designMissing = DESIGN_SECTIONS.length - 1 // only Overview present
    const gameplayWarning = 1 // speed = 99
    const msg = r.warnings.map((w) => w.split("\n")[0])
    assert.equal(r.warnings.length, designMissing + gameplayWarning, `expected ${designMissing + gameplayWarning} warnings, got ${r.warnings.length}: ${msg}`)
    cleanup(root)
  })

  // ── S15: Non-existent staged file — skipped ──
  it("S15: Staged file deleted before commit — no crash", () => {
    const root = makeTempProject()
    const r = validateCommitFiles(root, ["src/gameplay/ghost.gd"])
    assert.equal(r.warnings.length, 0)
    assert.equal(r.errors.length, 0)
    cleanup(root)
  })

  // ── S16: Empty staged files list ──
  it("S16: Empty staged list — no warnings", () => {
    const root = makeTempProject()
    const r = validateCommitFiles(root, [])
    assert.equal(r.warnings.length, 0)
    assert.equal(r.errors.length, 0)
    cleanup(root)
  })

  // ── S17: JSON error takes priority over warnings ──
  it("S17: Invalid JSON produces error (blocking), not warning", () => {
    const root = makeTempProject()
    fs.mkdirSync(path.join(root, "assets", "data"), { recursive: true })
    fs.writeFileSync(path.join(root, "assets", "data", "weapons.json"), "{ bad json }", "utf8")

    const r = validateCommitFiles(root, ["assets/data/weapons.json"])
    assert.equal(r.errors.length, 1, "should produce blocking error")
    assert.equal(r.warnings.length, 0, "no warnings for JSON file")
    cleanup(root)
  })

})
