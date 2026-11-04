/**
 * MCP config writers for each harness.
 *
 * Module MCP fragments are authored per harness (`mcp/<harness>.json`) in that
 * harness's native shape. This module only merges and removes entries; it does
 * not translate between shapes.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export function loadMcpTarget(kind, file) {
  if (kind === 'opencode-json') return jsonTarget(file, 'mcp.servers');
  if (kind === 'mcp-servers-json') return jsonTarget(file, 'mcpServers');
  if (kind === 'codex-toml') return codexTomlTarget(file);
  throw new Error(`Unknown MCP target kind '${kind}'`);
}

function jsonTarget(file, path) {
  const config = readJson(file);
  const container = ensureContainer(config, path);

  return {
    kind: 'json',
    file,
    has: (name) => Boolean(container[name]),
    merge: (name, entry) => { container[name] = entry; },
    remove: (name) => { delete container[name]; },
    names: () => Object.keys(container),
    save: () => writeJson(file, config),
  };
}

function readJson(file) {
  if (!existsSync(file)) return {};
  const raw = readFileSync(file, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Cannot parse ${file}: ${error.message}`);
  }
}

function ensureContainer(config, path) {
  const parts = path.split('.');
  let cursor = config;
  for (const part of parts) {
    if (!cursor[part] || typeof cursor[part] !== 'object') cursor[part] = {};
    cursor = cursor[part];
  }
  return cursor;
}

function writeJson(file, data) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

function codexTomlTarget(file) {
  let text = existsSync(file) ? readFileSync(file, 'utf-8') : '';
  let changed = false;

  return {
    kind: 'toml',
    file,
    has: (name) => hasTomlTable(text, name),
    merge: (name, entry) => {
      if (hasTomlTable(text, name)) return;
      text = appendTomlTable(text, name, entry);
      changed = true;
    },
    remove: (name) => {
      if (!hasTomlTable(text, name)) return;
      text = removeTomlTable(text, name);
      changed = true;
    },
    names: () => listTomlTables(text),
    save: () => {
      if (!changed) return;
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, text);
    },
  };
}

// ── Minimal TOML support (only `[mcp_servers.<name>]` tables) ──────────────

export function tomlKey(value) {
  return /^[A-Za-z0-9_-]+$/.test(value) ? value : JSON.stringify(value);
}

export function tomlValue(value) {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(tomlValue).join(', ')}]`;
  if (value && typeof value === 'object') {
    const pairs = Object.entries(value)
      .map(([key, nested]) => `${tomlKey(key)} = ${tomlValue(nested)}`)
      .join(', ');
    return `{ ${pairs} }`;
  }
  throw new Error(`Unsupported TOML value: ${String(value)}`);
}

export function hasTomlTable(text, name) {
  return tablePattern(name).test(text);
}

export function listTomlTables(text) {
  const names = [];
  for (const match of text.matchAll(/^\[mcp_servers\.([A-Za-z0-9_-]+)\]\s*$/gm)) {
    names.push(match[1]);
  }
  return names;
}

export function appendTomlTable(text, name, entry) {
  const header = `[mcp_servers.${tomlKey(name)}]`;
  const rows = Object.entries(entry).map(([key, value]) => `${tomlKey(key)} = ${tomlValue(value)}`);
  const block = [header, ...rows].join('\n');
  const trimmed = text.trimEnd();
  return trimmed ? `${trimmed}\n\n${block}\n` : `${block}\n`;
}

export function removeTomlTable(text, name) {
  const lines = text.split('\n');
  const header = `[mcp_servers.${tomlKey(name)}]`;
  const start = lines.findIndex((line) => line.trim() === header);
  if (start === -1) return text;

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^\s*\[/.test(lines[i])) {
      end = i;
      break;
    }
  }

  const before = lines.slice(0, start).join('\n').replace(/\n+$/, '');
  const after = lines.slice(end).join('\n').replace(/^\n+/, '');
  const joined = [before, after].filter(Boolean).join('\n\n');
  return joined ? `${joined}\n` : '';
}

function tablePattern(name) {
  return new RegExp(`^\\[mcp_servers\\.${escapeRegex(tomlKey(name))}\\]\\s*$`, 'm');
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
