#!/usr/bin/env node

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

const SKILLS_DIR = join(ROOT, '.opencode', 'skills');

function getSkillContent(name) {
  const p = join(SKILLS_DIR, name, 'SKILL.md');
  if (!existsSync(p)) return null;
  return readFileSync(p, 'utf-8');
}

const FILE_REF_RE = /`([\w./-]+\.\w+)`/g;
const DIR_REF_RE = /`([\w./-]+)\/`/g;

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

console.log('\n=== Gate Transition Validation ===\n');

const gate = getSkillContent('gate-check');
run('G1: Gate-check skill exists', () => {
  if (!gate) throw new Error('gate-check/SKILL.md not found');
});

if (gate) {
  { // G2: All checklist file references point to valid relative paths
    const fileRefs = [...gate.matchAll(FILE_REF_RE)].map(m => m[1]);
    const unique = [...new Set(fileRefs)];
    const knownMissing = new Set([
      'docs/architecture/architecture-traceability.md',
      'docs/architecture/architecture.md',
      'docs/architecture/control-manifest.md',
      'design/gdd/game-concept.md',
      'design/gdd/game-pillars.md',
      'design/gdd/systems-index.md',
      'design/art/art-bible.md',
      'design/accessibility-requirements.md',
      'design/ux/hud.md',
      'design/ux/interaction-patterns.md',
      'design/player-journey.md',
      'docs/engine-reference/[engine]/deprecated-apis.md',
      'tests/unit/',
      'tests/integration/',
      'production/workflow-mode.txt',
      'production/stage.txt',
      'production/review-mode.txt',
      'production/qa/',
      'production/sprints/',
      'production/epics/',
      'production/playtests/',
      'production/session-logs/',
      'prototypes/explore/',
      'design/difficulty-curve.md',
      '.opencode/docs/technical-preferences.md',
      '.opencode/docs/director-gates.md',
      '.github/workflows/tests.yml',
      'docs/consistency-failures.md',
    ]);
    const knownPlaceholder = new Set([
      'docs/engine-reference/[engine]/',
    ]);
    const missingFiles = [];
    for (const ref of unique) {
      if (knownMissing.has(ref) || knownPlaceholder.has(ref)) continue;
      if (ref.startsWith('[') && ref.endsWith(']')) continue;
      if (ref.startsWith('`')) continue;
      const path = join(ROOT, ref.replace(/[/\\]/g, '/'));
      if (!existsSync(path)) {
        if (ref.endsWith('/')) continue;
        missingFiles.push(ref);
      }
    }
    run('G2: Gate-check file references correspond to real project files', () => {
      if (missingFiles.length > 0) {
        throw new Error(`${missingFiles.length} files referenced but not found:\n  ${missingFiles.join('\n  ')}`);
      }
    });
  }

  { // G3: Stage transition names match skills directory names
    const stageToSkill = {
      'exploration': 'explore',
      'Concept': 'brainstorm',
      'Systems Design': 'map-systems',
      'Technical Setup': 'setup-engine',
      'Pre-Production': 'prototype',
      'Production': 'dev-story',
      'Polish': 'perf-profile',
      'Release': 'release-checklist',
    };
    const missing = [];
    const expectedSkills = new Set(Object.values(stageToSkill));
    for (const skill of expectedSkills) {
      const p = join(SKILLS_DIR, skill, 'SKILL.md');
      if (!existsSync(p)) missing.push(skill);
    }
    run('G3: Each stage gate has a corresponding skill directory', () => {
      if (missing.length > 0) {
        throw new Error(`Missing skill directories: ${missing.join(', ')}`);
      }
    });
  }

  { // G4: Director gate references found in gate-check content
    const GATE_LABELS = /([A-Z]{2,3}-PHASE-GATE)/g;
    const gates = [...gate.matchAll(GATE_LABELS)].map(m => m[1]);
    const unique = [...new Set(gates)];
    run('G4: At least one director phase gate label is referenced', () => {
      if (unique.length === 0) {
        throw new Error('No director gate labels (e.g., CD-PHASE-GATE) found in gate-check content');
      }
    });
  }

  { // G6: Base project directories exist (runtime artifact dirs are created by workflow)
    const baseDirs = [
      'production',
      'prototypes',
    ];
    const runtimeDirs = [
      'production/session-logs/',
      'production/sprints/',
      'production/epics/',
      'production/milestones/',
      'production/qa/',
      'production/qa/bugs/',
      'production/qa/evidence/',
      'production/playtests/',
      'production/gate-checks/',
      'prototypes/explore/',
    ];
    const missing = baseDirs.filter(p => {
      const full = join(ROOT, p.replace(/[/\\]/g, '/'));
      return !existsSync(full);
    });
    run('G6: Base project directories exist', () => {
      if (missing.length > 0) {
        throw new Error(`Missing base directories:\n  ${missing.join('\n  ')}`);
      }
    });
    const runtimeMissing = runtimeDirs.filter(p => !existsSync(join(ROOT, p.replace(/[/\\]/g, '/'))));
    if (runtimeMissing.length > 0) {
      console.warn(`       Info: ${runtimeMissing.length} runtime directories not yet created (expected until workflow runs):`);
      for (const d of runtimeMissing) console.warn(`         - ${d}`);
    }
  }

  { // G7: Workflow mode options are consistent
    const workflowModes = [...gate.matchAll(/production\/workflow-mode\.txt/g)];
    run('G7: Workflow mode output path is referenced', () => {
      if (workflowModes.length === 0) {
        throw new Error('No workflow-mode.txt references in gate-check');
      }
    });
  }
}

