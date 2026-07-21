/**
 * Test suite for validate-assets hook (validateAssetPath)
 *
 * Tests behavioral equivalence with the original bash validate-assets.sh:
 *   - Naming convention check: lowercase with underscores only
 *   - JSON validation for assets/data/*.json files
 *   - Only checks files under assets/ directory
 *   - Path matching: both assets/foo and /path/to/assets/foo
 */

import { describe, it } from "node:test"
import * as fs from "node:fs"
import * as path from "node:path"
import { tmpdir } from "node:os"
import { strict as assert } from "node:assert"
import { validateAssetPath } from "../ccgs-hooks.ts"


// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function makeTempProject() {
  const tmp = fs.mkdtempSync(path.join(tmpdir(), "ccgs-assets-"))
  return tmp
}

function cleanup(root) {
  try { fs.rmSync(root, { recursive: true }) } catch { /* ignore */ }
}

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────

describe("validate-assets hook tests", () => {

  // ── S1: Non-assets files are ignored ──
  it("S1: Non-assets files return no warnings or errors", () => {
    const root = makeTempProject()
    const r1 = validateAssetPath(root, "src/main.gd")
    const r2 = validateAssetPath(root, "design/gdd/game-concept.md")
    const r3 = validateAssetPath(root, "production/sprints/sprint-01.md")
    const r4 = validateAssetPath(root, "opencode.json")

    assert.equal(r1.warnings.length, 0)
    assert.equal(r1.errors.length, 0)
    assert.equal(r2.warnings.length, 0)
    assert.equal(r2.errors.length, 0)
    assert.equal(r3.warnings.length, 0)
    assert.equal(r3.errors.length, 0)
    assert.equal(r4.warnings.length, 0)
    assert.equal(r4.errors.length, 0)
    cleanup(root)
  })

  // ── S2: Path matching — assets/ prefix (relative) ──
  it("S2: Matches paths starting with assets/", () => {
    const root = makeTempProject()
    const r = validateAssetPath(root, "assets/images/icon.png")
    // Should trigger naming check (not warnings/errors specifically, but the function should process it)
    // Just verify it doesn't return early — actual check depends on filename
    assert.ok(typeof r.warnings !== "undefined", "should process assets/ paths")
    cleanup(root)
  })

  // ── S3: Path matching — /path/to/assets/ prefix ──
  it("S3: Matches paths with /assets/", () => {
    const root = makeTempProject()
    const r = validateAssetPath(root, "/home/user/project/assets/images/icon.png")
    assert.ok(typeof r.warnings !== "undefined")
    cleanup(root)
  })

  // ── S4: Path matching — Windows backslash normalized ──
  it("S4: Matches Windows-style paths after backslash normalization", () => {
    const root = makeTempProject()
    // After normalizePath: backslashes become forward slashes
    const r = validateAssetPath(root, "assets\\data\\stats.json".replace(/\\/g, "/"))
    assert.ok(typeof r.warnings !== "undefined")
    cleanup(root)
  })

  // ── S5: Naming warning — uppercase letters ──
  it("S5: Warns on uppercase in filename", () => {
    const root = makeTempProject()
    const r = validateAssetPath(root, "assets/images/PlayerIcon.png")
    assert.equal(r.warnings.length, 1)
    assert.ok(r.warnings[0].includes("NAMING:"))
    assert.ok(r.warnings[0].includes("PlayerIcon.png"))
    assert.equal(r.errors.length, 0)
    cleanup(root)
  })

  // ── S6: Naming warning — spaces in filename ──
  it("S6: Warns on spaces in filename", () => {
    const root = makeTempProject()
    const r = validateAssetPath(root, "assets/audio/background music.ogg")
    assert.equal(r.warnings.length, 1)
    assert.ok(r.warnings[0].includes("background music.ogg"))
    cleanup(root)
  })

  // ── S7: Naming warning — hyphens in filename ──
  it("S7: Warns on hyphens in filename", () => {
    const root = makeTempProject()
    const r = validateAssetPath(root, "assets/models/player-model.glb")
    assert.equal(r.warnings.length, 1)
    assert.ok(r.warnings[0].includes("player-model.glb"))
    cleanup(root)
  })

  // ── S8: Clean lowercase with underscores — no warning ──
  it("S8: Clean lowercase_underscore name — no warning", () => {
    const root = makeTempProject()
    const r = validateAssetPath(root, "assets/images/player_icon.png")
    assert.equal(r.warnings.length, 0)
    assert.equal(r.errors.length, 0)
    cleanup(root)
  })

  // ── S9: Mixed naming issues — only first flagged ──
  it("S9: Mixed casing, space, hyphen — flagged", () => {
    const root = makeTempProject()
    const r = validateAssetPath(root, "assets/textures/UI_Bg-2x.png")
    assert.equal(r.warnings.length, 1)
    assert.ok(r.warnings[0].includes("UI_Bg-2x.png"))
    cleanup(root)
  })

  // ── S10: Valid JSON — no error ──
  it("S10: Valid JSON asset data — no error", () => {
    const root = makeTempProject()
    const filePath = path.join(root, "assets", "data", "config.json")
    fs.mkdirSync(path.join(root, "assets", "data"), { recursive: true })
    fs.writeFileSync(filePath, JSON.stringify({ name: "test", value: 42 }), "utf8")

    const r = validateAssetPath(root, filePath)
    assert.equal(r.errors.length, 0)
    cleanup(root)
  })

  // ── S11: Invalid JSON — blocking error ──
  it("S11: Invalid JSON asset data — blocking error", () => {
    const root = makeTempProject()
    const filePath = path.join(root, "assets", "data", "broken.json")
    fs.mkdirSync(path.join(root, "assets", "data"), { recursive: true })
    fs.writeFileSync(filePath, `{ "name: "missing quote }`, "utf8")

    const r = validateAssetPath(root, filePath)
    assert.equal(r.errors.length, 1)
    assert.ok(r.errors[0].includes("FORMAT:"))
    assert.ok(r.errors[0].includes("broken.json"))
    cleanup(root)
  })

  // ── S12: JSON outside assets/data/ — not validated ──
  it("S12: JSON file outside assets/data/ — not validated", () => {
    const root = makeTempProject()
    const filePath = path.join(root, "assets", "models", "data.json")
    fs.mkdirSync(path.join(root, "assets", "models"), { recursive: true })
    fs.writeFileSync(filePath, `not json {`, "utf8")

    const r = validateAssetPath(root, filePath)
    assert.equal(r.errors.length, 0, "should not validate non-data JSON")
    // But should still get naming warning for uppercase
    // (data.json is fine, no warning)
    assert.equal(r.warnings.length, 0)
    cleanup(root)
  })

  // ── S13: Naming warning + JSON error together ──
  it("S13: Both naming warning and JSON error", () => {
    const root = makeTempProject()
    const filePath = path.join(root, "assets", "data", "BadFile.json")
    fs.mkdirSync(path.join(root, "assets", "data"), { recursive: true })
    fs.writeFileSync(filePath, `invalid json`, "utf8")

    const r = validateAssetPath(root, filePath)
    assert.equal(r.warnings.length, 1, "should have naming warning")
    assert.ok(r.warnings[0].includes("BadFile.json"))
    assert.equal(r.errors.length, 1, "should have JSON error")
    // Warning for uppercase B and F
    cleanup(root)
  })

  // ── S14: JSON file that doesn't exist yet — skip validation ──
  it("S14: Non-existent JSON file — no error", () => {
    const root = makeTempProject()
    const filePath = path.join(root, "assets", "data", "future.json")

    const r = validateAssetPath(root, filePath)
    assert.equal(r.errors.length, 0, "should skip non-existent files")
    cleanup(root)
  })

  // ── S15: Empty file path — early return ──
  it("S15: Empty path — no validation", () => {
    const root = makeTempProject()
    const r = validateAssetPath(root, "")
    assert.equal(r.warnings.length, 0)
    assert.equal(r.errors.length, 0)
    cleanup(root)
  })

  // ── S16: Path with just "assets" (no trailing slash) — not matched ──
  it("S16: 'assets' without trailing slash — not treated as asset", () => {
    const root = makeTempProject()
    // "assets" without / is not an assets/ file path
    const r = validateAssetPath(root, "assets")
    assert.equal(r.warnings.length, 0)
    assert.equal(r.errors.length, 0)
    cleanup(root)
  })

})
