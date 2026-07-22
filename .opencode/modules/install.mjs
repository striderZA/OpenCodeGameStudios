#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, copyFileSync, unlinkSync, rmSync } from 'fs';
import { join, resolve, dirname, relative, sep } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { parseModulefile, parseFlowList } from '../../tools/lib/parse-modulefile.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

// Harness target: 'opencode' (default) or 'pi' (--pi flag)
// Controls where module files are installed and where installed.json lives.
let HARNESS = 'opencode';
let MODULES_DIR = join(ROOT, '.opencode', 'modules');
let INSTALLED_PATH = join(MODULES_DIR, 'installed.json');
let HARNESS_TARGET = '.opencode';
const OPENCODE_JSON = join(ROOT, 'opencode.json');

function setHarness(mode) {
  HARNESS = mode;
  if (mode === 'pi') {
    MODULES_DIR = join(ROOT, '.agents', 'modules');
    HARNESS_TARGET = '.agents';
  } else {
    MODULES_DIR = join(ROOT, '.opencode', 'modules');
    HARNESS_TARGET = '.opencode';
  }
  INSTALLED_PATH = join(MODULES_DIR, 'installed.json');
}

// ── Logging ────────────────────────────────────────────────────────────────

const LOG_PREFIXES = { ADD: 'ADD', DEL: 'DEL', SKIP: 'SKIP', KEEP: 'KEEP', WARN: 'WARN', ERR: 'ERR', OK: 'OK', SAME: 'SAME', UPDATE: 'UPDATE' };

function log(prefix, msg) {
  const p = (LOG_PREFIXES[prefix] || prefix).padEnd(5);
  console.log(`  [${p}] ${msg}`);
}

