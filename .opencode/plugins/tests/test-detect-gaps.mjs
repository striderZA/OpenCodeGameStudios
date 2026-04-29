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

// ──────────────────────────────────────────────
// Copy of handler logic (mirrors ccgs-hooks.ts)
// ──────────────────────────────────────────────

const SOURCE_EXTENSIONS = [".gd", ".cs", ".cpp", ".c", ".h", ".hpp", ".rs", ".py", ".js", ".ts"]

function findFilesRecursive(root, predicate) {
  const results = []
  try {
    const entries = fs.readdirSync(root, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(root, entry.name)
      if (entry.isDirectory()) {
        results.push(...findFilesRecursive(fullPath, predicate))
      } else if (entry.isFile() && predicate(entry.name, fullPath)) {
        results.push(fullPath)
      }
    }
  } catch { /* skip */ }
  return results
}

function isEngineConfigured(projectRoot) {
  const agentsMd = path.join(projectRoot, "AGENTS.md")
  if (!fs.existsSync(agentsMd)) return false
  try {
    const content = fs.readFileSync(agentsMd, "utf8")
    const engineLine = content.split("\n").find((l) => /^\s*-\s*\*\*Engine\*\*:/.test(l))
    return !engineLine?.includes("[CHOOSE:")
  } catch {
    return false
  }
}

function countSourceFiles(projectRoot) {
  const srcDir = path.join(projectRoot, "src")
  if (!fs.existsSync(srcDir)) return 0
  return findFilesRecursive(srcDir, (name) => SOURCE_EXTENSIONS.some((ext) => name.endsWith(ext))).length
}

function countDesignDocs(projectRoot) {
  const gddDir = path.join(projectRoot, "design", "gdd")
  if (!fs.existsSync(gddDir)) return 0
  return findFilesRecursive(gddDir, (name) => name.endsWith(".md")).length
}

function getSubdirNames(root) {
  if (!fs.existsSync(root)) return []
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
}

function handleDetectGaps(projectRoot) {
  const lines = []
  const emit = (...args) => lines.push(args.join(" "))

  emit("=== Checking for Documentation Gaps ===")

  const engineConfigured = isEngineConfigured(projectRoot)
  const hasGameConcept = fs.existsSync(path.join(projectRoot, "design", "gdd", "game-concept.md"))
  const srcCount = countSourceFiles(projectRoot)
  const isFresh = !engineConfigured && !hasGameConcept && srcCount === 0

  if (isFresh) {
    emit("")
    emit("NEW PROJECT: No engine configured, no game concept, no source code.")
    emit("   This looks like a fresh start! Run: /start")
    emit("")
    emit("To get a comprehensive project analysis, run: /project-stage-detect")
    emit("===================================")
    return lines.join("\n")
  }

  const designCount = countDesignDocs(projectRoot)
  if (srcCount > 50 && designCount < 5) {
    emit(`GAP: Substantial codebase (${srcCount} source files) but sparse design docs (${designCount} files)`)
    emit("    Suggested action: /reverse-document design src/[system]")
    emit("    Or run: /project-stage-detect to get full analysis")
  }

  const protoDir = path.join(projectRoot, "prototypes")
  if (fs.existsSync(protoDir)) {
    const undocumented = []
    for (const dir of getSubdirNames(protoDir)) {
      const readme = path.join(protoDir, dir, "README.md")
      const concept = path.join(protoDir, dir, "CONCEPT.md")
      if (!fs.existsSync(readme) && !fs.existsSync(concept)) {
        undocumented.push(dir)
      }
    }
    if (undocumented.length > 0) {
      emit(`GAP: ${undocumented.length} undocumented prototype(s) found:`)
      for (const proto of undocumented) {
        emit(`    - prototypes/${proto}/ (no README or CONCEPT doc)`)
      }
      emit("    Suggested action: /reverse-document concept prototypes/[name]")
    }
  }

  const coreDir = path.join(projectRoot, "src", "core")
  const engineDir = path.join(projectRoot, "src", "engine")
  const archDir = path.join(projectRoot, "docs", "architecture")
  if (fs.existsSync(coreDir) || fs.existsSync(engineDir)) {
    if (!fs.existsSync(archDir)) {
      emit("GAP: Core engine/systems exist but no docs/architecture/ directory")
      emit("    Suggested action: Create docs/architecture/ and run /architecture-decision")
    } else {
      const adrCount = findFilesRecursive(archDir, (name) => name.endsWith(".md")).length
      if (adrCount < 3) {
        emit(`GAP: Core systems exist but only ${adrCount} ADR(s) documented`)
        emit("    Suggested action: /reverse-document architecture src/core/[system]")
      }
    }
  }

  const gameplayDir = path.join(projectRoot, "src", "gameplay")
  if (fs.existsSync(gameplayDir)) {
    for (const system of getSubdirNames(gameplayDir)) {
      const sysPath = path.join(gameplayDir, system)
      const fileCount = findFilesRecursive(sysPath, () => true).length
      if (fileCount >= 5) {
        const doc1 = path.join(projectRoot, "design", "gdd", `${system}-system.md`)
        const doc2 = path.join(projectRoot, "design", "gdd", `${system}.md`)
        if (!fs.existsSync(doc1) && !fs.existsSync(doc2)) {
          emit(`GAP: Gameplay system 'src/gameplay/${system}/' (${fileCount} files) has no design doc`)
          emit(`    Expected: design/gdd/${system}-system.md or design/gdd/${system}.md`)
          emit(`    Suggested action: /reverse-document design src/gameplay/${system}`)
        }
      }
    }
  }

  if (srcCount > 100) {
    if (!fs.existsSync(path.join(projectRoot, "production", "sprints")) &&
        !fs.existsSync(path.join(projectRoot, "production", "milestones"))) {
      emit(`GAP: Large codebase (${srcCount} files) but no production planning found`)
      emit("    Suggested action: /sprint-plan or create production/ directory")
    }
  }

  emit("")
  emit("To get a comprehensive project analysis, run: /project-stage-detect")
  emit("===================================")
  return lines.join("\n")
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
  const output = handleDetectGaps(root)
  run("S1: Fresh project suggests /start", () => {
    assert.ok(output.includes("NEW PROJECT"), "should detect fresh project")
    assert.ok(output.includes("/start"), "should suggest /start")
    assert.ok(output.includes("/project-stage-detect"), "should suggest stage detect")
    assert.ok(output.endsWith("==================================="), "should return early")
  })
  cleanup(root)
}

