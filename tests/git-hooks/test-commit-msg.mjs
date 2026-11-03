/**
 * Tests for tools/git-hooks/validate-commit-msg.mjs (Conventional Commits gate).
 */

import { execFileSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { strict as assert } from "node:assert"
import { describe, it } from "node:test"

import {
	MAX_HEADER_LENGTH,
	validateCommitMessage,
} from "../../tools/git-hooks/validate-commit-msg.mjs"

const SCRIPT = resolve(import.meta.dirname, "../../tools/git-hooks/validate-commit-msg.mjs")

const errorsFor = (message) => validateCommitMessage(message).errors
const warningsFor = (message) => validateCommitMessage(message).warnings

describe("commit-msg: accepted messages", () => {
	it("accepts a plain conventional message", () => {
		const result = validateCommitMessage("fix: correct model prefix for director agents")
		assert.deepEqual(result.errors, [])
		assert.equal(result.exempt, false)
	})

	it("accepts a scoped message with a PR reference", () => {
		assert.deepEqual(errorsFor("feat(plugin): add session-start time tracking (#109)"), [])
	})

	it("accepts a breaking change that documents the break", () => {
		const message = [
			"feat(plugin)!: drop OpenCode 1.x plugin support",
			"",
			"BREAKING CHANGE: plugins now use the V2 id/setup contract.",
		].join("\n")
		assert.deepEqual(errorsFor(message), [])
	})

	it("accepts bodies that start with markdown headings", () => {
		const message = ["chore: prepare v0.13.1", "", "## Summary", "- changelog entry", "", "Closes #109"].join("\n")
		assert.deepEqual(errorsFor(message), [])
	})

	it("accepts footers and multiple body paragraphs", () => {
		const message = ["docs(agents): document delegation rules", "", "Explains escalation.", "", "Refs: docs/architecture/ADR-004.md"].join("\n")
		assert.deepEqual(errorsFor(message), [])
	})
})

describe("commit-msg: rejected messages", () => {
	it("rejects a non-conventional header", () => {
		const errors = errorsFor("Update stuff")
		assert.equal(errors.length, 1)
		assert.match(errors[0], /does not match/)
	})

	it("rejects an unknown type", () => {
		assert.match(errorsFor("feature: add thing").join("\n"), /Unknown type "feature"/)
	})

	it("rejects an uppercase type", () => {
		assert.match(errorsFor("FEAT: add thing").join("\n"), /must be lowercase/)
	})

	it("rejects an empty scope", () => {
		assert.match(errorsFor("feat(): add thing").join("\n"), /Scope is empty/)
	})

	it("rejects an uppercase or spaced scope", () => {
		assert.match(errorsFor("feat(Plugin): add thing").join("\n"), /Scope "Plugin"/)
		assert.match(errorsFor("feat(open code): add thing").join("\n"), /does not match|Scope/)
	})

	it("rejects a trailing period in the summary", () => {
		assert.match(errorsFor("fix: correct the thing.").join("\n"), /must not end with a period/)
	})

	it("rejects an over-long header", () => {
		const header = `fix: ${"a".repeat(MAX_HEADER_LENGTH)}`
		assert.match(errorsFor(header).join("\n"), /maximum is 100/)
	})

	it("rejects a body without a separating blank line", () => {
		assert.match(errorsFor("feat: add thing\ndetails here").join("\n"), /blank line/)
	})

	it("rejects a bare breaking marker without a BREAKING CHANGE footer", () => {
		assert.match(errorsFor("feat!: drop v1 support").join("\n"), /BREAKING CHANGE/)
	})

	it("rejects an empty message", () => {
		assert.deepEqual(errorsFor(""), ["Empty commit message."])
	})

	it("treats a comments-only message as empty", () => {
		const message = ["# Please enter the commit message", "#", "# On branch master"].join("\n")
		assert.deepEqual(errorsFor(message), ["Empty commit message."])
	})

	it("rejects a summary that is only whitespace after the colon", () => {
		assert.match(errorsFor("feat:  ").join("\n"), /does not match|Summary must not be empty/)
	})
})

describe("commit-msg: generated messages are exempt", () => {
	for (const message of [
		'Merge branch \'development\' into master',
		'Merge pull request #108 from striderZA/fix/v2',
		'Revert "feat(plugin): add thing"',
		"fixup! fix: correct the thing",
		"squash! fix: correct the thing",
		"Initial commit",
	]) {
		it(`exempts: ${message}`, () => {
			const result = validateCommitMessage(message)
			assert.equal(result.exempt, true)
			assert.deepEqual(result.errors, [])
		})
	}
})

describe("commit-msg: advisory warnings", () => {
	it("warns when no issue or design reference is present", () => {
		assert.match(warningsFor("fix: correct the thing").join("\n"), /No issue\/design reference/)
	})

	it("does not warn when a reference is present", () => {
		assert.equal(warningsFor("fix: correct the thing (#42)").some((w) => /No issue/.test(w)), false)
	})

	it("warns about sentence-case summaries", () => {
		assert.match(warningsFor("fix: Correct the thing").join("\n"), /lowercase/)
	})

	it("warns when the header is longer than 72 chars but under the limit", () => {
		const header = `fix: ${"a".repeat(70)}`
		const warnings = warningsFor(header).join("\n")
		assert.match(warnings, /72 or fewer/)
		assert.deepEqual(errorsFor(header), [])
	})

	it("warns about over-long body lines", () => {
		const message = ["fix: correct the thing", "", "b".repeat(101)].join("\n")
		assert.match(warningsFor(message).join("\n"), /wrap prose at 100/)
	})
})

describe("commit-msg: scissors block", () => {
	it("ignores everything after the scissors line", () => {
		const message = [
			"fix: correct the thing",
			"",
			"# ------------------------ >8 ------------------------",
			"diff --git a/x b/x",
			"this would not parse as a body",
		].join("\n")
		assert.deepEqual(errorsFor(message), [])
	})
})

describe("commit-msg: CLI", () => {
	it("exits 1 and prints guidance for a bad message", () => {
		const dir = mkdtempSync(join(tmpdir(), "ocgs-msg-"))
		const file = join(dir, "msg.txt")
		writeFileSync(file, "bad message\n", "utf8")

		let status = 0
		let stderr = ""
		try {
			execFileSync(process.execPath, [SCRIPT, file], { encoding: "utf8", stdio: "pipe" })
		} catch (error) {
			status = error.status
			stderr = String(error.stderr)
		}

		assert.equal(status, 1)
		assert.match(stderr, /Commit message rejected/)
		assert.match(stderr, /CONTRIBUTING\.md#commit-conventions/)
		rmSync(dir, { recursive: true, force: true })
	})

	it("exits 0 for a valid message", () => {
		const dir = mkdtempSync(join(tmpdir(), "ocgs-msg-"))
		const file = join(dir, "msg.txt")
		writeFileSync(file, "test(hooks): cover the commit-msg gate (#1)\n", "utf8")

		const stdout = execFileSync(process.execPath, [SCRIPT, file], { encoding: "utf8" })
		assert.match(stdout, /follows Conventional Commits/)
		rmSync(dir, { recursive: true, force: true })
	})

	it("exits 2 when the message file is missing from the command line", () => {
		let status = 0
		try {
			execFileSync(process.execPath, [SCRIPT], { encoding: "utf8", stdio: "pipe" })
		} catch (error) {
			status = error.status
		}
		assert.equal(status, 2)
	})
})
