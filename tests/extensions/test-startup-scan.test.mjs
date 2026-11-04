import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createFakeExtensionApi } from "./support/fake-extension-api.mjs";

const repoRoot = process.cwd();
const validateModule = path.join(repoRoot, ".pi", "extensions", "ocgs-validate", "index.ts");
const driftModule = path.join(repoRoot, ".pi", "extensions", "ocgs-drift-detector", "index.ts");

// Malformed on purpose: no frontmatter, so validate reports it and drift finds no name/description.
const BAD_SKILL = "# Bad skill with no frontmatter\n\nBody.\n";

let fixtureDir;
let makeValidate;
let makeDrift;

before(async () => {
	fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "ocgs-startup-"));
	fs.mkdirSync(path.join(fixtureDir, ".agents", "skills", "bad"), { recursive: true });
	fs.writeFileSync(path.join(fixtureDir, ".agents", "skills", "bad", "SKILL.md"), BAD_SKILL);
	// Both modules compute their .agents directory from process.cwd() at import time.
	process.chdir(fixtureDir);
	makeValidate = (await import(pathToFileURL(validateModule).href)).default;
	makeDrift = (await import(pathToFileURL(driftModule).href)).default;
});

after(() => {
	process.chdir(repoRoot);
	// Windows can hold the fixture briefly after the cases finish; retry rather than fail teardown.
	fs.rmSync(fixtureDir, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
});

function recordingUi() {
	const calls = { notify: [], setStatus: [] };
	return {
		calls,
		ctx: {
			hasUI: true,
			cwd: fixtureDir,
			ui: {
				notify: (...args) => calls.notify.push(args),
				setStatus: (...args) => calls.setStatus.push(args),
			},
		},
	};
}

const startupDiscover = { type: "resources_discover", reason: "startup" };
// omp's session_start carries no reason field; Pi's carries one. The scans must not depend on it.
const sessionStart = { type: "session_start" };
const reportPath = () => path.join(fixtureDir, "production", "session-logs", "ocgs-validation-report.md");

describe("startup scans run once per session on omp and Pi", () => {
	it("validate writes its report on session_start, which omp emits", async () => {
		const pi = createFakeExtensionApi();
		makeValidate(pi);
		const { ctx } = recordingUi();
		await pi.emit("session_start", sessionStart, ctx);
		assert.ok(fs.existsSync(reportPath()), "session_start produced no validation report");
		assert.match(fs.readFileSync(reportPath(), "utf8"), /Missing YAML frontmatter/);
	});

	it("validate notifies once from session_start and not again when startup resources_discover follows", async () => {
		const pi = createFakeExtensionApi();
		makeValidate(pi);
		const { calls, ctx } = recordingUi();
		await pi.emit("session_start", sessionStart, ctx);
		assert.strictEqual(calls.notify.length, 1, "session_start did not notify");
		await pi.emit("resources_discover", startupDiscover, ctx);
		assert.strictEqual(calls.notify.length, 1, "startup resources_discover re-notified the same session");
	});

	it("validate still reports from startup resources_discover alone (Pi path)", async () => {
		fs.rmSync(reportPath(), { force: true });
		const pi = createFakeExtensionApi();
		makeValidate(pi);
		const { ctx } = recordingUi();
		await pi.emit("resources_discover", startupDiscover, ctx);
		assert.ok(fs.existsSync(reportPath()), "startup resources_discover produced no validation report");
	});

	it("drift counts the bad skill when only startup resources_discover fires (Pi path)", async () => {
		const pi = createFakeExtensionApi();
		makeDrift(pi);
		const { calls, ctx } = recordingUi();
		await pi.emit("resources_discover", startupDiscover, ctx);
		assert.deepStrictEqual(calls.setStatus, [["ocgs-drift", "drift: 1 files"]]);
	});

	it("drift reports exactly once when both session_start and startup resources_discover fire", async () => {
		const pi = createFakeExtensionApi();
		makeDrift(pi);
		const { calls, ctx } = recordingUi();
		await pi.emit("session_start", sessionStart, ctx);
		await pi.emit("resources_discover", startupDiscover, ctx);
		assert.deepStrictEqual(calls.setStatus, [["ocgs-drift", "drift: 1 files"]]);
	});
});
