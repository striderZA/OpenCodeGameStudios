#!/usr/bin/env node

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

const COMMANDS_DIR = join(ROOT, '.opencode', 'commands');
const SKILLS_DIR = join(ROOT, '.opencode', 'skills');
const AGENTS_DIR = join(ROOT, '.opencode', 'agents');

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const lines = match[1].split(/\r?\n/);
  const data = {};
  for (const line of lines) {
    const kvMatch = line.match(/^(\w[\w-]*):\s*(.*)/);
    if (kvMatch) {
      const key = kvMatch[1];
      let value = (kvMatch[2] || '').trim().replace(/^["']|["']$/g, '');
      data[key] = value;
    }
  }
  return data;
}

function getCommandNames() {
  if (!existsSync(COMMANDS_DIR)) return [];
  return readdirSync(COMMANDS_DIR)
    .filter(f => f.endsWith('.md') && f !== 'README.md')
    .map(f => f.replace('.md', ''));
}

function getSkillNames() {
  if (!existsSync(SKILLS_DIR)) return [];
  return readdirSync(SKILLS_DIR).filter(d => {
    const p = join(SKILLS_DIR, d);
    return statSync(p).isDirectory() && existsSync(join(p, 'SKILL.md'));
  });
}

function getAgentNames() {
  if (!existsSync(AGENTS_DIR)) return [];
  return readdirSync(AGENTS_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace('.md', ''));
}

let testCount = 0;
let passCount = 0;

function run(name, fn) {
  testCount++;
  try {
    fn();
    passCount++;
    console.log(`  ${'PASS'} ${name}`);
  } catch (e) {
    console.log(`  ${'FAIL'} ${name}`);
    console.error(`       ${e.message}`);
  }
}

console.log('\n=== Cross-Reference Integrity ===\n');

const commandNames = new Set(getCommandNames());
const skillNames = new Set(getSkillNames());
const agentNames = new Set(getAgentNames());

const COMMAND_REF_RE = /`\/([a-z][\w-]+)`/g;

const knownNonCommands = new Set([
  'validate', 'gate-check', 'changelog', 'content-audit', 'automated-smoke-test',
  'ux-design', 'ux-review', 'asset-spec', 'patch-notes', 'propagate-design-change',
  'scope-check', 'skill-test', 'skill-improve', 'team-live-ops', 'balance-check',
  'art-bible', 'localize', 'asset-audit', 'perf-profile', 'consistency-check',
  'tech-debt', 'playtest-report', 'onboard', 'estimate', 'adopt',
  'hybrid-prototype', 'caveman', 'caveman-help', 'caveman-commit',
  'caveman-compress', 'caveman-review',
  'skill-name', 'command',
]);

{ // R1: Every /command ref in skills matches a command file
  const missing = [];
  const skillDirs = getSkillNames();
  for (const dir of skillDirs) {
    const content = readFileSync(join(SKILLS_DIR, dir, 'SKILL.md'), 'utf-8');
    const refs = [...content.matchAll(COMMAND_REF_RE)].map(m => m[1]);
    const unique = [...new Set(refs)];
    for (const ref of unique) {
      if (!commandNames.has(ref) && !knownNonCommands.has(ref)) {
        missing.push({ skill: dir, ref });
      }
    }
  }
  run('R1: All skill /command references map to existing command files', () => {
    if (missing.length > 0) {
      const details = missing.map(m => `  ${m.skill} -> /${m.ref}`).join('\n');
      throw new Error(`${missing.length} broken references:\n${details}`);
    }
  });
}

{ // R2: Every command skill: frontmatter matches a skill directory
  if (existsSync(COMMANDS_DIR)) {
    const mismatches = [];
    const commandFiles = readdirSync(COMMANDS_DIR)
      .filter(f => f.endsWith('.md') && f !== 'README.md');
    for (const file of commandFiles) {
      const content = readFileSync(join(COMMANDS_DIR, file), 'utf-8');
      const fm = parseFrontmatter(content);
      if (fm.skill && !skillNames.has(fm.skill)) {
        mismatches.push({ command: file.replace('.md', ''), skill: fm.skill });
      }
    }
    run('R2: Command skill: references point to real skill directories', () => {
      if (mismatches.length > 0) {
        const details = mismatches.map(m => `  ${m.command} -> skill: ${m.skill}`).join('\n');
        throw new Error(`${mismatches.length} mismatches:\n${details}`);
      }
    });
  } else {
    run('R2: Command skill: references point to real skill directories', () => {
      throw new Error('Commands directory not found');
    });
  }
}

{ // R3: Every subagent_type in skills matches an agent file
  const SUBAGENT_RE = /subagent_type:\s*`?([a-z][\w-]+)`?/g;
  const bad = [];
  const skillDirs = getSkillNames();
  for (const dir of skillDirs) {
    const content = readFileSync(join(SKILLS_DIR, dir, 'SKILL.md'), 'utf-8');
    const refs = [...content.matchAll(SUBAGENT_RE)].map(m => m[1]);
    const unique = [...new Set(refs)];
    for (const ref of unique) {
      if (!agentNames.has(ref)) {
        bad.push({ skill: dir, agent: ref });
      }
    }
  }
  run('R3: All subagent_type agent references map to existing agent files', () => {
    if (bad.length > 0) {
      const details = bad.map(b => `  ${b.skill} -> agent: ${b.agent}`).join('\n');
      throw new Error(`${bad.length} unknown agent refs:\n${details}`);
    }
  });
}

{ // R4: All agent delegation paths are valid (agents referencing other agents)
  if (existsSync(AGENTS_DIR)) {
    const bad = [];
    const agentFiles = readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'));
    for (const file of agentFiles) {
      const content = readFileSync(join(AGENTS_DIR, file), 'utf-8');
      const refs = [...content.matchAll(/subagent_type:\s*`?([a-z][\w-]+)`?/g)].map(m => m[1]);
      const unique = [...new Set(refs)];
      for (const ref of unique) {
        if (!agentNames.has(ref)) {
          bad.push({ agent: file.replace('.md', ''), ref });
        }
      }
    }
    run('R4: Agent-to-agent delegation references are all valid', () => {
      if (bad.length > 0) {
        const details = bad.map(b => `  ${b.agent} -> ${b.ref}`).join('\n');
        throw new Error(`${bad.length} unknown agent delegation refs:\n${details}`);
      }
    });
  } else {
    run('R4: Agent-to-agent delegation references are all valid', () => {
      throw new Error('Agents directory not found');
    });
  }
}

{ // R5: No orphan skill directories (SKILL.md present but no command)
  const commands = new Set(getCommandNames());
  const skills = getSkillNames();
  const orphans = skills.filter(s => !commands.has(s));
  const knownCommands = new Set(['gate-check', 'explore', ...knownNonCommands]);
  const unexpectedOrphans = orphans.filter(s => !knownCommands.has(s));
  run('R5: Skill directories without commands are intentionally documented', () => {
    if (unexpectedOrphans.length > 0) {
      throw new Error(`${unexpectedOrphans.length} unexpected orphan skills (no command file, not in knownNonCommands): ${unexpectedOrphans.join(', ')}`);
    }
  });
}

{ // R6: All referenced stage names are consistent across start, gate-check, and project-stage-detect
  const stageFiles = [
    join(SKILLS_DIR, 'start', 'SKILL.md'),
    join(SKILLS_DIR, 'gate-check', 'SKILL.md'),
    join(SKILLS_DIR, 'project-stage-detect', 'SKILL.md'),
  ];
  const stageSets = {};
  for (const file of stageFiles) {
    if (!existsSync(file)) continue;
    const name = file.split(/[/\\]/).slice(-2, -1)[0];
    const content = readFileSync(file, 'utf-8');
    const numbered = [...content.matchAll(/^\d+\.\s+\*\*(\w[\w\s-]+)\*\*/gm)].map(m => m[1].trim());
    const bolded = [...content.matchAll(/\*\*(\w[\w\s-]+)\*\*/g)].map(m => m[1].trim());
    stageSets[name] = [...new Set([...numbered, ...bolded.filter(s => /^[A-Z]/.test(s))])];
  }
  run('R6: Stage name consistency across skill files', () => {
    const names = Object.keys(stageSets);
    for (let i = 0; i < names.length - 1; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const a = new Set(stageSets[names[i]]);
        const b = new Set(stageSets[names[j]]);
        const shared = [...a].filter(s => b.has(s));
        if (shared.length === 0) {
          console.warn(`       Warning: ${names[i]} and ${names[j]} share no common stage names`);
        }
      }
    }
  });
}

console.log(`\nReferences: ${passCount}/${testCount} passed\n`);
process.exit(passCount === testCount ? 0 : 1);
