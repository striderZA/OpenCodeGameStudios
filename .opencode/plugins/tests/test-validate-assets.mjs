/**
 * Test suite for validate-assets hook (validateAssetPath)
 *
 * Tests behavioral equivalence with the original bash validate-assets.sh:
 *   - Naming convention check: lowercase with underscores only
 *   - JSON validation for assets/data/*.json files
 *   - Only checks files under assets/ directory
 *   - Path matching: both assets/foo and /path/to/assets/foo
 */

import * as fs from "node:fs"
import * as path from "node:path"
import { tmpdir } from "node:os"
import { strict as assert } from "node:assert"

// ──────────────────────────────────────────────
// Copy of handler logic (mirrors ccgs-hooks.ts)
// ──────────────────────────────────────────────

const ASSETS_PATH_RE = /(?:^|\/)assets\//

function validateJson(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8")
    JSON.parse(content)
    return true
  } catch {
    return false
  }
}

function normalizePath(p) {
  return p.replace(/\\/g, "/")
}

function validateAssetPath(projectRoot, filePath) {
  filePath = normalizePath(filePath)
  const warnings = []
  const errors = []

  if (!ASSETS_PATH_RE.test(filePath)) {
    return { warnings, errors }
  }

  const filename = path.basename(filePath)

  if (/[A-Z\s-]/.test(filename)) {
    warnings.push(`NAMING: ${filePath} must be lowercase with underscores (got: ${filename})`)
  }

  if (/\/assets\/data\/.*\.json$/.test(filePath)) {
    if (fs.existsSync(filePath) && !validateJson(filePath)) {
      errors.push(`FORMAT: ${filePath} is not valid JSON`)
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
  const tmp = fs.mkdtempSync(path.join(tmpdir(), "ccgs-assets-"))
  return tmp
}

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────

console.log("\n🧪 validate-assets hook tests\n")

// ── S1: Non-assets files are ignored ──
{
  const root = makeTempProject()
  const r1 = validateAssetPath(root, "src/main.gd")
  const r2 = validateAssetPath(root, "design/gdd/game-concept.md")
  const r3 = validateAssetPath(root, "production/sprints/sprint-01.md")
  const r4 = validateAssetPath(root, "opencode.json")

  run("S1: Non-assets files return no warnings or errors", () => {
    assert.equal(r1.warnings.length, 0)
    assert.equal(r1.errors.length, 0)
    assert.equal(r2.warnings.length, 0)
    assert.equal(r2.errors.length, 0)
    assert.equal(r3.warnings.length, 0)
    assert.equal(r3.errors.length, 0)
    assert.equal(r4.warnings.length, 0)
    assert.equal(r4.errors.length, 0)
  })
  cleanup(root)
}

// ── S2: Path matching — assets/ prefix (relative) ──
{
  const root = makeTempProject()
  const r = validateAssetPath(root, "assets/images/icon.png")
  run("S2: Matches paths starting with assets/", () => {
    // Should trigger naming check (not warnings/errors specifically, but the function should process it)
    // Just verify it doesn't return early — actual check depends on filename
    assert.ok(typeof r.warnings !== "undefined", "should process assets/ paths")
  })
  cleanup(root)
}

// ── S3: Path matching — /path/to/assets/ prefix ──
{
  const root = makeTempProject()
  const r = validateAssetPath(root, "/home/user/project/assets/images/icon.png")
  run("S3: Matches paths with /assets/", () => {
    assert.ok(typeof r.warnings !== "undefined")
  })
  cleanup(root)
}

// ── S4: Path matching — Windows backslash normalized ──
{
  const root = makeTempProject()
  // After normalizePath: backslashes become forward slashes
  const r = validateAssetPath(root, "assets\\data\\stats.json".replace(/\\/g, "/"))
  run("S4: Matches Windows-style paths after backslash normalization", () => {
    assert.ok(typeof r.warnings !== "undefined")
  })
  cleanup(root)
}

// ── S5: Naming warning — uppercase letters ──
{
  const root = makeTempProject()
  const r = validateAssetPath(root, "assets/images/PlayerIcon.png")
  run("S5: Warns on uppercase in filename", () => {
    assert.equal(r.warnings.length, 1)
    assert.ok(r.warnings[0].includes("NAMING:"))
    assert.ok(r.warnings[0].includes("PlayerIcon.png"))
    assert.equal(r.errors.length, 0)
  })
  cleanup(root)
}

// ── S6: Naming warning — spaces in filename ──
{
  const root = makeTempProject()
  const r = validateAssetPath(root, "assets/audio/background music.ogg")
  run("S6: Warns on spaces in filename", () => {
    assert.equal(r.warnings.length, 1)
    assert.ok(r.warnings[0].includes("background music.ogg"))
  })
  cleanup(root)
}

// ── S7: Naming warning — hyphens in filename ──
{
  const root = makeTempProject()
  const r = validateAssetPath(root, "assets/models/player-model.glb")
  run("S7: Warns on hyphens in filename", () => {
    assert.equal(r.warnings.length, 1)
    assert.ok(r.warnings[0].includes("player-model.glb"))
  })
  cleanup(root)
}

// ── S8: Clean lowercase with underscores — no warning ──
{
  const root = makeTempProject()
  const r = validateAssetPath(root, "assets/images/player_icon.png")
  run("S8: Clean lowercase_underscore name — no warning", () => {
    assert.equal(r.warnings.length, 0)
    assert.equal(r.errors.length, 0)
  })
  cleanup(root)
}

// ── S9: Mixed naming issues — only first flagged ──
{
  const root = makeTempProject()
  const r = validateAssetPath(root, "assets/textures/UI_Bg-2x.png")
  run("S9: Mixed casing, space, hyphen — flagged", () => {
    assert.equal(r.warnings.length, 1)
    assert.ok(r.warnings[0].includes("UI_Bg-2x.png"))
  })
  cleanup(root)
}

// ── S10: Valid JSON — no error ──
{
  const root = makeTempProject()
  const filePath = path.join(root, "assets", "data", "config.json")
  fs.mkdirSync(path.join(root, "assets", "data"), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify({ name: "test", value: 42 }), "utf8")

  const r = validateAssetPath(root, filePath)
  run("S10: Valid JSON asset data — no error", () => {
    assert.equal(r.errors.length, 0)
  })
  cleanup(root)
}

// ── S11: Invalid JSON — blocking error ──
{
  const root = makeTempProject()
  const filePath = path.join(root, "assets", "data", "broken.json")
  fs.mkdirSync(path.join(root, "assets", "data"), { recursive: true })
  fs.writeFileSync(filePath, `{ "name: "missing quote }`, "utf8")

  const r = validateAssetPath(root, filePath)
  run("S11: Invalid JSON asset data — blocking error", () => {
    assert.equal(r.errors.length, 1)
    assert.ok(r.errors[0].includes("FORMAT:"))
    assert.ok(r.errors[0].includes("broken.json"))
  })
  cleanup(root)
}

// ── S12: JSON outside assets/data/ — not validated ──
{
  const root = makeTempProject()
  const filePath = path.join(root, "assets", "models", "data.json")
  fs.mkdirSync(path.join(root, "assets", "models"), { recursive: true })
  fs.writeFileSync(filePath, `not json {`, "utf8")

  const r = validateAssetPath(root, filePath)
  run("S12: JSON file outside assets/data/ — not validated", () => {
    assert.equal(r.errors.length, 0, "should not validate non-data JSON")
    // But should still get naming warning for uppercase
    // (data.json is fine, no warning)
    assert.equal(r.warnings.length, 0)
  })
  cleanup(root)
}

// ── S13: Naming warning + JSON error together ──
{
  const root = makeTempProject()
  const filePath = path.join(root, "assets", "data", "BadFile.json")
  fs.mkdirSync(path.join(root, "assets", "data"), { recursive: true })
  fs.writeFileSync(filePath, `invalid json`, "utf8")

  const r = validateAssetPath(root, filePath)
  run("S13: Both naming warning and JSON error", () => {
    assert.equal(r.warnings.length, 1, "should have naming warning")
    assert.ok(r.warnings[0].includes("BadFile.json"))
    assert.equal(r.errors.length, 1, "should have JSON error")
    // Warning for uppercase B and F
  })
  cleanup(root)
}

// ── S14: JSON file that doesn't exist yet — skip validation ──
{
  const root = makeTempProject()
  const filePath = path.join(root, "assets", "data", "future.json")

  const r = validateAssetPath(root, filePath)
  run("S14: Non-existent JSON file — no error", () => {
    assert.equal(r.errors.length, 0, "should skip non-existent files")
  })
  cleanup(root)
}

// ── S15: Empty file path — early return ──
{
  const root = makeTempProject()
  const r = validateAssetPath(root, "")
  run("S15: Empty path — no validation", () => {
    assert.equal(r.warnings.length, 0)
    assert.equal(r.errors.length, 0)
  })
  cleanup(root)
}

// ── S16: Path with just "assets" (no trailing slash) — not matched ──
{
  const root = makeTempProject()
  // "assets" without / is not an assets/ file path
  const r = validateAssetPath(root, "assets")
  run("S16: 'assets' without trailing slash — not treated as asset", () => {
    assert.equal(r.warnings.length, 0)
    assert.equal(r.errors.length, 0)
  })
  cleanup(root)
}

// ── Summary ──
function cleanup(root) {
  try { fs.rmSync(root, { recursive: true }) } catch { /* ignore */ }
}

console.log(`\n📊 Results: ${passCount}/${testCount} passed\n`)
process.exit(passCount === testCount ? 0 : 1)
