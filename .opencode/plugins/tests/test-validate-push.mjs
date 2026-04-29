/**
 * Test suite for validate-push hook (detectPushToProtected)
 *
 * Tests behavioral equivalence with bash validate-push.sh:
 *   - Detects push from a protected branch
 *   - Detects push to a protected branch in command
 *   - Allows push from non-protected branches
 *   - Allows push commands targeting non-protected branches
 */

import { strict as assert } from "node:assert"

// ──────────────────────────────────────────────
// Copy of handler logic (mirrors ccgs-hooks.ts)
// ──────────────────────────────────────────────

const PROTECTED_BRANCHES = ["main", "master", "develop"]

function detectPushToProtected(cmd, currentBranch) {
  for (const b of PROTECTED_BRANCHES) {
    if (currentBranch === b || new RegExp(`\\s${b}(\\s|$)`).test(cmd)) {
      return b
    }
  }
  return ""
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

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────

console.log("\n🧪 validate-push hook tests\n")

// ── S1: Push from main branch ──
run("S1: Push from main → matched 'main'", () => {
  const r = detectPushToProtected("git push origin feature-x", "main")
  assert.equal(r, "main")
})

// ── S2: Push from master branch ──
run("S2: Push from master → matched 'master'", () => {
  const r = detectPushToProtected("git push origin feature-x", "master")
  assert.equal(r, "master")
})

// ── S3: Push from develop branch ──
run("S3: Push from develop → matched 'develop'", () => {
  const r = detectPushToProtected("git push origin feature-x", "develop")
  assert.equal(r, "develop")
})

// ── S4: Push from feature branch — no match ──
run("S4: Push from feature branch → empty", () => {
  const r = detectPushToProtected("git push origin feature-x", "feature-x")
  assert.equal(r, "")
})

// ── S5: Push targeting main in command ──
run("S5: Push targeting 'main' in command → matched", () => {
  const r = detectPushToProtected("git push origin main", "feature-x")
  assert.equal(r, "main")
})

// ── S6: Push targeting master in command ──
run("S6: Push targeting 'master' in command → matched", () => {
  const r = detectPushToProtected("git push origin master", "feature-x")
  assert.equal(r, "master")
})

// ── S7: Push targeting develop in command ──
run("S7: Push targeting 'develop' in command → matched", () => {
  const r = detectPushToProtected("git push origin develop", "feature-x")
  assert.equal(r, "develop")
})

// ── S8: Push targeting feature branch — no match ──
run("S8: Push targeting 'feature-y' → empty", () => {
  const r = detectPushToProtected("git push origin feature-y", "feature-x")
  assert.equal(r, "")
})

// ── S9: Complex push command with flags ──
run("S9: Push -u origin feature-x (flags) → no match", () => {
  const r = detectPushToProtected("git push -u origin feature-x -v", "feature-x")
  assert.equal(r, "")
})

// ── S10: Push with force flag targeting main ──
run("S10: Push --force origin main → matched", () => {
  const r = detectPushToProtected("git push --force origin main", "feature-x")
  assert.equal(r, "main")
})

// ── S11: main as substring in feature-main — not matched ──
run("S11: 'feature-main' push → 'main' should NOT match as substring", () => {
  const r = detectPushToProtected("git push origin feature-main", "feature-x")
  assert.equal(r, "")
})

// ── S12: Empty command ──
run("S12: Empty command → empty", () => {
  const r = detectPushToProtected("", "feature-x")
  assert.equal(r, "")
})

// ── S13: Empty current branch ──
run("S13: Empty branch → empty", () => {
  const r = detectPushToProtected("git push origin main", "")
  assert.equal(r, "main") // still matches via command check
})

// ── Summary ──

console.log(`\n📊 Results: ${passCount}/${testCount} passed\n`)
process.exit(passCount === testCount ? 0 : 1)
