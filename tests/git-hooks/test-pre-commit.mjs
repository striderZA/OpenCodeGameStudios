/**
 * Tests for tools/git-hooks/pre-commit.mjs (secrets, conflict markers, gates).
 */

import { execFileSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { strict as assert } from "node:assert"
import { describe, it } from "node:test"

import {
	checkFileSizes,
	checkFrameworkLinks,
	evaluatePreCommit,
	parseAddedLines,
	planGates,
	runGates,
	scanAddedLines,
} from "../../tools/git-hooks/pre-commit.mjs"

function makeTempDir(prefix = "ocgs-hook-") {
	return mkdtempSync(join(tmpdir(), prefix))
}

function cleanup(dir) {
	rmSync(dir, { recursive: true, force: true })
}

const DIFF = [
	"diff --git a/src/app.ts b/src/app.ts",
	"index 1111111..2222222 100644",
	"--- a/src/app.ts",
	"+++ b/src/app.ts",
	"@@ -1,2 +1,4 @@",
	"-const old = 1",
	"+const token = \"ghp_" + "a".repeat(36) + "\"",
	"+const fine = true",
	"+<<<<<<< HEAD",
	"diff --git a/docs/guide.md b/docs/guide.md",
	"--- a/docs/guide.md",
	"+++ b/docs/guide.md",
	"@@ -0,0 +1 @@",
	"+API_KEY=\"not-a-real-secret\"",
].join("\n")

describe("pre-commit: diff parsing", () => {
	it("attributes added lines to their file and skips removed lines", () => {
		const entries = parseAddedLines(DIFF)
		assert.deepEqual(
			entries.map((entry) => entry.file),
			["src/app.ts", "src/app.ts", "src/app.ts", "docs/guide.md"],
		)
		assert.equal(entries[0].text, `const token = "ghp_${"a".repeat(36)}"`)
	})

	it("ignores deleted-file hunks", () => {
		const entries = parseAddedLines(["--- a/x", "+++ /dev/null", "+should not count"].join("\n"))
		assert.deepEqual(entries, [])
	})
})

describe("pre-commit: secret and conflict scanning", () => {
	it("blocks a GitHub token", () => {
		const { errors } = scanAddedLines(parseAddedLines(DIFF))
		assert.ok(errors.some((error) => /GitHub token/.test(error)))
	})

	it("blocks a private key block", () => {
		// Assembled at runtime so this fixture does not itself trip the scanner.
		const keyHeader = ["-----BEGIN RSA", "PRIVATE KEY-----"].join(" ")
		const diff = ["+++ b/key.pem", `+${keyHeader}`].join("\n")
		const { errors } = scanAddedLines(parseAddedLines(diff))
		assert.ok(errors.some((error) => /private key/.test(error)))
	})

	it("blocks unresolved conflict markers", () => {
		const { errors } = scanAddedLines(parseAddedLines(DIFF))
		assert.ok(errors.some((error) => /conflict marker/.test(error)))
	})

	it("reports each problem once per file", () => {
		// Assembled at runtime so this fixture does not itself trip the scanner.
		const awsKey = ["AKIA", "IOSFODNN7EXAMPLE"].join("")
		const diff = [
			"+++ b/a.ts",
			`+const one = "${awsKey}"`,
			`+const two = "${awsKey}"`,
		].join("\n")
		const { errors } = scanAddedLines(parseAddedLines(diff))
		assert.equal(errors.filter((error) => /AWS access key/.test(error)).length, 1)
	})

	it("warns about hardcoded credentials in source files", () => {
		const diff = ["+++ b/src/config.ts", "+const apiKey = \"live-credential-value\""].join("\n")
		const { warnings, errors } = scanAddedLines(parseAddedLines(diff))
		assert.deepEqual(errors, [])
		assert.ok(warnings.some((warning) => /hardcoded credential/.test(warning)))
	})

	it("stays quiet for placeholders and documentation", () => {
		const diff = [
			"+++ b/docs/setup.md",
			"+const apiKey = \"your-key-here\"",
			"+++ b/tests/fixture.mjs",
			"+const token = \"example-token-value\"",
		].join("\n")
		const { warnings, errors } = scanAddedLines(parseAddedLines(diff))
		assert.deepEqual(errors, [])
		assert.deepEqual(warnings, [])
	})

	it("does not flag clean source changes", () => {
		const diff = ["+++ b/src/app.ts", "+export const add = (a: number, b: number) => a + b"].join("\n")
		const { warnings, errors } = scanAddedLines(parseAddedLines(diff))
		assert.deepEqual(errors, [])
		assert.deepEqual(warnings, [])
	})
})

describe("pre-commit: file size limits", () => {
	it("blocks files over the hard limit and warns over the soft limit", () => {
		const root = makeTempDir()
		mkdirSync(join(root, "assets"), { recursive: true })
		writeFileSync(join(root, "assets", "huge.bin"), Buffer.alloc(2048))
		writeFileSync(join(root, "assets", "large.bin"), Buffer.alloc(1024))
		writeFileSync(join(root, "assets", "ok.bin"), Buffer.alloc(10))

		const result = checkFileSizes(root, ["assets/huge.bin", "assets/large.bin", "assets/ok.bin"], {
			maxBytes: 1500,
			warnBytes: 500,
		})

		assert.equal(result.errors.length, 1)
		assert.match(result.errors[0], /huge\.bin/)
		assert.equal(result.warnings.length, 1)
		assert.match(result.warnings[0], /large\.bin/)
		cleanup(root)
	})

	it("ignores missing staged paths (deleted after staging)", () => {
		const root = makeTempDir()
		assert.deepEqual(checkFileSizes(root, ["gone.bin"]), { errors: [], warnings: [] })
		cleanup(root)
	})
})

describe("pre-commit: framework redirect integrity", () => {
	it("accepts redirect stubs that resolve", () => {
		const root = makeTempDir()
		mkdirSync(join(root, ".agents", "agents"), { recursive: true })
		mkdirSync(join(root, ".opencode"), { recursive: true })
		for (const [name, target] of [
			["agents", "../.agents/agents"],
			["commands", "../.agents/agents"],
			["rules", "../.agents/agents"],
			["skills", "../.agents/agents"],
		]) {
			writeFileSync(join(root, ".opencode", name), target, "utf8")
		}

		assert.deepEqual(checkFrameworkLinks(root).errors, [])
		cleanup(root)
	})

	it("rejects a redirect that points nowhere", () => {
		const root = makeTempDir()
		mkdirSync(join(root, ".opencode"), { recursive: true })
		for (const name of ["agents", "commands", "rules", "skills"]) {
			writeFileSync(join(root, ".opencode", name), "../.agents/missing", "utf8")
		}

		const { errors } = checkFrameworkLinks(root)
		assert.equal(errors.length, 4)
		assert.match(errors[0], /does not exist/)
		cleanup(root)
	})

	it("rejects a missing redirect", () => {
		const root = makeTempDir()
		mkdirSync(join(root, ".opencode"), { recursive: true })
		const { errors } = checkFrameworkLinks(root)
		assert.equal(errors.length, 4)
		assert.match(errors[0], /missing/)
		cleanup(root)
	})
})

describe("pre-commit: gate planning", () => {
	it("requests no gates for docs-only changes", () => {
		assert.deepEqual(planGates(["README.md", "docs/guide.md"]), [])
	})

	it("requests framework validation for .agents changes", () => {
		assert.deepEqual(planGates([".agents/agents/producer.md"]), ["framework"])
	})

	it("requests plugin tests for plugin changes", () => {
		assert.deepEqual(planGates([".opencode/plugins/ccgs-hooks.ts"]), ["plugins"])
	})

	it("requests both gates when both areas change", () => {
		assert.deepEqual(
			planGates([".agents/skills/x/SKILL.md", ".opencode/plugins/ccgs-hooks.ts"]),
			["framework", "plugins"],
		)
	})
})

describe("pre-commit: framework gate", () => {
	function stubScripts(root, {
		agentExit = 0,
		workflowExit = 0,
		workflowOutput = "",
	} = {}) {
		mkdirSync(join(root, "tests", "agents"), { recursive: true })
		mkdirSync(join(root, "tests", "workflow"), { recursive: true })
		writeFileSync(
			join(root, "tests", "agents", "validate.mjs"),
			`process.exit(${agentExit})\n`,
			"utf8",
		)
		writeFileSync(
			join(root, "tests", "workflow", "run-all.mjs"),
			`console.log(${JSON.stringify(workflowOutput)})\nprocess.exit(${workflowExit})\n`,
			"utf8",
		)
	}

	it("runs framework validation and workflow integrity", () => {
		const root = makeTempDir()
		stubScripts(root)

		const result = runGates(root, ["framework"])
		assert.deepEqual(result.errors, [])
		assert.deepEqual(result.notes, ["framework validation passed", "workflow integrity passed"])
		cleanup(root)
	})

	it("reports which gate failed and keeps the passing note", () => {
		const root = makeTempDir()
		stubScripts(root, { workflowExit: 1, workflowOutput: "FAIL I5: unknown agents" })

		const result = runGates(root, ["framework"])
		assert.equal(result.errors.length, 1)
		assert.match(result.errors[0], /workflow integrity failed/)
		assert.match(result.errors[0], /FAIL I5: unknown agents/)
		assert.deepEqual(result.notes, ["framework validation passed"])
		cleanup(root)
	})

	it("skips all gates when OCGS_SKIP_HOOK_CHECKS=1", () => {
		const root = makeTempDir()
		const result = runGates(root, ["framework", "plugins"], { OCGS_SKIP_HOOK_CHECKS: "1" })
		assert.deepEqual(result.errors, [])
		assert.match(result.notes[0], /Skipped gates/)
		cleanup(root)
	})
})

describe("pre-commit: end-to-end in a real git repo", () => {
	it("blocks a staged token and passes a clean change", () => {
		const root = makeTempDir("ocgs-repo-")
		const git = (args) =>
			execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: "pipe" })
		git(["init", "-q"])
		git(["config", "user.email", "hooks@example.com"])
		git(["config", "user.name", "Hooks Test"])

		const tokenFile = join(root, "leak.ts")
		writeFileSync(tokenFile, `const token = "ghp_${"b".repeat(36)}"\n`, "utf8")
		git(["add", "leak.ts"])
		const blocked = evaluatePreCommit(root)
		assert.ok(blocked.errors.some((error) => /GitHub token/.test(error)))

		git(["rm", "--cached", "-q", "leak.ts"])
		rmSync(tokenFile)
		writeFileSync(join(root, "clean.ts"), "export const add = (a: number, b: number) => a + b\n", "utf8")
		git(["add", "clean.ts"])
		const clean = evaluatePreCommit(root)
		assert.deepEqual(clean.errors, [])

		cleanup(root)
	})
})
