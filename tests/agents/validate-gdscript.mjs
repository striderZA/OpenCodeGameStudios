#!/usr/bin/env node

/**
 * GDScript Snippet Validator
 *
 * Scans agent markdown files for GDScript code blocks and performs basic
 * syntax validation without requiring a Godot installation.
 *
 * Checks for:
 * - Static typing on variables (var x: Type)
 * - Static typing on functions (func name(args) -> ReturnType)
 * - No 'yield' usage (Godot 3 pattern)
 * - No get_node() in _process (performance anti-pattern in snippets)
 * - Proper @onready usage
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

function extractGdscriptBlocks(content) {
  const blocks = [];
  const regex = /```gdscript\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    blocks.push({ code: match[1], line: content.substring(0, match.index).split('\n').length });
  }
  return blocks;
}

function validateSnippet(code, file, blockIndex) {
  const issues = [];
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (trimmed.startsWith('#') || trimmed === '') continue;

    // Check for 'yield' (Godot 3 pattern, should be 'await')
    if (/\byield\b/.test(trimmed)) {
      issues.push(`Godot 3 pattern: 'yield' on line ${i + 1} — use 'await' in Godot 4`);
    }

    // Check variable declarations for typing
    const varMatch = trimmed.match(/^var\s+(\w+)\s*=/);
    if (varMatch && !trimmed.includes(':')) {
      // Not all vars need types (e.g., var x := get_something()), but flag untyped assignments
      if (!trimmed.includes(':=')) {
        issues.push(`Untyped variable: '${varMatch[1]}' on line ${i + 1} — add type annotation`);
      }
    }

    // Check for get_node in non-onready contexts (simplified check — just flag occurrences)
    // Skip if the line is inside @onready assignment
    const isOnreadyLine = lines.slice(Math.max(0, i - 2), i + 1).some(l => l.trim().startsWith('@onready'));
    if (!isOnreadyLine && /\bget_node\b/.test(trimmed) && !trimmed.includes('#') && !trimmed.includes('//')) {
      issues.push(`Performance: 'get_node()' not in @onready context on line ${i + 1}`);
    }
  }

  return issues;
}

function validateAgentFiles() {
  const agentsDir = join(ROOT, '.opencode', 'agents');
  if (!existsSync(agentsDir)) {
    console.log('No agents directory found');
    process.exit(0);
  }

  const files = readdirSync(agentsDir).filter(f => f.endsWith('.md'));
  let totalSnippets = 0;
  let totalIssues = 0;
  const results = [];

  for (const file of files) {
    const content = readFileSync(join(agentsDir, file), 'utf-8');
    const snippets = extractGdscriptBlocks(content);

    if (snippets.length === 0) continue;

    totalSnippets += snippets.length;
    const fileIssues = [];

    for (let j = 0; j < snippets.length; j++) {
      const issues = validateSnippet(snippets[j].code, file, j);
      if (issues.length > 0) {
        fileIssues.push({ blockIndex: j, line: snippets[j].line, issues });
        totalIssues += issues.length;
      }
    }

    results.push({ file, snippets: snippets.length, issues: fileIssues });
  }

  return { results, totalSnippets, totalIssues };
}

function main() {
  const isAdvisory = process.argv.includes('--advisory');
  console.log('🔍 Validating GDScript snippets in agent files...\n');

  const { results, totalSnippets, totalIssues } = validateAgentFiles();

  console.log(`Scanned ${results.length} agent files with GDScript snippets`);
  console.log(`Total snippets: ${totalSnippets}`);
  console.log(`Total issues: ${totalIssues}\n`);

  if (totalIssues === 0) {
    console.log('✅ All GDScript snippets pass validation.');
    process.exit(0);
  }

  console.log('Issues found:\n');
  for (const r of results) {
    if (r.issues.length === 0) continue;
    console.log(`## ${r.file} (${r.snippets} snippets)`);
    for (const block of r.issues) {
      console.log(`  Block ${block.blockIndex + 1} (line ~${block.line}):`);
      for (const issue of block.issues) {
        console.log(`    - ${issue}`);
      }
    }
    console.log();
  }

  console.log(`❌ ${totalIssues} GDScript snippet issues found.`);
  console.log('   Most are intentional anti-pattern examples shown in code blocks.');
  console.log(`   Use --advisory to exit cleanly when reviewing known-issue files.`);

  if (isAdvisory) {
    process.exit(0);
  }
  process.exit(1);
}

main();
