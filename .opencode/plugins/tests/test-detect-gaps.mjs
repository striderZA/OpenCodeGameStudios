/**
 * Test suite for detect-gaps hook (handleDetectGaps)
 *
 * Tests behavioral equivalence with the original bash detect-gaps.sh:
 *   - Check 0: Fresh project detection → suggests /start
 *   - Check 1: Code-heavy but sparse design docs
 *   - Check 2: Undocumented prototypes
 *   - Check 3: Core systems without architecture docs
 *   - Check 4: Gameplay systems without design docs
 *   - Check 5: Large codebase without production planning
 */

import * as fs from "node:fs"
import * as path from "node:path"
import { tmpdir } from "node:os"
import { strict as assert } from "node:assert"
import { handleDetectGaps } from "../ccgs-hooks.ts"



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
  const tmp = fs.mkdtempSync(path.join(tmpdir(), "ccgs-gaps-"))
  return tmp
}

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────

console.log("\n🧪 detect-gaps hook tests\n")

// ── S1: Fresh project — no AGENTS.md, no game concept, no source ──
{
  const root = makeTempProject()
  const output = handleDetectGaps(root).join("\n")
  run("S1: Fresh project suggests /start", () => {
    assert.ok(output.includes("NEW PROJECT"), "should detect fresh project")
    assert.ok(output.includes("/start"), "should suggest /start")
    assert.ok(output.includes("/project-stage-detect"), "should suggest stage detect")
    assert.ok(!output.includes("GAP:"), "returns early without gaps")
  })
  cleanup(root)
}

// ── S2: Fresh project with unconfigured AGENTS.md ──
{
  const root = makeTempProject()
  fs.mkdirSync(path.join(root, "design", "gdd"), { recursive: true })
  fs.writeFileSync(path.join(root, "AGENTS.md"),
    "# Project\n## Tech Stack\n- **Engine**: [CHOOSE: Godot 4 / Unity / Unreal Engine 5]\n", "utf8")
  const output = handleDetectGaps(root).join("\n")
  run("S2: Unconfigured AGENTS.md → fresh project", () => {
    assert.ok(output.includes("NEW PROJECT"), "[CHOOSE:] engine means not configured")
  })
  cleanup(root)
}

// ── S3: Configured project (no gaps) ──
{
  const root = makeTempProject()
  fs.writeFileSync(path.join(root, "AGENTS.md"), "- **Engine**: Godot 4\n", "utf8")
  fs.mkdirSync(path.join(root, "design", "gdd"), { recursive: true })
  fs.writeFileSync(path.join(root, "design", "gdd", "game-concept.md"), "# Concept", "utf8")
  fs.mkdirSync(path.join(root, "design", "gdd"), { recursive: true })
  for (let i = 0; i < 5; i++) {
    fs.writeFileSync(path.join(root, "design", "gdd", `design-${i}.md`), `# Design ${i}`, "utf8")
  }
  fs.mkdirSync(path.join(root, "src"), { recursive: true })
  for (let i = 0; i < 5; i++) {
    fs.writeFileSync(path.join(root, "src", `file${i}.gd`), "# code", "utf8")
  }

  const output = handleDetectGaps(root).join("\n")
  run("S3: Configured project — no gap warnings", () => {
    assert.ok(!output.includes("NEW PROJECT"), "not fresh")
    assert.ok(!output.includes("GAP:"), "no gaps")
    assert.strictEqual(output, "", "no output for clean project")
  })
  cleanup(root)
}

// ── S4: Code-heavy, few design docs ──
{
  const root = makeTempProject()
  fs.writeFileSync(path.join(root, "AGENTS.md"), "- **Engine**: Godot 4\n", "utf8")
  fs.mkdirSync(path.join(root, "design", "gdd"), { recursive: true })
  fs.writeFileSync(path.join(root, "design", "gdd", "game-concept.md"), "# Concept", "utf8")
  fs.writeFileSync(path.join(root, "design", "gdd", "one.md"), "# One", "utf8")

  fs.mkdirSync(path.join(root, "src"), { recursive: true })
  for (let i = 0; i < 55; i++) {
    fs.writeFileSync(path.join(root, "src", `file${i}.gd`), "# code", "utf8")
  }

  const output = handleDetectGaps(root).join("\n")
  run("S4: 55 source files but 2 design docs — gap warning", () => {
    assert.ok(output.includes("55 source files"), "should mention 55 files")
    assert.ok(output.includes("2 design docs"), "should mention 2 design docs")
    assert.ok(output.includes("/reverse-document"), "should suggest reverse doc")
  })
  cleanup(root)
}

