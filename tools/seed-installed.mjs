#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const MODULES_DIR = join(ROOT, '.opencode', 'modules');
const INSTALLED_PATH = join(MODULES_DIR, 'installed.json');

// Inline YAML parser for the constrained modulefile format
function parseFlowList(str) {
  const items = [];
  let current = '';
  let depth = 0;
  let inQuote = false;
  let quoteChar = null;
  for (const ch of str) {
    if (inQuote) {
      if (ch === quoteChar) { inQuote = false; }
      else { current += ch; }
    } else if (ch === '"' || ch === "'") {
      inQuote = true;
      quoteChar = ch;
    } else if (ch === '[' || ch === '(') { depth++; current += ch; }
    else if (ch === ']' || ch === ')') { depth--; current += ch; }
    else if (ch === ',' && depth === 0) { items.push(current.trim()); current = ''; }
    else { current += ch; }
  }
  const last = current.trim();
  if (last) items.push(last);
  return items;
}

function parseModulefile(text) {
  const lines = text.split(/\r?\n/);
  const result = {};
  const sectionStack = [];
  let continuedList = null;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const indent = raw.length - raw.trimStart().length;

    if (continuedList) {
      continuedList.buffer += ' ' + trimmed;
      if (trimmed.endsWith(']')) {
        continuedList.obj[continuedList.key] = parseFlowList(continuedList.buffer.slice(1, -1));
        continuedList = null;
      }
      continue;
    }

    while (sectionStack.length > 0 && indent <= sectionStack[sectionStack.length - 1].indent) {
      sectionStack.pop();
    }
    const parentObj = sectionStack.length > 0 ? sectionStack[sectionStack.length - 1].obj : result;
    const match = trimmed.match(/^([\w-]+):\s*(.*)/);
    if (!match) continue;

    const key = match[1];
    const value = match[2].trim();

    if (value === '') {
      const newObj = {};
      parentObj[key] = newObj;
      sectionStack.push({ indent, obj: newObj, key });
    } else if (value.startsWith('[')) {
      if (value.endsWith(']')) {
        parentObj[key] = parseFlowList(value.slice(1, -1));
      } else {
        continuedList = { obj: parentObj, key, buffer: value };
      }
    } else if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      parentObj[key] = value.slice(1, -1);
    } else {
      parentObj[key] = value;
    }
  }
  return result;
}

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