function wrapWithHeader(label, fn) {
  console.log(`\n── ${label} ─${''.padEnd(60 - label.length, '─')}\n`);
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

const INSTALL_SUBDIRS = ['agents', 'skills', 'commands', 'rules', 'plugins', 'docs'];
const SKIP_DIRS = new Set(['mcp']);

function cmdAdd(args) {
  const force = args.includes('--force');
  const names = args.filter(a => a !== '--force');
  const installed = readInstalled();
  const summary = { added: 0, skipped: 0, mcpAdded: 0, mcpSkipped: 0, errors: 0 };
  const processedNames = [];

  for (const rawName of names) {
    const name = rawName.toLowerCase();

    wrapWithHeader(`Installing module: ${name}`, () => {
      const mf = readModulefile(name);
      if (!mf) {
        log('ERR', `Module '${name}' not found (no modulefile.yaml)`);
        summary.errors++;
        return;
      }

      if (installed[name] && installed[name].status === 'installed' && !force) {
        log('SKIP', `Module '${name}' is already installed`);
        summary.skipped++;
        return;
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

      // Copy files from module subdirectories
      const moduleDir = join(MODULES_DIR, name);
      const entries = readdirSync(moduleDir);
      const addedFiles = [];

      for (const entry of entries) {
        if (entry === 'modulefile.yaml') continue;
        if (SKIP_DIRS.has(entry)) continue;

        const entryPath = join(moduleDir, entry);
        if (!statSync(entryPath).isDirectory()) continue;
        if (!INSTALL_SUBDIRS.includes(entry)) {
          log('SKIP', `Unknown subdirectory '${entry}' — skipped`);
          continue;
        }

        walkAndCopy(entryPath, join(ROOT, HARNESS_TARGET, entry), addedFiles, force);
      }

      // Handle MCP fragments
      const mcpDir = join(moduleDir, 'mcp');
      const mcpServers = [];
      if (existsSync(mcpDir) && statSync(mcpDir).isDirectory()) {
        const mcpFiles = readdirSync(mcpDir).filter(f => f.endsWith('.json'));
        for (const mcpFile of mcpFiles) {
          const mcpPath = join(mcpDir, mcpFile);
          const fragment = readJSON(mcpPath);
          if (!fragment) {
            log('WARN', `MCP fragment '${mcpFile}' is not valid JSON — skipped`);
            continue;
          }
          // MCP fragments are only merged into opencode.json (OpenCode harness).
          // Pi harness manages MCP separately — skip with a warning.
          if (HARNESS === 'pi') {
            log('WARN', `MCP fragment '${mcpFile}' — Pi harness does not merge MCP via installer (skipped)`);
            summary.mcpSkipped++;
            continue;
          }
          const ocfg = readJSON(OPENCODE_JSON) || {};
          if (!ocfg.mcp) ocfg.mcp = {};
          let merged = false;
          for (const serverName of Object.keys(fragment)) {
            if (ocfg.mcp[serverName]) {
              log('WARN', `MCP server '${serverName}' already exists in opencode.json — skipped`);
              summary.mcpSkipped++;
            } else {
              ocfg.mcp[serverName] = fragment[serverName];
              log('ADD', `MCP server '${serverName}' merged into opencode.json`);
              mcpServers.push(serverName);
              summary.mcpAdded++;
              merged = true;
            }
          }
          if (merged) writeJSON(OPENCODE_JSON, ocfg);
        }
      }

      // Record in installed.json
      const timestamp = new Date().toISOString();
      installed[name] = {
        version: mf.version || '0.1.0',
        status: 'installed',
        timestamp,
        files: addedFiles,
        mcp: mcpServers,
      };
      writeInstalled(installed);
      processedNames.push(name);

      summary.added++;

      log('OK', `Module '${name}' v${installed[name].version} installed (${addedFiles.length} files, ${mcpServers.length} MCP servers)`);
    });
  }

  // Post-install validation
  if (processedNames.length > 0) {
    runValidation();
  }

  // Summary
  console.log('');
  console.log(`  Added: ${summary.added}, Skipped: ${summary.skipped}, Errors: ${summary.errors}`);
  console.log(`  MCP merged: ${summary.mcpAdded}, MCP skipped: ${summary.mcpSkipped}`);
}

function walkAndCopy(srcDir, destDir, fileList, force = false) {
  const entries = readdirSync(srcDir);
  for (const entry of entries) {
    const srcPath = join(srcDir, entry);
    const destPath = join(destDir, entry);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      if (!existsSync(destPath)) mkdirSync(destPath, { recursive: true });
      walkAndCopy(srcPath, destPath, fileList, force);
    } else {
      if (existsSync(destPath)) {
        if (force) {
          if (filesMatch(srcPath, destPath)) {
            log('SAME', `${toForward(relative(MODULES_DIR, srcPath))}`);
          } else {
            copyFileSync(srcPath, destPath);
            log('UPDATE', `${toForward(relative(MODULES_DIR, srcPath))} → ${toForward(relative(ROOT, destPath))}`);
          }
          fileList.push(toForward(relative(join(ROOT, HARNESS_TARGET), destPath)));
        } else {
          log('SKIP', `${toForward(relative(MODULES_DIR, srcPath))} → ${toForward(relative(ROOT, destPath))}`);
        }
      } else {
        copyFileSync(srcPath, destPath);
        log('ADD', `${toForward(relative(MODULES_DIR, srcPath))} → ${toForward(relative(ROOT, destPath))}`);
        fileList.push(toForward(relative(join(ROOT, HARNESS_TARGET), destPath)));
      }
    }
  }
}

function filesMatch(a, b) {
  return Buffer.compare(readFileSync(a), readFileSync(b)) === 0;
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
    console.error(`Module '${name}' is not in installed.json. Nothing to remove.`);
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

  wrapWithHeader(`Removing module: ${name}`, () => {
    const entry = installed[name];
    const files = entry.files || [];
    const mcpServers = entry.mcp || [];

    let delCount = 0, keepCount = 0;

    // Remove tracked files
    for (const f of files) {
      const installedPath = join(ROOT, HARNESS_TARGET, f);
      const sourcePath = join(MODULES_DIR, name, f);

      if (!existsSync(installedPath)) {
        log('SKIP', `${f} — not found on disk`);
        continue;
      }

      if (existsSync(sourcePath)) {
        const installedContent = readFileSync(installedPath);
        const sourceContent = readFileSync(sourcePath);
        if (Buffer.compare(installedContent, sourceContent) === 0) {
          unlinkSync(installedPath);
          log('DEL', f);
          delCount++;
        } else {
          log('KEEP', `${f} — modified by user`);
          keepCount++;
        }
      } else {
        log('KEEP', `${f} — source not found, keeping`);
        keepCount++;
      }
    }

    // Clean up empty parent directories
    const parentDirs = new Set();
    for (const f of files) {
      let dir = dirname(join(ROOT, HARNESS_TARGET, f));
      while (dir.startsWith(join(ROOT, HARNESS_TARGET))) {
        parentDirs.add(dir);
        dir = dirname(dir);
      }
    }
    const sortedDirs = [...parentDirs].sort((a, b) => b.length - a.length);
    for (const d of sortedDirs) {
      if (!existsSync(d)) continue;
      try {
        const remaining = readdirSync(d);
        if (remaining.length === 0) {
          rmSync(d, { force: true });
        }
      } catch { /* skip */ }
    }

    // Remove MCP servers from opencode.json (OpenCode-only)
    if (mcpServers.length > 0 && HARNESS !== 'pi') {
      const ocfg = readJSON(OPENCODE_JSON);
      if (ocfg && ocfg.mcp) {
        for (const serverName of mcpServers) {
          if (ocfg.mcp[serverName]) {
            delete ocfg.mcp[serverName];
            log('DEL', `MCP server '${serverName}' from opencode.json`);
          }
        }
        // Clean up empty mcp section
        if (Object.keys(ocfg.mcp).length === 0) delete ocfg.mcp;
        writeJSON(OPENCODE_JSON, ocfg);
      }
    }

    // Remove from installed.json
    delete installed[name];
    writeInstalled(installed);
    log('OK', `Module '${name}' removed from installed.json`);

    console.log(`\n  Removed: ${delCount} files, Kept: ${keepCount} files, MCP removed: ${mcpServers.length}`);
  });

  // Post-remove validation
  runValidation();
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
  const args = process.argv.slice(2);

  // Parse --pi flag (can appear anywhere in args)
  const piIndex = args.indexOf('--pi');
  if (piIndex !== -1) {
    setHarness('pi');
    args.splice(piIndex, 1);
  }

  if (args.length === 0) {
    const scriptPath = HARNESS === 'pi' ? '.agents/modules/install.mjs' : '.opencode/modules/install.mjs';
    console.log('Usage:');
    console.log(`  node ${scriptPath} list [--pi]`);
    console.log(`  node ${scriptPath} info <name> [--pi]`);
    console.log(`  node ${scriptPath} add <name...> [--pi]`);
    console.log(`  node ${scriptPath} remove <name> [--pi]`);
    console.log('');
    console.log('Options:');
    console.log('  --pi    Install to .agents/ instead of .opencode/ (Pi harness)');
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
