#!/usr/bin/env node
/**
 * Detects and repairs inert `.opencode/{agents,commands,skills,rules}` entries.
 *
 * These paths are committed as git symlinks pointing at `../.agents/<name>`.
 * On Windows, `git checkout` materializes symlinks as real OS symlinks only
 * when `core.symlinks=true` is set (which itself requires Developer Mode or
 * admin rights). With the default `core.symlinks=false`, git instead writes
 * a small plain-text file containing the link target string — which silently
 * breaks OpenCode's `.opencode/`-based agent/skill/command/rule discovery.
 *
 * This script detects that broken state and repairs it by replacing the stub
 * file with a real directory symlink/junction pointing at the canonical
 * `.agents/<name>` directory.
 *
 * Usage: node tools/fix-opencode-symlinks.mjs [--dry-run]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const LINKS = ["agents", "commands", "skills", "rules"];
const STUB_RE = /^\.\.[\\/]\.agents[\\/][a-z-]+\s*$/i;

const dryRun = process.argv.includes("--dry-run");

function classify(linkPath) {
  if (!fs.existsSync(linkPath)) return "missing";
  const stat = fs.lstatSync(linkPath);
  if (stat.isSymbolicLink()) {
    try {
      const real = fs.realpathSync(linkPath);
      return fs.existsSync(real) && fs.statSync(real).isDirectory()
        ? "ok-symlink"
        : "broken-symlink";
    } catch {
      return "broken-symlink";
    }
  }
  if (stat.isDirectory()) return "ok-directory"; // e.g. a real materialized copy
  if (stat.isFile()) {
    const content = fs.readFileSync(linkPath, "utf8").trim();
    if (STUB_RE.test(content)) return "stub-file";
    return "unknown-file";
  }
  return "unknown";
}

function repair(name) {
  const linkPath = path.join(ROOT, ".opencode", name);
  const targetRel = path.join("..", ".agents", name);
  const targetAbs = path.join(ROOT, ".agents", name);

  if (!fs.existsSync(targetAbs) || !fs.statSync(targetAbs).isDirectory()) {
    console.error(`  ✗ ${name}: canonical source .agents/${name} does not exist — skipping`);
    return false;
  }

  if (dryRun) {
    console.log(`  → would replace .opencode/${name} with a symlink/junction to .agents/${name}`);
    return true;
  }

  fs.rmSync(linkPath, { force: true });
  try {
    // 'junction' works without elevated privileges on Windows; falls back
    // to a regular symlink type on POSIX (junction is ignored there).
    fs.symlinkSync(targetRel, linkPath, process.platform === "win32" ? "junction" : "dir");
  } catch (err) {
    // Junctions require an absolute target on Windows.
    if (process.platform === "win32") {
      fs.symlinkSync(targetAbs, linkPath, "junction");
    } else {
      throw err;
    }
  }
  console.log(`  ✓ ${name}: repaired -> .agents/${name}`);
  return true;
}

console.log("Checking .opencode/{agents,commands,skills,rules}...\n");

let anyBroken = false;
for (const name of LINKS) {
  const linkPath = path.join(ROOT, ".opencode", name);
  const state = classify(linkPath);
  if (state === "ok-symlink" || state === "ok-directory") {
    console.log(`  ✓ ${name}: OK (${state})`);
    continue;
  }
  anyBroken = true;
  console.log(`  ✗ ${name}: ${state} — this is broken, OpenCode cannot see .agents/${name}`);
  repair(name);
}

if (!anyBroken) {
  console.log("\nAll .opencode/* links are healthy. Nothing to do.");
  process.exit(0);
}

console.log(
  dryRun
    ? "\nDry run complete. Re-run without --dry-run to apply fixes."
    : "\nRepair complete. Re-run this script any time after a fresh clone/checkout."
);
console.log(
  "\nTip: to avoid this permanently, enable symlink support before cloning:\n" +
  "  git config --global core.symlinks true\n" +
  "  (Windows also requires Developer Mode or running git as Administrator)\n" +
  "then re-clone, or run `git checkout -- .opencode` after enabling it."
);
