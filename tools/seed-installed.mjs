#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, resolve, dirname, sep } from 'path';
import { fileURLToPath } from 'url';
import { parseModulefile } from './lib/parse-modulefile.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const MODULES_DIR = join(ROOT, '.opencode', 'modules');
const INSTALLED_PATH = join(MODULES_DIR, 'installed.json');

const INSTALL_SUBDIRS = ['agents', 'skills', 'commands', 'rules', 'plugins', 'docs'];
const SKIP_DIRS = new Set(['mcp']);

function walkModuleFiles(modDir, moduleName) {
  const files = [];
  const entries = readdirSync(modDir);
  for (const entry of entries) {
    if (entry === 'modulefile.yaml') continue;
    if (SKIP_DIRS.has(entry)) continue;
    const entryPath = join(modDir, entry);
    if (!statSync(entryPath).isDirectory()) continue;
    if (!INSTALL_SUBDIRS.includes(entry)) continue;
    collectFiles(entryPath, join('.opencode', entry), files);
  }
  return files;
}

function collectFiles(srcDir, relPrefix, fileList) {
  const entries = readdirSync(srcDir);
  for (const entry of entries) {
    const srcPath = join(srcDir, entry);
    if (statSync(srcPath).isDirectory()) {
      collectFiles(srcPath, join(relPrefix, entry), fileList);
    } else {
      fileList.push(toForward(join(relPrefix, entry)));
    }
  }
}

function toForward(p) {
  return p.split(sep).join('/');
}

// Discover all modules
const moduleDirs = readdirSync(MODULES_DIR).filter(d => {
  const p = join(MODULES_DIR, d);
  try { return statSync(p).isDirectory() && existsSync(join(p, 'modulefile.yaml')); }
  catch { return false; }
}).sort();

// Build installed.json with populated file lists
const installed = {};
for (const name of moduleDirs) {
  const mf = parseModulefile(readFileSync(join(MODULES_DIR, name, 'modulefile.yaml'), 'utf-8'));
  const modDir = join(MODULES_DIR, name);
  const files = walkModuleFiles(modDir, name);
  installed[name] = {
    version: mf.version || '0.1.0',
    status: 'installed',
    timestamp: new Date().toISOString(),
    files,
  };
}

writeFileSync(INSTALLED_PATH, JSON.stringify(installed, null, 2) + '\n');
console.log(`Seeded installed.json with ${Object.keys(installed).length} modules at ${INSTALLED_PATH}`);
console.log(`Total files tracked: ${Object.values(installed).reduce((s, m) => s + m.files.length, 0)}`);
