/**
 * Test suite for changelog-generator plugin.
 *
 * Tests:
 *   - parseConventionalCommits (git-backed)
 *   - generateInternalChangelog (pure)
 *   - generatePlayerChangelog (pure)
 */

import { describe, it } from "node:test"
import { strict as assert } from "node:assert"
import * as fs from "node:fs"
import * as path from "node:path"
import { tmpdir } from "node:os"
import { execSync, execFileSync } from "node:child_process"

import {
  parseConventionalCommits,
  generateInternalChangelog,
  generatePlayerChangelog,
} from "../changelog-generator.ts"

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/**
 * Create a temporary git repo with the given commit messages.
 * Returns the repo directory path.
 */
function makeTempRepo(commits) {
  const dir = fs.mkdtempSync(path.join(tmpdir(), "changelog-test-"))
  execSync("git init", { cwd: dir, stdio: "ignore" })
  execSync('git config user.email "test@test.com"', { cwd: dir })
  execSync('git config user.name "Test"', { cwd: dir })
  // Create initial commit and tag so parseConventionalCommits has a baseline
  fs.writeFileSync(path.join(dir, "init.txt"), "init")
  execSync("git add init.txt", { cwd: dir })
  execSync('git commit -m "initial"', { cwd: dir, stdio: "ignore" })
  execSync("git tag v1.0.0", { cwd: dir })
  for (const msg of commits) {
    fs.writeFileSync(path.join(dir, "file.txt"), msg)
    execSync("git add file.txt", { cwd: dir })
    execFileSync("git", ["commit", "-m", msg], { cwd: dir, stdio: "ignore" })
  }
  return dir
}

/**
 * Remove a temp repo directory.
 */
function cleanup(dir) {
  try {
    fs.rmSync(dir, { recursive: true })
  } catch {
    // ignore
  }
}

/**
 * Build a CommitEntry object for pure-function tests.
 */
function entry(hash, type, scope, message, body = "", date = "2024-01-15") {
  return { hash, type, scope, message, body, date }
}

// ──────────────────────────────────────────────
// parseConventionalCommits
// ──────────────────────────────────────────────

describe("parseConventionalCommits", () => {
  it("parses conventional commits", () => {
    const dir = makeTempRepo([
      "feat: add login",
      "fix: resolve crash",
      "chore: bump deps",
    ])
    try {
      const entries = parseConventionalCommits(dir, "v1.0.0")
      assert.equal(entries.length, 3)
      // git log returns newest-first
      assert.equal(entries[0].type, "chore")
      assert.equal(entries[0].message, "bump deps")
      assert.equal(entries[1].type, "fix")
      assert.equal(entries[1].message, "resolve crash")
      assert.equal(entries[2].type, "feat")
      assert.equal(entries[2].message, "add login")
    } finally {
      cleanup(dir)
    }
  })

  it("handles non-conventional commits", () => {
    const dir = makeTempRepo([
      "random message",
      "wip stuff",
    ])
    try {
      const entries = parseConventionalCommits(dir, "v1.0.0")
      assert.equal(entries.length, 2)
      // git log returns newest-first
      assert.equal(entries[0].type, "other")
      assert.equal(entries[0].message, "wip stuff")
      assert.equal(entries[1].type, "other")
      assert.equal(entries[1].message, "random message")
    } finally {
      cleanup(dir)
    }
  })

  it("returns empty array when no commits in repo", () => {
    const dir = fs.mkdtempSync(path.join(tmpdir(), "changelog-test-"))
    execSync("git init", { cwd: dir, stdio: "ignore" })
    try {
      const entries = parseConventionalCommits(dir, "initial")
      assert.ok(Array.isArray(entries))
      assert.equal(entries.length, 0)
    } finally {
      cleanup(dir)
    }
  })

  it("parses scoped commits", () => {
    const dir = makeTempRepo([
      "feat(auth): add OAuth",
      "fix(parser): handle edge case",
    ])
    try {
      const entries = parseConventionalCommits(dir, "v1.0.0")
      assert.equal(entries.length, 2)
      // git log returns newest-first
      assert.equal(entries[0].type, "fix")
      assert.equal(entries[0].scope, "parser")
      assert.equal(entries[0].message, "handle edge case")
      assert.equal(entries[1].type, "feat")
      assert.equal(entries[1].scope, "auth")
      assert.equal(entries[1].message, "add OAuth")
    } finally {
      cleanup(dir)
    }
  })

  it("parses commits since a tag", () => {
    const dir = makeTempRepo([
      "feat: initial feature",
      "fix: initial fix",
    ])
    try {
      // Tag the current state
      execSync("git tag v0.1.0", { cwd: dir })

      // Add more commits after the tag
      const moreCommits = ["feat: post-tag feature", "fix: post-tag fix"]
      for (const msg of moreCommits) {
        fs.writeFileSync(path.join(dir, "file.txt"), msg)
        execSync("git add file.txt", { cwd: dir })
        execFileSync("git", ["commit", "-m", msg], { cwd: dir, stdio: "ignore" })
      }

      // Should only return commits after the tag (newest-first)
      const entries = parseConventionalCommits(dir, "v0.1.0")
      assert.equal(entries.length, 2)
      assert.equal(entries[0].message, "post-tag fix")
      assert.equal(entries[1].message, "post-tag feature")
    } finally {
      cleanup(dir)
    }
  })
})

