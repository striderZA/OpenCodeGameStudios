#!/usr/bin/env node

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

const COMMANDS_DIR = join(ROOT, '.opencode', 'commands');
const SKILLS_DIR = join(ROOT, '.opencode', 'skills');
const AGENTS_DIR = join(ROOT, '.opencode', 'agents');
const DOCS_DIR = join(ROOT, 'docs');
const DESIGN_DIR = join(ROOT, 'design');
const PRODUCTION_DIR = join(ROOT, 'production');
const TESTS_DIR = join(ROOT, 'tests');

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

console.log('\n=== Cross-Cutting Invariants ===\n');

{ // I1: No duplicate frontmatter descriptions across commands
  if (existsSync(COMMANDS_DIR)) {
    const seen = {};
    const dups = [];
    const files = readdirSync(COMMANDS_DIR).filter(f => f.endsWith('.md') && f !== 'README.md');
    for (const file of files) {
      const content = readFileSync(join(COMMANDS_DIR, file), 'utf-8');
      const fm = parseFrontmatter(content);
      if (fm.description) {
        if (seen[fm.description]) {
          dups.push({ desc: fm.description, files: [seen[fm.description], file] });
        } else {
          seen[fm.description] = file;
        }
      }
    }
    run('I1: No duplicate command descriptions', () => {
      if (dups.length > 0) {
        const details = dups.map(d => `  "${d.desc.substring(0, 60)}..." in ${d.files.join(', ')}`).join('\n');
        throw new Error(`${dups.length} duplicate descriptions:\n${details}`);
      }
    });
  }
}

{ // I2: Every skill SKILL.md has valid frontmatter
  if (existsSync(SKILLS_DIR)) {
    const bad = [];
    const dirs = readdirSync(SKILLS_DIR).filter(d => {
      const p = join(SKILLS_DIR, d);
      return statSync(p).isDirectory() && existsSync(join(p, 'SKILL.md'));
    });
    for (const dir of dirs) {
      const content = readFileSync(join(SKILLS_DIR, dir, 'SKILL.md'), 'utf-8');
      const fm = parseFrontmatter(content);
      if (!fm.description) {
        bad.push(`${dir}: missing description`);
      }
      if (!fm['allowed-tools']) {
        bad.push(`${dir}: missing allowed-tools`);
      }
    }
    run('I2: All skill SKILL.md files have required frontmatter fields', () => {
      if (bad.length > 0) {
        throw new Error(`Issues:\n  ${bad.join('\n  ')}`);
      }
    });
  }
}

{ // I3: Source directory structure integrity
  const requiredDirs = [
    join(ROOT, 'src'),
    join(ROOT, 'assets'),
    join(ROOT, 'design'),
    join(ROOT, 'docs'),
    join(ROOT, 'docs', 'architecture'),
    join(ROOT, 'docs', 'engine-reference'),
    join(ROOT, 'production'),
    join(ROOT, 'prototypes'),
    join(ROOT, 'tests'),
    join(ROOT, 'tests', 'agents'),
  ];
  const optDirs = [
    join(ROOT, 'design', 'gdd'),
    join(ROOT, 'design', 'ux'),
    join(ROOT, 'design', 'art'),
    join(ROOT, 'production', 'sprints'),
    join(ROOT, 'production', 'epics'),
    join(ROOT, 'production', 'milestones'),
    join(ROOT, 'production', 'qa'),
    join(ROOT, 'production', 'qa', 'bugs'),
    join(ROOT, 'production', 'qa', 'evidence'),
    join(ROOT, 'production', 'playtests'),
    join(ROOT, 'production', 'gate-checks'),
    join(ROOT, 'production', 'session-logs'),
    join(ROOT, 'tools'),
  ];
  const missingRequired = requiredDirs.filter(d => !existsSync(d));
  const missingOptional = optDirs.filter(d => !existsSync(d));
  run('I3: All required project directories exist', () => {
    if (missingRequired.length > 0) {
      throw new Error(`Missing required directories:\n  ${missingRequired.join('\n  ')}`);
    }
  });
  if (missingOptional.length > 0) {
    console.warn(`       Info: ${missingOptional.length} optional directories not yet created (created by workflow):`);
    for (const d of missingOptional) {
      const rel = d.replace(ROOT + '/', '').replace(ROOT + '\\', '');
      console.warn(`         - ${rel}`);
    }
  }
}