{ // G8: Hybrid workflow doc references match
  const hybridDoc = join(ROOT, 'docs', 'hybrid-workflow.md');
  if (existsSync(hybridDoc)) {
    const hybrid = readFileSync(hybridDoc, 'utf-8');
    const refs = [...hybrid.matchAll(/`\/([a-z][\w-]+)`/g)].map(m => m[1]);
    const unique = [...new Set(refs)];
    const commandsDir = join(ROOT, '.opencode', 'commands');
    const commandNames = existsSync(commandsDir)
      ? new Set(readdirSync(commandsDir).filter(f => f.endsWith('.md') && f !== 'README.md').map(f => f.replace('.md', '')))
      : new Set();
    const knownMissing = new Set([
      'brainstorm', 'explore', 'gate-check', 'hybrid-prototype', 'art-bible', 'adopt',
    ]);
    const bad = unique.filter(r => !commandNames.has(r) && !knownMissing.has(r));
    run('G8: All /command references in hybrid-workflow.md exist', () => {
      if (bad.length > 0) {
        throw new Error(`Missing command files: ${bad.join(', ')}`);
      }
    });
  } else {
    run('G8: All /command references in hybrid-workflow.md exist', () => {
      throw new Error('docs/hybrid-workflow.md not found');
    });
  }
}

{ // G9: Workflow transitions doc references format is consistent
  const transitions = [
    join(ROOT, 'docs', 'workflow-transitions.md'),
    join(ROOT, 'docs', 'examples', 'workflow-selection-case-studies.md'),
  ];
  for (const doc of transitions) {
    const name = doc.split(/[/\\]/).slice(-2).join('/');
    if (existsSync(doc)) {
      const content = readFileSync(doc, 'utf-8');
      const refs = [...content.matchAll(/`\/([a-z][\w-]+)`/g)].map(m => m[1]);
      const unique = [...new Set(refs)];
      const commandsDir = join(ROOT, '.opencode', 'commands');
      const commandNames = existsSync(commandsDir)
        ? new Set(readdirSync(commandsDir).filter(f => f.endsWith('.md') && f !== 'README.md').map(f => f.replace('.md', '')))
        : new Set();
      const knownMissing = new Set([
        'brainstorm', 'explore', 'gate-check', 'hybrid-prototype', 'perf-profile', 'adopt',
      ]);
      const bad = unique.filter(r => !commandNames.has(r) && !knownMissing.has(r));
      run(`G9a: ${name} command references are valid`, () => {
        if (bad.length > 0) {
          throw new Error(`Missing command files: ${bad.join(', ')}`);
        }
      });
    }
  }
}

console.log(`\nGates: ${passCount}/${testCount} passed\n`);
process.exit(passCount === testCount ? 0 : 1);
