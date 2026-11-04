#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, copyFileSync, unlinkSync, rmSync } from 'fs';
import { join, resolve, dirname, relative, sep, basename } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { parseModulefile } from '../../tools/lib/parse-modulefile.mjs';
import { HARNESS_IDS, HARNESS_TARGETS, parseHarnessArgs, resolveHarness } from '../../tools/lib/harness-targets.mjs';
import { loadMcpTarget } from '../../tools/lib/mcp-targets.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

// Harness target controls where module files are installed, where install state
// lives, and which file receives MCP fragments. See tools/lib/harness-targets.mjs.
let HARNESS = 'opencode';
let TARGET = HARNESS_TARGETS[HARNESS];
let MODULES_DIR = join(ROOT, TARGET.sourceRoot);
let INSTALLED_PATH = join(ROOT, TARGET.stateFile);

function setHarness(mode) {
  TARGET = resolveHarness(mode);
  HARNESS = TARGET.id;
  MODULES_DIR = join(ROOT, TARGET.sourceRoot);
  INSTALLED_PATH = join(ROOT, TARGET.stateFile);
}

// ── Logging ────────────────────────────────────────────────────────────────

const LOG_PREFIXES = { ADD: 'ADD', DEL: 'DEL', SKIP: 'SKIP', KEEP: 'KEEP', WARN: 'WARN', ERR: 'ERR', OK: 'OK', SAME: 'SAME', UPDATE: 'UPDATE' };

function log(prefix, msg) {
  const p = (LOG_PREFIXES[prefix] || prefix).padEnd(5);
  console.log(`  [${p}] ${msg}`);
}

function wrapWithHeader(label, fn) {
  console.log(`\n── ${label} ─${''.padEnd(Math.max(0, 60 - label.length), '─')}\n`);
  const result = fn();
  console.log(`\n${''.padEnd(64, '─')}\n`);
  return result;
}

function readModulefile(name) {
  const p = join(MODULES_DIR, name, 'modulefile.yaml');
  if (!existsSync(p)) return null;
  return parseModulefile(readFileSync(p, 'utf-8'));
}

// ── JSON file helpers ──────────────────────────────────────────────────────

function readJSON(p) {
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf-8')); }
  catch { return null; }
}

function readJSONStrict(p) {
  try { return JSON.parse(readFileSync(p, 'utf-8')); }
  catch (error) {
    throw new Error(`Invalid JSON in ${toForward(relative(ROOT, p))}: ${error.message}`);
  }
}

function writeJSON(p, data) {
  writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
}

function readInstalled() {
  return readJSON(INSTALLED_PATH) || {};
}