{ // I4: No stale template placeholders in key config files
  const configFiles = [
    join(ROOT, '.opencode', 'docs', 'technical-preferences.md'),
  ];
  const knownPlaceholderFiles = new Set([
    join(ROOT, '.opencode', 'docs', 'technical-preferences.md'),
  ]);
  const bad = [];
  for (const file of configFiles) {
    if (!existsSync(file)) continue;
    const content = readFileSync(file, 'utf-8');
    if (content.includes('[TO BE CONFIGURED]') && !knownPlaceholderFiles.has(file)) {
      bad.push(`${file}: contains [TO BE CONFIGURED] placeholder`);
    }
    if (content.includes('[CHOOSE]') && !file.includes('CLAUD')) {
      bad.push(`${file}: contains [CHOOSE] placeholder`);
    }
  }
  run('I4: No unexpected template placeholders in config files', () => {
    if (bad.length > 0) {
      throw new Error(`Placeholders outside known list:\n  ${bad.join('\n  ')}`);
    }
  });
}

{ // I5: All AGENTS.md and other root agent files reference only existing agents
  const agentDocPath = join(ROOT, 'AGENTS.md');
  if (existsSync(agentDocPath)) {
    const content = readFileSync(agentDocPath, 'utf-8');
    const agentRefs = [...content.matchAll(/`([a-z][\w-]+)`/g)].map(m => m[1]);
    const unique = [...new Set(agentRefs)];
    const agentNames = existsSync(AGENTS_DIR)
      ? new Set(readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md')).map(f => f.replace('.md', '')))
      : new Set();
    const developmentRelated = new Set(['development']);
    const unknown = unique.filter(r => !agentNames.has(r) && !developmentRelated.has(r));
    run('I5: AGENTS.md references only existing agent files', () => {
      if (unknown.length > 0) {
        throw new Error(`Unknown agents referenced: ${unknown.join(', ')}`);
      }
    });
  } else {
    run('I5: AGENTS.md file exists', () => { throw new Error('AGENTS.md not found'); });
  }
}

{ // I6: All command files have frontmatter with required fields
  if (existsSync(COMMANDS_DIR)) {
    const bad = [];
    const files = readdirSync(COMMANDS_DIR).filter(f => f.endsWith('.md') && f !== 'README.md');
    for (const file of files) {
      const content = readFileSync(join(COMMANDS_DIR, file), 'utf-8');
      const fm = parseFrontmatter(content);
      if (!fm.name) bad.push(`${file}: missing name`);
      if (!fm.description) bad.push(`${file}: missing description`);
      if (!fm.skill) bad.push(`${file}: missing skill`);
      if (!fm.category) bad.push(`${file}: missing category`);
      if (fm.category && !['onboarding', 'design', 'architecture', 'stories', 'qa', 'prototyping', 'team', 'release', 'ops'].includes(fm.category)) {
        bad.push(`${file}: invalid category "${fm.category}"`);
      }
    }
    run('I6: All command files have valid frontmatter', () => {
      if (bad.length > 0) {
        throw new Error(`Issues:\n  ${bad.join('\n  ')}`);
      }
    });
  }
}

{ // I7: Agent names in skill frontmatter (agent: field) are valid
  if (existsSync(SKILLS_DIR) && existsSync(AGENTS_DIR)) {
    const agentNames = new Set(readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md')).map(f => f.replace('.md', '')));
    const dirs = readdirSync(SKILLS_DIR).filter(d => {
      const p = join(SKILLS_DIR, d);
      return statSync(p).isDirectory() && existsSync(join(p, 'SKILL.md'));
    });
    const bad = [];
    for (const dir of dirs) {
      const content = readFileSync(join(SKILLS_DIR, dir, 'SKILL.md'), 'utf-8');
      const fm = parseFrontmatter(content);
      if (fm.agent && !agentNames.has(fm.agent)) {
        bad.push(`${dir}: agent "${fm.agent}" not found`);
      }
    }
    run('I7: All skill agent: frontmatter references are valid', () => {
      if (bad.length > 0) {
        throw new Error(`Issues:\n  ${bad.join('\n  ')}`);
      }
    });
  }
}

{ // I8: No skill directories contain README files (pattern violation)
  if (existsSync(SKILLS_DIR)) {
    const bad = [];
    const dirs = readdirSync(SKILLS_DIR).filter(d => statSync(join(SKILLS_DIR, d)).isDirectory());
    for (const dir of dirs) {
      const entries = readdirSync(join(SKILLS_DIR, dir));
      for (const entry of entries) {
        if (entry.toLowerCase().startsWith('readme')) {
          bad.push(`${dir}/${entry}`);
        }
      }
    }
    run('I8: No README files in skill directories', () => {
      if (bad.length > 0) {
        throw new Error(`Pattern violations:\n  ${bad.join('\n  ')}`);
      }
    });
  }
}

{ // I9: Architecture docs directory has ADRs
  const adrDir = join(ROOT, 'docs', 'architecture');
  if (existsSync(adrDir)) {
    const mdFiles = readdirSync(adrDir).filter(f => f.endsWith('.md'));
    run('I9: Architecture docs directory exists', () => {
      if (mdFiles.length === 0) {
        console.warn('       Info: No ADRs yet — expected until architecture phase');
      }
    });
  } else {
    run('I9: Architecture docs directory exists', () => {
      throw new Error('docs/architecture/ not found');
    });
  }
}

{ // I10: skill-testing-framework catalog.yaml covers all skills in .opencode/skills/
  const catalogPath = join(ROOT, 'skill-testing-framework', 'catalog.yaml');
  if (existsSync(catalogPath)) {
    const yaml = readFileSync(catalogPath, 'utf-8');
    const cataloged = new Set([...yaml.matchAll(/^  - name: ([a-z][\w-]+)/gm)].map(m => m[1]));
    const skillDirs = readdirSync(SKILLS_DIR).filter(d => {
      const p = join(SKILLS_DIR, d);
      return statSync(p).isDirectory() && existsSync(join(p, 'SKILL.md'));
    });
    const missing = skillDirs.filter(s => !cataloged.has(s));
    run('I10: All skills in .opencode/skills/ are cataloged in skill-testing-framework/catalog.yaml', () => {
      if (missing.length > 0) {
        throw new Error(`Skills not in catalog.yaml: ${missing.join(', ')}`);
      }
    });
  } else {
    run('I10: skill-testing-framework/catalog.yaml exists', () => {
      throw new Error('catalog.yaml not found');
    });
  }
}

{ // I11: No stale .claude/ paths remain in skill-testing-framework spec files
  const frameworkDir = join(ROOT, 'skill-testing-framework');
  if (existsSync(frameworkDir)) {
    const mdFiles = [];
    function walk(dir) {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const fp = join(dir, e.name);
        if (e.isDirectory()) walk(fp);
        else if (e.name.endsWith('.md')) mdFiles.push(fp);
      }
    }
    walk(frameworkDir);
    const stale = [];
    for (const fp of mdFiles) {
      const content = readFileSync(fp, 'utf-8');
      const claudeRefs = content.match(/\.claude\/[\w./-]+/g);
      const sessionStateRefs = content.match(/production\/session-state\/review-mode\.txt/g);
      if (claudeRefs) stale.push(...claudeRefs.map(r => `${fp.replace(ROOT, '')}: ${r}`));
      if (sessionStateRefs) stale.push(...sessionStateRefs.map(r => `${fp.replace(ROOT, '')}: ${r}`));
    }
    run('I11: No stale .claude/ or session-state/ paths in spec files', () => {
      if (stale.length > 0) {
        throw new Error(`${stale.length} stale refs:\n  ${stale.join('\n  ')}`);
      }
    });
  } else {
    run('I11: skill-testing-framework directory exists', () => {
      throw new Error('skill-testing-framework/ not found');
    });
  }
}

console.log(`\nInvariants: ${passCount}/${testCount} passed\n`);
process.exit(passCount === testCount ? 0 : 1);