// ──────────────────────────────────────────────
// generateInternalChangelog
// ──────────────────────────────────────────────

describe("generateInternalChangelog", () => {
  it("groups entries by type", () => {
    const entries = [
      entry("abc1234", "feat", "", "add login"),
      entry("def5678", "fix", "", "resolve crash"),
      entry("ghi9012", "feat", "", "add logout"),
    ]
    const result = generateInternalChangelog(entries, "1.0.0", "2024-01-15")

    // Should have FEAT section before FIX (alphabetical in TYPE_CATEGORIES)
    assert.match(result, /### FEAT/)
    assert.match(result, /### FIX/)
    // FEAT entries grouped together
    assert.ok(result.indexOf("add login") < result.indexOf("resolve crash"))
    assert.ok(result.indexOf("add logout") < result.indexOf("resolve crash"))
  })

  it("handles empty entries", () => {
    const result = generateInternalChangelog([], "1.0.0", "2024-01-15")
    assert.match(result, /# Changelog/)
    assert.match(result, /## \[1\.0\.0\] — 2024-01-15/)
    // No section headers
    assert.doesNotMatch(result, /### /)
  })

  it("includes hash links", () => {
    const entries = [
      entry("abc1234", "feat", "", "add login"),
    ]
    const result = generateInternalChangelog(entries, "1.0.0", "2024-01-15")
    assert.match(result, /\[`abc1234`\]/)
  })

  it("includes scope formatting", () => {
    const entries = [
      entry("abc1234", "fix", "auth", "fix crash"),
    ]
    const result = generateInternalChangelog(entries, "1.0.0", "2024-01-15")
    assert.match(result, /\*\*auth\*\*: fix crash/)
  })
})

// ──────────────────────────────────────────────
// generatePlayerChangelog
// ──────────────────────────────────────────────

describe("generatePlayerChangelog", () => {
  it("uses player-facing labels", () => {
    const entries = [
      entry("abc1234", "feat", "", "add login"),
      entry("def5678", "fix", "", "resolve crash"),
    ]
    const result = generatePlayerChangelog(entries, "1.0.0", "2024-01-15")
    assert.match(result, /## New Features/)
    assert.match(result, /## Bug Fixes/)
    assert.doesNotMatch(result, /FEAT/)
    assert.doesNotMatch(result, /FIX/)
  })

  it("excludes technical types", () => {
    const entries = [
      entry("abc1234", "feat", "", "add login"),
      entry("def5678", "docs", "", "update readme"),
      entry("ghi9012", "ci", "", "fix ci"),
      entry("jkl3456", "chore", "", "bump deps"),
      entry("mno7890", "test", "", "add tests"),
    ]
    const result = generatePlayerChangelog(entries, "1.0.0", "2024-01-15")
    // Only "New Features" section; no technical type sections
    assert.match(result, /## New Features/)
    assert.doesNotMatch(result, /## Bug Fixes/)
    assert.doesNotMatch(result, /docs/i)
    assert.doesNotMatch(result, /ci/i)
    assert.doesNotMatch(result, /chore/i)
    assert.doesNotMatch(result, /test/i)
  })

  it("capitalizes first letter", () => {
    const entries = [
      entry("abc1234", "feat", "", "add login"),
    ]
    const result = generatePlayerChangelog(entries, "1.0.0", "2024-01-15")
    assert.match(result, /- Add login/)
    assert.doesNotMatch(result, /- add login/)
  })

  it("removes issue references", () => {
    const entries = [
      entry("abc1234", "fix", "", "fix crash (#123)"),
    ]
    const result = generatePlayerChangelog(entries, "1.0.0", "2024-01-15")
    // Capitalized and without (#123)
    assert.match(result, /- Fix crash/)
    assert.doesNotMatch(result, /\(#123\)/)
  })
})