function writeInstalled(data) {
  const dir = dirname(INSTALLED_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeJSON(INSTALLED_PATH, data);
}

// ── Path helpers ───────────────────────────────────────────────────────────

function toForward(p) {
  return p.split(sep).join('/');
}

function installedRecordTarget(record) {
  if (typeof record !== 'string') return record.target;
  const [top, ...rest] = record.split('/');
  const base = TARGET.dirs[top];
  return base ? join(base, ...rest) : join(TARGET.contentRoot, record);
}

function installedRecordSource(record) {
  return typeof record === 'string' ? record : record.source;
}

// ── list command ───────────────────────────────────────────────────────────

function cmdList() {
  const dirs = readdirSync(MODULES_DIR).filter(d => {
    const p = join(MODULES_DIR, d);
    try { return statSync(p).isDirectory() && existsSync(join(p, 'modulefile.yaml')); }
    catch { return false; }
  }).sort();

  const installed = readInstalled();

  const rows = [];
  for (const name of dirs) {
    const mf = readModulefile(name);
    const version = mf ? (mf.version || '?') : '?';
    const entry = installed[name];
    const status = entry ? (entry.status || 'unknown') : 'uninstalled';
    rows.push({ name, version, status });
  }

  console.log(`  Harness: ${TARGET.label}  (${TARGET.sourceRoot} → ${TARGET.stateFile})`);

  const nameW = Math.max(...rows.map(r => r.name.length), 6);
  const verW = Math.max(...rows.map(r => r.version.length), 7);
  const sepLine = ''.padEnd(nameW + verW + 10, '─');

  console.log(`  ${'MODULE'.padEnd(nameW)}  ${'VERSION'.padEnd(verW)}  STATUS`);
  console.log(`  ${sepLine}`);
  for (const r of rows) {
    console.log(`  ${r.name.padEnd(nameW)}  ${r.version.padEnd(verW)}  ${r.status}`);
  }
}

// ── info command ───────────────────────────────────────────────────────────

function cmdInfo(name) {
  const p = join(MODULES_DIR, name, 'modulefile.yaml');
  if (!existsSync(p)) {
    console.error(`Module '${name}' not found at ${toForward(relative(ROOT, p))}`);
    process.exit(1);
  }
  const content = readFileSync(p, 'utf-8');
  console.log(content.trimEnd());
}

// ── add command ────────────────────────────────────────────────────────────

function cmdAdd(args) {
  const force = args.includes('--force');
  const names = args.filter(a => a !== '--force');
  const installed = readInstalled();
  const summary = { added: 0, skipped: 0, mcpAdded: 0, mcpSkipped: 0, errors: 0 };
  const processedNames = [];

  for (const rawName of names) {
    const name = rawName.toLowerCase();

    wrapWithHeader(`Installing module: ${name} (${TARGET.label})`, () => {
      try {
        if (installOne(name, names, force, installed, summary)) processedNames.push(name);
      } catch (error) {
        log('ERR', error.message);
        summary.errors++;
      }
    });
  }

  // Post-install validation
  if (processedNames.length > 0) {
    runValidation();
  }

  // Summary
  console.log('');
  console.log(`  Harness: ${TARGET.label}`);
  console.log(`  Added: ${summary.added}, Skipped: ${summary.skipped}, Errors: ${summary.errors}`);
  console.log(`  MCP merged: ${summary.mcpAdded}, MCP skipped: ${summary.mcpSkipped}`);
}

function installOne(name, names, force, installed, summary) {
  const mf = readModulefile(name);
  if (!mf) {
    log('ERR', `Module '${name}' not found (no modulefile.yaml)`);
    summary.errors++;
    return false;
  }

  if (installed[name] && installed[name].status === 'installed' && !force) {
    log('SKIP', `Module '${name}' is already installed`);
    summary.skipped++;
    return false;
  }

  // Check dependencies (future-proofing)
  if (mf.depends && mf.depends.length > 0) {
    for (const dep of mf.depends) {
      const depName = dep.split('>=')[0].split('=')[0].trim();
      const depInstalled = installed[depName] && installed[depName].status === 'installed';
      const beingInstalled = names.includes(depName);
      if (!depInstalled && !beingInstalled) {
        if (depName === name) continue;
        log('WARN', `Dependency '${dep}' is not installed — installing anyway`);
      }
    }
  }

  const moduleDir = join(MODULES_DIR, name);

  // Validate the MCP fragment before copying anything, so a malformed
  // fragment cannot leave an untracked partial install.
  const fragmentPath = findMcpFragment(moduleDir);
  const fragment = fragmentPath ? readJSONStrict(fragmentPath) : null;
  if (fragment && (typeof fragment !== 'object' || Array.isArray(fragment))) {
    throw new Error(`MCP fragment ${toForward(relative(ROOT, fragmentPath))} must be a JSON object of server entries`);
  }

  // Copy files from module subdirectories that this harness can consume.
  const addedFiles = [];

  for (const entry of readdirSync(moduleDir)) {
    if (entry === 'modulefile.yaml' || entry === 'mcp') continue;

    const entryPath = join(moduleDir, entry);
    if (!statSync(entryPath).isDirectory()) continue;

    const destination = TARGET.dirs[entry];
    if (!destination) {
      log('SKIP', `'${entry}' has no ${TARGET.label} target — skipped`);
      continue;
    }

    walkAndCopy(
      entryPath,
      join(ROOT, destination),
      moduleDir,
      addedFiles,
      force,
      TARGET.transforms[entry],
    );
  }

  // Merge MCP fragments authored for this harness.
  const mcpServers = mergeMcpFragments(fragment, summary);

  // Record in installed.json
  const timestamp = new Date().toISOString();
  const record = {
    version: mf.version || '0.1.0',
    status: 'installed',
    timestamp,
    files: addedFiles,
    mcpByHarness: { ...(installed[name]?.mcpByHarness || {}), [HARNESS]: mcpServers },
  };
  if (HARNESS === 'opencode') record.mcp = mcpServers;

  installed[name] = record;
  writeInstalled(installed);

  summary.added++;
  log('OK', `Module '${name}' v${record.version} installed (${addedFiles.length} files, ${mcpServers.length} MCP servers)`);
  return true;
}

function walkAndCopy(srcDir, destDir, moduleDir, fileList, force = false, spec = null) {
  if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });

  const entries = readdirSync(srcDir);
  for (const entry of entries) {
    const srcPath = join(srcDir, entry);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      walkAndCopy(srcPath, join(destDir, entry), moduleDir, fileList, force, spec);
      continue;
    }

    const source = toForward(relative(moduleDir, srcPath));
    const outputName = spec?.extension
      ? entry.replace(/\.[^.]+$/, spec.extension)
      : entry;
    const destPath = join(destDir, outputName);
    const target = toForward(relative(ROOT, destPath));

    let output = null;
    if (spec?.transform) {
      output = spec.transform(readFileSync(srcPath, 'utf-8'), entry);
      if (output === null) {
        log('SKIP', `${source} — not applicable to ${TARGET.label}`);
        continue;
      }
    }

    if (existsSync(destPath)) {
      const same = output !== null
        ? readFileSync(destPath, 'utf-8') === output
        : filesMatch(srcPath, destPath);

      if (!force) {
        log('SKIP', `${source} → ${target}`);
        continue;
      }

      if (same) {
        log('SAME', source);
      } else if (output !== null) {
        writeFileSync(destPath, output);
        log('UPDATE', `${source} → ${target}`);
      } else {
        copyFileSync(srcPath, destPath);
        log('UPDATE', `${source} → ${target}`);
      }
      fileList.push({ source, target });
    } else {
      if (output !== null) {
        writeFileSync(destPath, output);
      } else {
        copyFileSync(srcPath, destPath);
      }
      log('ADD', `${source} → ${target}`);
      fileList.push({ source, target });
    }
  }
}