// ── S5: Code > 50 but design >= 5 — no gap ──
{
  const root = makeTempProject()
  fs.writeFileSync(path.join(root, "AGENTS.md"), "- **Engine**: Godot 4\n", "utf8")
  fs.mkdirSync(path.join(root, "design", "gdd"), { recursive: true })
  fs.writeFileSync(path.join(root, "design", "gdd", "game-concept.md"), "# Concept", "utf8")
  for (let i = 0; i < 6; i++) {
    fs.writeFileSync(path.join(root, "design", "gdd", `d${i}.md`), `# ${i}`, "utf8")
  }
  fs.mkdirSync(path.join(root, "src"), { recursive: true })
  for (let i = 0; i < 55; i++) {
    fs.writeFileSync(path.join(root, "src", `f${i}.gd`), "# code", "utf8")
  }

  const output = handleDetectGaps(root).join("\n")
  run("S5: 55 files + 7 design docs — no gap", () => {
    assert.ok(!output.includes("GAP: Substantial codebase"), "design count >= 5 should suppress gap")
  })
  cleanup(root)
}

// ── S6: Undocumented prototypes ──
{
  const root = makeTempProject()
  fs.writeFileSync(path.join(root, "AGENTS.md"), "- **Engine**: Godot 4\n", "utf8")
  fs.mkdirSync(path.join(root, "design", "gdd"), { recursive: true })
  fs.writeFileSync(path.join(root, "design", "gdd", "game-concept.md"), "# Concept", "utf8")

  fs.mkdirSync(path.join(root, "prototypes", "proto-ai"), { recursive: true })
  fs.mkdirSync(path.join(root, "prototypes", "proto-ui"), { recursive: true })
  fs.writeFileSync(path.join(root, "prototypes", "proto-ui", "README.md"), "# UI Proto", "utf8")
  fs.mkdirSync(path.join(root, "prototypes", "proto-net"), { recursive: true })
  // proto-ai and proto-net have no README/CONCEPT

  const output = handleDetectGaps(root).join("\n")
  run("S6: Reports undocumented prototypes", () => {
    assert.ok(output.includes("2 undocumented prototypes"), "should count 2 undocumented")
    assert.ok(output.includes("proto-ai"), "should list proto-ai")
    assert.ok(output.includes("proto-net"), "should list proto-net")
    assert.ok(!output.includes("proto-ui"), "should not list documented proto")
  })
  cleanup(root)
}

// ── S7: Core systems without architecture docs ──
{
  const root = makeTempProject()
  fs.writeFileSync(path.join(root, "AGENTS.md"), "- **Engine**: Godot 4\n", "utf8")
  fs.mkdirSync(path.join(root, "design", "gdd"), { recursive: true })
  fs.writeFileSync(path.join(root, "design", "gdd", "game-concept.md"), "# Concept", "utf8")
  fs.mkdirSync(path.join(root, "src", "core"), { recursive: true })
  fs.writeFileSync(path.join(root, "src", "core", "engine.gd"), "# core engine", "utf8")

  const output = handleDetectGaps(root).join("\n")
  run("S7: Core dir exists but no arch docs", () => {
    assert.ok(output.includes("no docs/architecture/"), "should flag missing arch dir")
  })
  cleanup(root)
}

