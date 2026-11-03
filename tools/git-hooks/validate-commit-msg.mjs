#!/usr/bin/env node

/**
 * Conventional Commit validator for the `commit-msg` git hook.
 *
 * Rules are derived from CONTRIBUTING.md#commit-conventions:
 *   <type>(<scope>)!?: <summary>
 *   - types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
 *   - optional scope: lowercase system name, no spaces
 *   - summary: imperative, no trailing period, <= 100 chars (72 recommended)
 *   - body separated from the header by one blank line
 *   - `!` in the header requires a `BREAKING CHANGE:` footer
 *
 * Usage: node tools/git-hooks/validate-commit-msg.mjs <path-to-commit-message>
 * Exit codes: 0 = accepted, 1 = rejected, 2 = usage/IO error.
 */

import { readFileSync } from "node:fs"
import { pathToFileURL } from "node:url"

export const CONVENTIONAL_TYPES = [
	"feat",
	"fix",
	"docs",
	"style",
	"refactor",
	"perf",
	"test",
	"build",
	"ci",
	"chore",
	"revert",
]

export const MAX_HEADER_LENGTH = 100
export const RECOMMENDED_HEADER_LENGTH = 72
export const MAX_BODY_LINE_LENGTH = 100

/**
 * Messages produced by git itself (or by squash/rebase tooling) that must not be
 * rewritten into Conventional Commit form.
 */
export const EXEMPT_MESSAGE_PATTERNS = [
	/^Merge (?:branch|remote-tracking branch|tag|pull request|commit)\b/,
	/^Merge /,
	/^Revert "/,
	/^(?:fixup|squash|amend)! /,
	/^Initial commit$/,
]

