import { describe, it } from "node:test";
import assert from "node:assert";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const probe = spawnSync("omp", ["--version"], { encoding: "utf8" });
const ompAvailable = probe.error?.code !== "ENOENT" && probe.status === 0;

const EXPECTED_EXTENSIONS = [
	"./.pi/extensions/ocgs-audit",
	"./.pi/extensions/ocgs-changelog",
	"./.pi/extensions/ocgs-drift-detector",
	"./.pi/extensions/ocgs-hooks",
	"./.pi/extensions/ocgs-path-guard",
	"./.pi/extensions/ocgs-question",
	"./.pi/extensions/ocgs-tool-map",
	"./.pi/extensions/ocgs-validate",
];

// --profile isolates global config so the user's own settings cannot satisfy these assertions.
function ompJson(args) {
	const result = spawnSync("omp", ["--profile", "ocgs-verify", ...args, "--json"], {
		encoding: "utf8",
		cwd: root,
	});
	assert.strictEqual(result.status, 0, `omp ${args.join(" ")} failed: ${result.stderr}`);
	return JSON.parse(result.stdout);
}

describe("omp project config wiring", { skip: ompAvailable ? false : "omp is not installed" }, () => {
	it("effective extensions are exactly the eight Pi extensions (no core, no delegation)", () => {
		const effective = ompJson(["config", "get", "extensions"]);
		assert.deepStrictEqual(effective.value, EXPECTED_EXTENSIONS);
	});

	it("every configured extension path exists on disk", () => {
		for (const entry of EXPECTED_EXTENSIONS) {
			assert.ok(fs.existsSync(path.join(root, entry)), `missing extension path: ${entry}`);
		}
	});

	it("the project layer itself enables skill commands", () => {
		const projectLayer = ompJson(["config", "list", "--scope=project"]);
		const entry = projectLayer["skills.enableSkillCommands"];
		assert.ok(entry, "project .omp/config.yml does not set skills.enableSkillCommands");
		assert.strictEqual(entry.value, true);
	});
});