// ── S8: Core systems with too few ADRs ──
{
  const root = makeTempProject()
  fs.writeFileSync(path.join(root, "AGENTS.md"), "- **Engine**: Godot 4\n", "utf8")
  fs.mkdirSync(path.join(root, "design", "gdd"), { recursive: true })
  fs.writeFileSync(path.join(root, "design", "gdd", "game-concept.md"), "# Concept", "utf8")
  fs.mkdirSync(path.join(root, "src", "core"), { recursive: true })
  fs.writeFileSync(path.join(root, "src", "core", "engine.gd"), "# core", "utf8")
  fs.mkdirSync(path.join(root, "docs", "architecture"), { recursive: true })
  fs.writeFileSync(path.join(root, "docs", "architecture", "001-initial.md"), "# ADR 1", "utf8")

  const output = handleDetectGaps(root).join("\n")
  run("S8: Core exists but only 1 ADR (< 3)", () => {
    assert.ok(output.includes("ADRs for core systems"), "should flag too few ADRs")
  })
  cleanup(root)
}

// ── S9: Core systems with enough ADRs ──
{
  const root = makeTempProject()
  fs.writeFileSync(path.join(root, "AGENTS.md"), "- **Engine**: Godot 4\n", "utf8")
  fs.mkdirSync(path.join(root, "design", "gdd"), { recursive: true })
  fs.writeFileSync(path.join(root, "design", "gdd", "game-concept.md"), "# Concept", "utf8")
  fs.mkdirSync(path.join(root, "src", "core"), { recursive: true })
  fs.writeFileSync(path.join(root, "src", "core", "engine.gd"), "# core", "utf8")
  fs.mkdirSync(path.join(root, "docs", "architecture"), { recursive: true })
  for (let i = 1; i <= 3; i++) {
    fs.writeFileSync(path.join(root, "docs", "architecture", `${String(i).padStart(3, "0")}-adr.md`), `# ADR ${i}`, "utf8")
  }

  const output = handleDetectGaps(root).join("\n")
  run("S9: Core exists with 3 ADRs — no gap", () => {
    assert.ok(!output.includes("ADR"), "should not mention ADRs")
    assert.ok(!output.includes("docs/architecture"), "no arch gap")
  })
  cleanup(root)
}

// ── S10: Gameplay systems without design docs (5+ files) ──
{
  const root = makeTempProject()
  fs.writeFileSync(path.join(root, "AGENTS.md"), "- **Engine**: Godot 4\n", "utf8")
  fs.mkdirSync(path.join(root, "design", "gdd"), { recursive: true })
  fs.writeFileSync(path.join(root, "design", "gdd", "game-concept.md"), "# Concept", "utf8")
  fs.mkdirSync(path.join(root, "src", "gameplay", "combat"), { recursive: true })
  for (let i = 0; i < 7; i++) {
    fs.writeFileSync(path.join(root, "src", "gameplay", "combat", `attack${i}.gd`), "# code", "utf8")
  }
  fs.mkdirSync(path.join(root, "src", "gameplay", "inventory"), { recursive: true })
  for (let i = 0; i < 3; i++) {
    fs.writeFileSync(path.join(root, "src", "gameplay", "inventory", `item${i}.gd`), "# code", "utf8")
  }

  const output = handleDetectGaps(root).join("\n")
  run("S10: Combat (7 files, no doc) flagged; inventory (3 files) not flagged", () => {
    assert.ok(output.includes("combat"), "combat should be flagged")
    assert.ok(output.includes("7 files"), "should mention file count")
    assert.ok(output.includes("has no design doc"), "should mention missing doc")
    assert.ok(!output.includes("inventory"), "inventory < 5 files should not be flagged")
  })
  cleanup(root)
}

// ── S11: Gameplay system WITH design doc — no gap ──
{
  const root = makeTempProject()
  fs.writeFileSync(path.join(root, "AGENTS.md"), "- **Engine**: Godot 4\n", "utf8")
  fs.mkdirSync(path.join(root, "design", "gdd"), { recursive: true })
  fs.writeFileSync(path.join(root, "design", "gdd", "game-concept.md"), "# Concept", "utf8")
  fs.writeFileSync(path.join(root, "design", "gdd", "combat.md"), "# Combat Design", "utf8")
  fs.mkdirSync(path.join(root, "src", "gameplay", "combat"), { recursive: true })
  for (let i = 0; i < 6; i++) {
    fs.writeFileSync(path.join(root, "src", "gameplay", "combat", `a${i}.gd`), "# code", "utf8")
  }

  const output = handleDetectGaps(root).join("\n")
  run("S11: Combat with design/gdd/combat.md — no gap", () => {
    assert.ok(!output.includes("combat"), "should not flag combat")
  })
  cleanup(root)
}