function filesMatch(a, b) {
  return Buffer.compare(readFileSync(a), readFileSync(b)) === 0;
}

function findMcpFragment(moduleDir) {
  const mcpDir = join(moduleDir, 'mcp');
  if (!existsSync(mcpDir) || !statSync(mcpDir).isDirectory()) return null;

  const perHarness = join(mcpDir, `${HARNESS}.json`);
  if (existsSync(perHarness)) return perHarness;

  // Legacy fragments (`mcp/<server>.json`) were OpenCode-only.
  if (HARNESS === 'opencode') {
    const legacy = readdirSync(mcpDir)
      .filter(file => file.endsWith('.json') && file !== 'opencode.json')
      .map(file => join(mcpDir, file));
    if (legacy.length === 1) {
      log('WARN', `Using legacy MCP fragment '${toForward(relative(ROOT, legacy[0]))}' for OpenCode`);
      return legacy[0];
    }
    if (legacy.length > 1) {
      log('WARN', `Multiple legacy MCP fragments in ${toForward(relative(ROOT, mcpDir))} — none used`);
    }
  }

  return null;
}

function mergeMcpFragments(fragment, summary) {
  if (!fragment) return [];

  const targetPath = join(ROOT, TARGET.mcp.file);
  const config = loadMcpTarget(TARGET.mcp.kind, targetPath);
  const merged = [];

  for (const [serverName, entry] of Object.entries(fragment)) {
    if (config.has(serverName)) {
      log('WARN', `MCP server '${serverName}' already exists in ${TARGET.mcp.file} — skipped`);
      summary.mcpSkipped++;
      continue;
    }
    config.merge(serverName, entry);
    log('ADD', `MCP server '${serverName}' → ${TARGET.mcp.file}`);
    merged.push(serverName);
    summary.mcpAdded++;
  }

  if (merged.length > 0) config.save();
  return merged;
}

// ── remove command ─────────────────────────────────────────────────────────

function cmdRemove(name) {
  name = name.toLowerCase();

  if (name === 'core') {
    console.error("Cannot remove 'core' module — it is required by the framework.");
    process.exit(1);
  }

  const installed = readInstalled();
  if (!installed[name]) {
    console.error(`Module '${name}' is not in ${TARGET.stateFile}. Nothing to remove.`);
    process.exit(1);
  }

  // Check reverse dependencies
  const revDeps = [];
  for (const [modName, modEntry] of Object.entries(installed)) {
    if (modEntry.status !== 'installed' || modName === name) continue;
    const mf = readModulefile(modName);
    if (mf && mf.depends) {
      for (const dep of mf.depends) {
        const depName = dep.split('>=')[0].split('=')[0].trim();
        if (depName === name) revDeps.push(modName);
      }
    }
  }
  if (revDeps.length > 0) {
    console.error(`Cannot remove '${name}' — the following installed modules depend on it: ${revDeps.join(', ')}`);
    process.exit(1);
  }

  wrapWithHeader(`Removing module: ${name} (${TARGET.label})`, () => {
    try {
      removeOne(name, installed);
    } catch (error) {
      console.error(`  [ERR] ${error.message}`);
    }
  });

  runValidation();
}

