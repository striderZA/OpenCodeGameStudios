#!/usr/bin/env node

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

const SKILLS_DIR = join(ROOT, '.opencode', 'skills');
const COMMANDS_DIR = join(ROOT, '.opencode', 'commands');
const DOCS_DIR = join(ROOT, 'docs');

function getSkillContent(name) {
  const p = join(SKILLS_DIR, name, 'SKILL.md');
  if (!existsSync(p)) return null;
  return readFileSync(p, 'utf-8');
}

function getCommandNames() {
  if (!existsSync(COMMANDS_DIR)) return [];
  return readdirSync(COMMANDS_DIR)
    .filter(f => f.endsWith('.md') && f !== 'README.md')
    .map(f => f.replace('.md', ''));
}

function hasCommand(name) {
  return getCommandNames().includes(name);
}

function hasSkill(name) {
  const p = join(SKILLS_DIR, name, 'SKILL.md');
  return existsSync(p);
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

console.log('\n=== Workflow Path Validation ===\n');

const COMMAND_REF_RE = /`\/([a-z][\w-]+)`/g;

{ // P1: Start skill Path E (exploration) references valid commands and skills
  const start = getSkillContent('start');
  run('P1: Start skill exists and is parseable', () => {
    if (!start) throw new Error('start/SKILL.md not found');
  });

  if (start) {
    const refs = [...start.matchAll(COMMAND_REF_RE)].map(m => m[1]);
    const unique = [...new Set(refs)];
    const missingCommands = unique.filter(r => !hasCommand(r));
    const knownCommandless = new Set([
      'brainstorm', 'explore', 'gate-check', 'art-bible', 'adopt', 'ux-design',
    ]);
    const bad = missingCommands.filter(r => !knownCommandless.has(r));
    run('P2: All commands referenced in start skill exist', () => {
      if (bad.length > 0) {
        throw new Error(`Missing command files: ${bad.join(', ')}`);
      }
    });

    const missingSkills = unique.filter(r => !hasSkill(r));
    run('P3: All commands referenced in start skill have skill implementations', () => {
      const knownNoSkill = new Set(['brainstorm']);
      const bad = missingSkills.filter(r => !knownNoSkill.has(r));
      if (bad.length > 0) {
        throw new Error(`No skill directory: ${bad.join(', ')}`);
      }
    });
  }
}

{ // P4: Gate-check stage progression is complete and references valid
  const gate = getSkillContent('gate-check');
  run('P4: Gate-check skill exists and is parseable', () => {
    if (!gate) throw new Error('gate-check/SKILL.md not found');
  });

  if (gate) {
    const stageRefs = [...gate.matchAll(/\/gate-check\s+([\w-]+)/g)].map(m => m[1]);
    const unique = [...new Set(stageRefs)];
    const validGates = ['workflow-selection', 'concept', 'systems-design', 'technical-setup', 'pre-production', 'production', 'polish', 'release'];
    const unknownGates = unique.filter(g => !validGates.includes(g));
    run('P5: Gate-check references valid target phases only', () => {
      if (unknownGates.length > 0) {
        throw new Error(`Unknown gate targets: ${unknownGates.join(', ')}`);
      }
    });
  }
}

{ // P6: All numbered stages in gate-check are consistent and sequential
  const gate = getSkillContent('gate-check');
  if (gate) {
    const stages = [...gate.matchAll(/^(\d+)\.\s+\*\*(\w[\w\s-]+)\*\*/gm)];
    const stageNames = stages.map(s => s[2].trim());
    run('P6: Gate-check stages are sequential from 0 to 7', () => {
      if (stages.length === 0) throw new Error('No numbered stages found');
      const expected = ['Exploration', 'Concept', 'Systems Design', 'Technical Setup', 'Pre-Production', 'Production', 'Polish', 'Release'];
      for (let i = 0; i < Math.min(stages.length, expected.length); i++) {
        if (stageNames[i].toLowerCase() !== expected[i].toLowerCase()) {
          throw new Error(`Stage ${i}: expected "${expected[i]}", got "${stageNames[i]}"`);
        }
      }
    });
  }
}

{ // P7: Project-stage-detect skill defines the same stages
  const psd = getSkillContent('project-stage-detect');
  run('P7: project-stage-detect skill exists', () => {
    if (!psd) throw new Error('project-stage-detect/SKILL.md not found');
  });

  if (psd) {
    const refs = [...psd.matchAll(COMMAND_REF_RE)].map(m => m[1]);
    const unique = [...new Set(refs)];
    const missing = unique.filter(r => !hasCommand(r));
    const expectedCommandless = new Set(['gate-check']);
    const bad = missing.filter(r => !expectedCommandless.has(r));
    run('P8: All commands referenced in project-stage-detect exist', () => {
      if (bad.length > 0) {
        throw new Error(`Missing command files: ${bad.join(', ')}`);
      }
    });
  }
}

{ // P9: Workflow transition docs exist for defined transitions
  const transitionDocs = [
    'docs/workflow-transitions.md',
    'docs/hybrid-workflow.md',
    'docs/examples/workflow-selection-case-studies.md',
  ];
  const missingDocs = transitionDocs.filter(d => !existsSync(join(ROOT, d)));
  run('P9: All workflow transition documentation files exist', () => {
    if (missingDocs.length > 0) {
      throw new Error(`Missing docs: ${missingDocs.join(', ')}`);
    }
  });
}

{ // P10: explore skill references are valid
  const explore = getSkillContent('explore');
  run('P10: explore skill exists', () => {
    if (!explore) throw new Error('explore/SKILL.md not found');
  });

  if (explore) {
    const refs = [...explore.matchAll(COMMAND_REF_RE)].map(m => m[1]);
    const unique = [...new Set(refs)];
    const missing = unique.filter(r => !hasCommand(r));
    const knownCommandless = new Set([
      'gate-check', 'brainstorm', 'hybrid-prototype',
    ]);
    const bad = missing.filter(r => !knownCommandless.has(r));
    run('P11: All commands referenced in explore skill exist', () => {
      if (bad.length > 0) {
        throw new Error(`Missing command files: ${bad.join(', ')}`);
      }
    });
  }
}

console.log(`\nPaths: ${passCount}/${testCount} passed\n`);
process.exit(passCount === testCount ? 0 : 1);