// ── S12: Large codebase without production planning ──
{
  const root = makeTempProject()
  fs.writeFileSync(path.join(root, "AGENTS.md"), "- **Engine**: Godot 4\n", "utf8")
  fs.mkdirSync(path.join(root, "design", "gdd"), { recursive: true })
  fs.writeFileSync(path.join(root, "design", "gdd", "game-concept.md"), "# Concept", "utf8")
  fs.mkdirSync(path.join(root, "src"), { recursive: true })
  for (let i = 0; i < 101; i++) {
    fs.writeFileSync(path.join(root, "src", `f${i}.gd`), "# code", "utf8")
  }

  const output = handleDetectGaps(root).join("\n")
  run("S12: 101+ files without sprints/milestones — gap", () => {
    assert.ok(output.includes("101 files"), "should mention count")
    assert.ok(output.includes("no production planning"), "should flag production gap")
  })
  cleanup(root)
}

// ── S13: Large codebase WITH production planning — no gap ──
{
  const root = makeTempProject()
  fs.writeFileSync(path.join(root, "AGENTS.md"), "- **Engine**: Godot 4\n", "utf8")
  fs.mkdirSync(path.join(root, "design", "gdd"), { recursive: true })
  fs.writeFileSync(path.join(root, "design", "gdd", "game-concept.md"), "# Concept", "utf8")
  fs.mkdirSync(path.join(root, "src"), { recursive: true })
  for (let i = 0; i < 101; i++) {
    fs.writeFileSync(path.join(root, "src", `f${i}.gd`), "# code", "utf8")
  }
  fs.mkdirSync(path.join(root, "production", "sprints"), { recursive: true })
  fs.writeFileSync(path.join(root, "production", "sprints", "sprint-01.md"), "# Sprint 1", "utf8")

  const output = handleDetectGaps(root).join("\n")
  run("S13: 101 files with sprint planning — no gap", () => {
    assert.ok(!output.includes("no production planning"), "should not flag")
  })
  cleanup(root)
}

// ── S14: Code count at boundary — exactly 50 files ──
{
  const root = makeTempProject()
  fs.writeFileSync(path.join(root, "AGENTS.md"), "- **Engine**: Godot 4\n", "utf8")
  fs.mkdirSync(path.join(root, "design", "gdd"), { recursive: true })
  fs.writeFileSync(path.join(root, "design", "gdd", "game-concept.md"), "# Concept", "utf8")
  fs.mkdirSync(path.join(root, "src"), { recursive: true })
  for (let i = 0; i < 50; i++) {
    fs.writeFileSync(path.join(root, "src", `f${i}.gd`), "# code", "utf8")
  }

  const output = handleDetectGaps(root).join("\n")
  run("S14: Exactly 50 source files — no code/design gap", () => {
    assert.ok(!output.includes("50 source files"), "50 is not > 50")
    assert.ok(!output.includes("GAP: Substantial codebase"), "no code/design gap")
  })
  cleanup(root)
}

// ── S15: Empty src/ directory (no .gd etc) — should be like fresh ──
{
  const root = makeTempProject()
  fs.writeFileSync(path.join(root, "AGENTS.md"), "- **Engine**: Godot 4\n", "utf8")
  fs.mkdirSync(path.join(root, "src"), { recursive: true })
  // Only non-source files
  fs.writeFileSync(path.join(root, "src", "notes.txt"), "some notes", "utf8")

  const output = handleDetectGaps(root).join("\n")
  run("S15: src/ with only non-source files — 0 source files counted", () => {
    assert.ok(!output.includes("source files"), "no source count shown")
  })
  cleanup(root)
}

// ── Summary ──
function cleanup(root) {
  try { fs.rmSync(root, { recursive: true }) } catch { /* ignore */ }
}

console.log(`\n📊 Results: ${passCount}/${testCount} passed\n`)
process.exit(passCount === testCount ? 0 : 1)