function removeOne(name, installed) {
  const entry = installed[name];
  const files = entry.files || [];
  const mcpServers = entry.mcpByHarness?.[HARNESS]
    ?? (HARNESS === 'opencode' ? entry.mcp || [] : []);
  const moduleDir = join(MODULES_DIR, name);

  // Parse the MCP config before deleting anything, so a malformed config
  // aborts the removal instead of leaving tracked files deleted.
  const mcpConfig = mcpServers.length > 0
    ? loadMcpTarget(TARGET.mcp.kind, join(ROOT, TARGET.mcp.file))
    : null;

  let delCount = 0, keepCount = 0;

  // Remove tracked files
  for (const record of files) {
    const target = installedRecordTarget(record);
    const source = installedRecordSource(record);
    const installedPath = join(ROOT, target);
    const sourcePath = join(moduleDir, source);

    if (!existsSync(installedPath)) {
      log('SKIP', `${target} — not found on disk`);
      continue;
    }

    if (existsSync(sourcePath)) {
      const top = source.split('/')[0];
      const spec = TARGET.transforms[top];
      const sourceContent = readFileSync(sourcePath, 'utf-8');
      const expected = spec?.transform
        ? spec.transform(sourceContent, basename(sourcePath))
        : null;
      const unchanged = expected !== null
        ? readFileSync(installedPath, 'utf-8') === expected
        : Buffer.compare(readFileSync(installedPath), readFileSync(sourcePath)) === 0;

      if (unchanged) {
        unlinkSync(installedPath);
        log('DEL', target);
        delCount++;
      } else {
        log('KEEP', `${target} — modified by user`);
        keepCount++;
      }
    } else {
      log('KEEP', `${target} — source not found, keeping`);
      keepCount++;
    }
  }

  // Clean up empty parent directories
  const parentDirs = new Set();
  for (const record of files) {
    const target = join(ROOT, installedRecordTarget(record));
    let dir = dirname(target);
    while (dir.startsWith(ROOT) && dir !== ROOT) {
      parentDirs.add(dir);
      dir = dirname(dir);
    }
  }
  const sortedDirs = [...parentDirs].sort((a, b) => b.length - a.length);
  for (const dir of sortedDirs) {
    if (!existsSync(dir)) continue;
    try {
      const remaining = readdirSync(dir);
      if (remaining.length === 0) rmSync(dir, { force: true });
    } catch { /* skip */ }
  }

  // Remove MCP servers from this harness's config
  let mcpRemoved = 0;
  if (mcpConfig) {
    for (const serverName of mcpServers) {
      if (!mcpConfig.has(serverName)) continue;
      mcpConfig.remove(serverName);
      log('DEL', `MCP server '${serverName}' from ${TARGET.mcp.file}`);
      mcpRemoved++;
    }
    mcpConfig.save();
  }

  delete installed[name];
  writeInstalled(installed);
  log('OK', `Module '${name}' removed from ${TARGET.stateFile}`);

  console.log(`\n  Removed: ${delCount} files, Kept: ${keepCount} files, MCP removed: ${mcpRemoved}`);
}

// ── Validation ─────────────────────────────────────────────────────────────

function runValidation() {
  const validatePath = join(ROOT, 'tests', 'agents', 'validate.mjs');
  if (!existsSync(validatePath)) {
    log('SKIP', 'Post-install validation: no validate.mjs found');
    return;
  }
  log('OK', 'Running post-install validation...');
  const result = spawnSync('node', [validatePath], { cwd: ROOT, stdio: 'inherit' });
  if (result.status !== 0) {
    log('WARN', `Validation exited with code ${result.status} — fix issues if needed`);
  } else {
    log('OK', 'Validation passed');
  }
}

// ── Main dispatch ──────────────────────────────────────────────────────────

function main() {
  let args;
  try {
    const parsed = parseHarnessArgs(process.argv.slice(2));
    setHarness(parsed.harness);
    args = parsed.rest;
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  if (args.length === 0) {
    const scriptPath = '.opencode/modules/install.mjs';
    console.log('Usage:');
    console.log(`  node ${scriptPath} list [--harness <id>]`);
    console.log(`  node ${scriptPath} info <name> [--harness <id>]`);
    console.log(`  node ${scriptPath} add <name...> [--harness <id>] [--force]`);
    console.log(`  node ${scriptPath} remove <name> [--harness <id>]`);
    console.log('');
    console.log('Options:');
    console.log(`  --harness <id>   Target harness: ${HARNESS_IDS.join(', ')} (default: opencode)`);
    console.log('  --pi             Shorthand for --harness pi');
    console.log('  --omp            Shorthand for --harness omp');
    console.log('  --claude         Shorthand for --harness claude');
    console.log('  --codex          Shorthand for --harness codex');
    console.log('  --force          Overwrite existing files and refresh the install record');
    process.exit(0);
  }

  const cmd = args[0];
  switch (cmd) {
    case 'list':
      cmdList();
      break;
    case 'info':
      if (!args[1]) { console.error('Usage: info <name>'); process.exit(1); }
      cmdInfo(args[1]);
      break;
    case 'add':
      if (args.length < 2) { console.error('Usage: add <name...>'); process.exit(1); }
      cmdAdd(args.slice(1));
      break;
    case 'remove':
      if (!args[1]) { console.error('Usage: remove <name>'); process.exit(1); }
      cmdRemove(args[1]);
      break;
    default:
      console.error(`Unknown command: ${cmd}`);
      console.log('Available: list, info, add, remove');
      process.exit(1);
  }
}

main();