const SCISSORS = /^# -+ >8 -+$/
const HEADER = /^([A-Za-z]+)(?:\(([^()]*)\))?(!)?: (.+)$/
const SCOPE = /^[a-z0-9][a-z0-9._/-]*$/
const BREAKING_FOOTER = /^BREAKING[ -]CHANGE:/m
const REFERENCE = /(?:\(#\d+\)|\b(?:closes|fixes|resolves|refs?|task|design)\b[:\s]\s*(?:#\d+|[\w./-]+))/i

/**
 * Split a raw commit message into trimmed, meaningful lines.
 * The scissors block (added by `git commit --verbose`) is discarded.
 *
 * Lines beginning with `#` are preserved: commit bodies in this repo legitimately
 * use Markdown headings (`## Summary`), and `git commit -m` does not strip them.
 */
export function splitMessage(raw) {
	const text = String(raw ?? "").replace(/\r\n/g, "\n")
	const lines = text.split("\n")
	const scissorsAt = lines.findIndex((line) => SCISSORS.test(line))
	const kept = scissorsAt === -1 ? lines : lines.slice(0, scissorsAt)
	const trimmed = kept.map((line) => line.replace(/\s+$/, ""))
	while (trimmed.length > 0 && trimmed[trimmed.length - 1] === "") trimmed.pop()
	while (trimmed.length > 0 && trimmed[0] === "") trimmed.shift()
	return trimmed
}

/**
 * Validate a raw commit message.
 * @param {string} raw
 * @returns {{ errors: string[], warnings: string[], exempt: boolean }}
 */
export function validateCommitMessage(raw) {
	const errors = []
	const warnings = []
	const lines = splitMessage(raw)
	const meaningful = lines.filter((line) => line !== "" && !line.startsWith("#"))

	if (meaningful.length === 0) {
		return { errors: ["Empty commit message."], warnings, exempt: false }
	}

	const header = lines[0]

	if (EXEMPT_MESSAGE_PATTERNS.some((pattern) => pattern.test(header))) {
		return { errors, warnings, exempt: true }
	}

	const match = header.match(HEADER)
	if (!match) {
		errors.push(
			`Header does not match "<type>(<scope>): <summary>": "${header}"`,
		)
		return { errors, warnings, exempt: false }
	}

	const [, type, scope, bang, subject] = match

	if (type !== type.toLowerCase()) {
		errors.push(`Type "${type}" must be lowercase.`)
	}
	if (!CONVENTIONAL_TYPES.includes(type.toLowerCase())) {
		errors.push(
			`Unknown type "${type}". Use one of: ${CONVENTIONAL_TYPES.join(", ")}.`,
		)
	}

	if (scope !== undefined) {
		if (scope.trim() === "") {
			errors.push("Scope is empty. Write `type(scope): summary` or `type: summary`.")
		} else if (!SCOPE.test(scope)) {
			errors.push(
				`Scope "${scope}" must be lowercase letters, digits, ".", "_", "-" or "/" (no spaces).`,
			)
		}
	}

	if (subject.trim() === "") {
		errors.push("Summary must not be empty.")
	} else if (subject.trim() !== subject) {
		errors.push("Summary must not start or end with whitespace.")
	}

	if (subject.endsWith(".")) {
		errors.push(`Summary must not end with a period: "${subject}"`)
	}

	if (/^[A-Z]/.test(subject)) {
		warnings.push(
			"Summary should start lowercase and use imperative mood (e.g. \"add\", not \"Added\").",
		)
	}

	if (header.length > MAX_HEADER_LENGTH) {
		errors.push(
			`Header is ${header.length} chars; maximum is ${MAX_HEADER_LENGTH}. Move detail into the body.`,
		)
	} else if (header.length > RECOMMENDED_HEADER_LENGTH) {
		warnings.push(
			`Header is ${header.length} chars; ${RECOMMENDED_HEADER_LENGTH} or fewer reads better in \`git log --oneline\`.`,
		)
	}

	const body = lines.slice(1)

	if (body.length > 0) {
		if (body[0] !== "") {
			errors.push("Leave one blank line between the header and the body.")
		}
		if (bang && !BREAKING_FOOTER.test(body.join("\n"))) {
			errors.push(
				`Header marks a breaking change ("!") but the body has no "BREAKING CHANGE:" footer.`,
			)
		}
		body.forEach((line, index) => {
			if (line.length > MAX_BODY_LINE_LENGTH) {
				warnings.push(
					`Body line ${index + 2} is ${line.length} chars; wrap prose at ${MAX_BODY_LINE_LENGTH}.`,
				)
			}
		})
	} else if (bang) {
		errors.push(
			`Header marks a breaking change ("!") but there is no "BREAKING CHANGE:" footer.`,
		)
	}

	if (!REFERENCE.test(lines.join("\n"))) {
		warnings.push(
			'No issue/design reference found. Add "Closes #123", "Refs: #123" or "(#123)" (docs/CONTRIBUTING.md#pr-process).',
		)
	}

	return { errors, warnings, exempt: false }
}

/** Format validation results as hook output. */
export function formatResult({ errors, warnings, exempt }, header) {
	const out = []
	if (exempt) return `✔ "${header}" is an auto-generated message — skipped commit-msg checks.`
	for (const warning of warnings) out.push(`⚠️  commit-msg: ${warning}`)
	if (errors.length > 0) {
		out.push("")
		out.push("✖ Commit message rejected by Conventional Commits check:")
		for (const error of errors) out.push(`   - ${error}`)
		out.push("")
		out.push("   Expected: <type>(<scope>): <summary>")
		out.push(`   Types:    ${CONVENTIONAL_TYPES.join(", ")}`)
		out.push("   Details:  CONTRIBUTING.md#commit-conventions")
		out.push("")
		out.push("   To bypass once: git commit --no-verify")
		return out.join("\n")
	}
	out.push("✔ Commit message follows Conventional Commits.")
	return out.join("\n")
}

function main() {
	const file = process.argv[2]
	if (!file) {
		console.error(
			"usage: node tools/git-hooks/validate-commit-msg.mjs <path-to-commit-message>",
		)
		process.exit(2)
	}

	let raw
	try {
		raw = readFileSync(file, "utf8")
	} catch (error) {
		console.error(`commit-msg: cannot read "${file}": ${error.message}`)
		process.exit(2)
	}

	const result = validateCommitMessage(raw)
	const header = splitMessage(raw)[0] ?? ""
	const isError = result.errors.length > 0
	const stream = isError ? console.error : console.log
	stream(formatResult(result, header))
	process.exit(isError ? 1 : 0)
}

const invokedDirectly =
	process.argv[1] !== undefined &&
	import.meta.url === pathToFileURL(process.argv[1]).href

if (invokedDirectly) main()