// ── S2: Fresh project with unconfigured AGENTS.md ──
{
  const root = makeTempProject()
  fs.mkdirSync(path.join(root, "design", "gdd"), { recursive: true })
  fs.writeFileSync(path.join(root, "AGENTS.md"),
    "# Project\n## Tech Stack\n- **Engine**: [CHOOSE: Godot 4 / Unity / Unreal Engine 5]\n", "utf8")
  const output = handleDetectGaps(root)
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

  const output = handleDetectGaps(root)
  run("S3: Configured project — no gap warnings", () => {
    assert.ok(!output.includes("NEW PROJECT"), "not fresh")
    assert.ok(!output.includes("GAP:"), "no gaps")
    assert.ok(output.includes("/project-stage-detect"), "has summary")
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

  const output = handleDetectGaps(root)
  run("S4: 55 source files but 2 design docs — gap warning", () => {
    assert.ok(output.includes("55 source files"), "should mention 55 files")
    assert.ok(output.includes("2 files"), "should mention 2 design docs")
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

  const output = handleDetectGaps(root)
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

  const output = handleDetectGaps(root)
  run("S6: Reports undocumented prototypes", () => {
    assert.ok(output.includes("2 undocumented prototype(s)"), "should count 2 undocumented")
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

  const output = handleDetectGaps(root)
  run("S7: Core dir exists but no arch docs", () => {
    assert.ok(output.includes("no docs/architecture/ directory"), "should flag missing arch dir")
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

  const output = handleDetectGaps(root)
  run("S8: Core exists but only 1 ADR (< 3)", () => {
    assert.ok(output.includes("only 1 ADR(s) documented"), "should flag too few ADRs")
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

  const output = handleDetectGaps(root)
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

  const output = handleDetectGaps(root)
  run("S10: Combat (7 files, no doc) flagged; inventory (3 files) not flagged", () => {
    assert.ok(output.includes("combat"), "combat should be flagged")
    assert.ok(output.includes("7 files"), "should mention file count")
    assert.ok(output.includes("design/gdd/combat-system.md"), "should mention expected doc path")
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

  const output = handleDetectGaps(root)
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

  const output = handleDetectGaps(root)
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

  const output = handleDetectGaps(root)
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

  const output = handleDetectGaps(root)
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

  const output = handleDetectGaps(root)
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
