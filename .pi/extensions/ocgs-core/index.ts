import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import path from "node:path";
import fs from "node:fs";

export default function (pi: ExtensionAPI) {
	// OCGS extensions are auto-discovered by Pi from .pi/extensions/*/index.ts
	// This barrel only handles .agents/ content discovery for Pi's resource system
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
