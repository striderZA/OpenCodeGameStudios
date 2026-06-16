import { mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = join(__dirname, "..", ".opencode", "modules");
const SUBDIRS = ["agents", "skills", "commands", "rules"];

const MODULES = [
  { name: "core", extra: ["plugins", "docs"] },
  { name: "art", extra: ["mcp"] },
  { name: "design" },
  { name: "architecture" },
  { name: "stories" },
  { name: "programming" },
  { name: "ui" },
  { name: "audio" },
  { name: "narrative" },
  { name: "level-design" },
  { name: "qa" },
  { name: "release" },
  { name: "prototyping" },
  { name: "live-ops" },
  { name: "localization" },
  { name: "engine-godot" },
  { name: "engine-unity" },
  { name: "engine-unreal" },
  { name: "engine-sfml3" },
  { name: "engine-raylib" },
  { name: "engine-babylonjs" },
  { name: "data" },
];

for (const mod of MODULES) {
  const dirs = [...SUBDIRS, ...(mod.extra || [])];
  for (const sub of dirs) {
    mkdirSync(join(BASE, mod.name, sub), { recursive: true });
  }
  console.log("Created: " + mod.name);
}
console.log("Done.");
