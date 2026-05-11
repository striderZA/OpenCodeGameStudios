#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseModulefile } from './lib/parse-modulefile.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const MODULES_DIR = join(ROOT, '.opencode', 'modules');
const INSTALLED_PATH = join(MODULES_DIR, 'installed.json');

// Discover all modules
const moduleDirs = readdirSync(MODULES_DIR).filter(d => {
  const p = join(MODULES_DIR, d);
  try { return statSync(p).isDirectory() && existsSync(join(p, 'modulefile.yaml')); }
  catch { return false; }
}).sort();

// Build installed.json
const installed = {};
for (const name of moduleDirs) {
  const mf = parseModulefile(readFileSync(join(MODULES_DIR, name, 'modulefile.yaml'), 'utf-8'));
  installed[name] = {
    version: mf.version || '0.1.0',
    status: 'installed',
    timestamp: new Date().toISOString(),
    files: [],
  };
}

writeFileSync(INSTALLED_PATH, JSON.stringify(installed, null, 2) + '\n');
console.log(`Seeded installed.json with ${Object.keys(installed).length} modules at ${INSTALLED_PATH}`);
