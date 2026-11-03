#!/usr/bin/env node

/**
 * Install or remove the repository git hooks.
 *
 *   node tools/git-hooks/install.mjs              # install (sets core.hooksPath=.githooks)
 *   node tools/git-hooks/install.mjs --uninstall  # remove the core.hooksPath override
 *
 * Runs automatically on `npm install` through the `prepare` script. Outside a git
 * work tree (e.g. a packaged tarball) it prints a notice and exits 0.
 */

import { execFileSync } from "node:child_process"
import { chmodSync, existsSync } from "node:fs"
import { join } from "node:path"

const HOOKS_PATH = ".githooks"
const HOOK_FILES = ["commit-msg", "pre-commit"]

function git(root, args, options = {}) {
	return execFileSync("git", args, {
		cwd: root,
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
		...options,
	})
}

function main() {
	const uninstall = process.argv.includes("--uninstall")

	let root
	try {
		root = git(process.cwd(), ["rev-parse", "--show-toplevel"]).trim()
	} catch {
		// Not a git checkout — nothing to install.
		process.exit(0)
	}

	if (uninstall) {
		try {
			git(root, ["config", "--unset", "core.hooksPath"])
			console.log("✔ Removed core.hooksPath override; git uses .git/hooks again.")
		} catch {
			console.log("ℹ No core.hooksPath override to remove.")
		}
		process.exit(0)
	}

	const hooksDir = join(root, HOOKS_PATH)
	if (!existsSync(hooksDir)) {
		console.error(`✖ ${HOOKS_PATH}/ is missing; cannot install hooks.`)
		process.exit(1)
	}

	git(root, ["config", "core.hooksPath", HOOKS_PATH])

	for (const hook of HOOK_FILES) {
		const path = join(hooksDir, hook)
		if (!existsSync(path)) continue

		// POSIX permission bit (no-op on Windows, where git executes via sh).
		try {
			chmodSync(path, 0o755)
		} catch {
			// Best effort.
		}

		// Keep the executable bit in the index so Linux/macOS clones get runnable hooks.
		try {
			git(root, ["ls-files", "--error-unmatch", `${HOOKS_PATH}/${hook}`])
			git(root, ["update-index", "--chmod=+x", `${HOOKS_PATH}/${hook}`])
		} catch {
			// Untracked hook (local experiment) — nothing to record.
		}
	}

	console.log(`✔ Git hooks installed from ${HOOKS_PATH}/ (core.hooksPath=${HOOKS_PATH}).`)
	console.log("  commit-msg  enforces Conventional Commits")
	console.log("  pre-commit  scans for secrets/conflict markers and runs framework gates")
	console.log("  Bypass once with: git commit --no-verify")
}

main()
