import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import path from "node:path";
import fs from "node:fs";

export default function (pi: ExtensionAPI) {
	// Load all OCGS extension modules
	import("../ocgs-delegation/index.js")
		.then((m) => m.default(pi))
		.catch(() => {});
	import("../ocgs-question/index.js")
		.then((m) => m.default(pi))
		.catch(() => {});
	import("../ocgs-path-guard/index.js")
		.then((m) => m.default(pi))
		.catch(() => {});
	import("../ocgs-audit/index.js").then((m) => m.default(pi)).catch(() => {});
	import("../ocgs-drift-detector/index.js")
		.then((m) => m.default(pi))
		.catch(() => {});
	import("../ocgs-changelog/index.js")
		.then((m) => m.default(pi))
		.catch(() => {});
	import("../ocgs-validate/index.js")
		.then((m) => m.default(pi))
		.catch(() => {});

	// Also discover .agents/ content
	pi.on("resources_discover", async (_event, _ctx) => {
		if (!fs.existsSync(".agents")) return;

		return {
			skillPaths: fs.existsSync(path.join(".agents", "skills"))
				? [path.join(".agents", "skills")]
				: [],
			promptPaths: fs.existsSync(path.join(".agents", "commands"))
				? [path.join(".agents", "commands")]
				: [],
		};
	});
}
