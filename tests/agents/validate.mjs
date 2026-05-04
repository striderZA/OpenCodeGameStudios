#!/usr/bin/env node

/**
 * Agent Framework Validator
 *
 * Validates the structural integrity of the OCGS agent framework:
 * - Agent markdown files (.opencode/agents/)
 * - Skill markdown files (.opencode/skills/)
 * - Command markdown files (.opencode/commands/)
 *
 * Produces a PASS/FAIL report with detailed diagnostics.
 * Exits with code 0 on pass, 1 on failure.
 */

import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

// ── Configuration ────────────────────────────────────────────────────────

// Agents with intentional structural gaps — validated but not counted as failures.
// Used for Tier 2 engine specialists (UE/Unity) where rough edges are acceptable
// per the Framework Hardening scope. Remove from this list when sections are added.
const AGENT_EXCEPTIONS = [
  'ue-blueprint-specialist.md',
  'ue-gas-specialist.md',
  'ue-replication-specialist.md',
  'ue-umg-specialist.md',
  'unity-addressables-specialist.md',
  'unity-dots-specialist.md',
  'unity-shader-specialist.md',
  'unity-ui-specialist.md',
];

const REQUIRED_AGENT_FRONTMATTER = ['description', 'mode', 'model', 'maxTurns'];
const REQUIRED_AGENT_SECTIONS = [
  'Collaboration Protocol',
  'Key Responsibilities',
  'What This Agent Must NOT Do',
  'Delegation Map',
];
const OPTIONAL_AGENT_SECTIONS = [
  'Version Awareness',
  'Common Anti-Patterns',
  'MCP Integration',
  'When Consulted',
];

const REQUIRED_SKILL_FRONTMATTER = ['description', 'user-invocable', 'allowed-tools'];
const REQUIRED_COMMAND_FRONTMATTER = ['description', 'skill', 'category'];

// ── YAML Frontmatter Parser ──────────────────────────────────────────────

function parseFrontmatter(content) {
  // NOTE: Only captures first-line YAML values. Multi-line values (arrays, folded
  // blocks) are silently truncated. Low risk: all current agent frontmatter fields
  // are single-line. If multi-line values are added, this parser must be upgraded.
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { error: 'No frontmatter found' };

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

  return { data, error: null };
}

// ── Agent Validation ────────────────────────────────────────────────────

function validateAgents() {
  const agentsDir = join(ROOT, '.opencode', 'agents');
  if (!existsSync(agentsDir)) return { error: `Agents directory not found: ${agentsDir}` };

  const files = readdirSync(agentsDir).filter(f => f.endsWith('.md'));
  const results = [];
  let passed = 0, failed = 0;

  for (const file of files) {
    const filePath = join(agentsDir, file);
    const content = readFileSync(filePath, 'utf-8');
    const issues = [];
    const warnings = [];

    // Frontmatter check
    const fm = parseFrontmatter(content);
    if (fm.error) {
      issues.push(`Frontmatter: ${fm.error}`);
    } else {
      for (const field of REQUIRED_AGENT_FRONTMATTER) {
        if (!fm.data[field]) {
          issues.push(`Frontmatter: missing required field '${field}'`);
        }
      }
      if (fm.data.mode && !['primary', 'subagent'].includes(fm.data.mode)) {
        issues.push(`Frontmatter: invalid mode '${fm.data.mode}' (expected primary or subagent)`);
      }
    }

    // Required sections check
    for (const section of REQUIRED_AGENT_SECTIONS) {
      if (!content.includes(section)) {
        // Allow alternate phrasing
        if (section === 'Key Responsibilities' && content.includes('Core Responsibilities')) continue;
        if (section === 'Delegation Map' && (content.includes('Reports to:') || content.includes('Reports to'))) continue;
        if (section === 'What This Agent Must NOT Do' && content.includes('Must NOT')) continue;
        issues.push(`Missing required section: '${section}'`);
      }
    }

    // Optional sections tracking
    const missingOptional = OPTIONAL_AGENT_SECTIONS.filter(s => !content.includes(s));

    // Length check
    const lines = content.split('\n').length;
    if (lines < 80) {
      warnings.push(`Short agent (${lines} lines) — may need more content`);
    }

    const status = issues.length === 0 ? 'PASS' : 'FAIL';
    const isException = AGENT_EXCEPTIONS.includes(file);
    const effectiveStatus = (status === 'FAIL' && isException) ? 'EXCEPTED' : status;

    if (effectiveStatus === 'EXCEPTED') {
      passed++;
      warnings.push(...issues.map(i => `[EXCEPTED] ${i}`));
      warnings.push('This agent is in the exceptions list — remove from AGENT_EXCEPTIONS when these gaps are closed.');
    } else if (status === 'PASS' && isException) {
      passed++;
      warnings.push('Agent passes all checks but is still in AGENT_EXCEPTIONS — remove from exceptions list.');
    } else if (status === 'PASS') {
      passed++;
    } else {
      failed++;
    }

    results.push({
      file,
      status: effectiveStatus,
      lines,
      issues: effectiveStatus === 'EXCEPTED' ? [] : issues,
      warnings,
      missingOptional: missingOptional.length > 0 ? missingOptional : [],
    });
  }

  return {
    results,
    summary: { total: files.length, passed, failed },
    error: null,
  };
}

// ── Skill Validation ────────────────────────────────────────────────────

function validateSkills() {
  const skillsDir = join(ROOT, '.opencode', 'skills');
  if (!existsSync(skillsDir)) return { error: `Skills directory not found: ${skillsDir}` };

  const dirs = readdirSync(skillsDir).filter(d => {
    const p = join(skillsDir, d);
    return statSync(p).isDirectory() && existsSync(join(p, 'SKILL.md'));
  });

  const results = [];
  let passed = 0, failed = 0;

  // Build valid agent names for cross-reference validation
  const agentNames = readdirSync(join(ROOT, '.opencode', 'agents'))
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace('.md', ''));

  for (const dir of dirs) {
    const filePath = join(skillsDir, dir, 'SKILL.md');
    const content = readFileSync(filePath, 'utf-8');
    const issues = [];

    const fm = parseFrontmatter(content);
    if (fm.error) {
      issues.push(`Frontmatter: ${fm.error}`);
    } else {
      for (const field of REQUIRED_SKILL_FRONTMATTER) {
        if (!fm.data[field]) {
          issues.push(`Frontmatter: missing required field '${field}'`);
        }
      }

      // Validate agent reference if present
      if (fm.data.agent) {
        const refAgent = fm.data.agent.trim();
        if (!agentNames.includes(refAgent)) {
          issues.push(`Agent reference '${refAgent}' does not match any agent file (valid: ${agentNames.length} agents)`);
        }
      }

      // Check for subagent_type references in content
      const subagentRefs = content.match(/subagent_type:\s*`?([a-z][\w-]+)`?/g) || [];
      for (const ref of subagentRefs) {
        const agent = ref.replace('subagent_type:', '').trim().replace(/`/g, '');
        if (agent.startsWith('[')) continue;
        if (!agentNames.includes(agent)) {
          issues.push(`Content references unknown agent '${agent}' via subagent_type`);
        }
      }
    }

    // Content quality checks
    const hasWorkflow = content.includes('Phase') || content.includes('## 1.') || content.includes('### Step') || content.includes('### 1.');
    if (!hasWorkflow) {
      issues.push('No structured workflow detected — skill may lack phasing');
    }

    const lines = content.split('\n').length;
    const status = issues.length === 0 ? 'PASS' : 'FAIL';
    if (status === 'PASS') passed++; else failed++;

    results.push({ file: `skills/${dir}`, status, lines, issues });
  }

  return {
    results,
    summary: { total: dirs.length, passed, failed },
    error: null,
  };
}

// ── Command Validation ──────────────────────────────────────────────────

function validateCommands() {
  const commandsDir = join(ROOT, '.opencode', 'commands');
  if (!existsSync(commandsDir)) return { error: `Commands directory not found: ${commandsDir}` };

  const files = readdirSync(commandsDir).filter(f => f.endsWith('.md') && f !== 'README.md');
  const results = [];
  let passed = 0, failed = 0;

  // Build valid skill names
  const skillNames = readdirSync(join(ROOT, '.opencode', 'skills'))
    .filter(d => statSync(join(ROOT, '.opencode', 'skills', d)).isDirectory());

  for (const file of files) {
    const filePath = join(commandsDir, file);
    const content = readFileSync(filePath, 'utf-8');
    const issues = [];

    const fm = parseFrontmatter(content);
    if (fm.error) {
      issues.push(`Frontmatter: ${fm.error}`);
    } else {
      for (const field of REQUIRED_COMMAND_FRONTMATTER) {
        if (!fm.data[field]) {
          issues.push(`Frontmatter: missing required field '${field}'`);
        }
      }

      // Validate skill reference
      if (fm.data.skill && !skillNames.includes(fm.data.skill)) {
        issues.push(`Skill reference '${fm.data.skill}' does not match any skill directory`);
      }

      // Validate category
      const validCategories = ['onboarding', 'design', 'architecture', 'stories', 'qa', 'prototyping', 'team', 'release', 'ops'];
      if (fm.data.category && !validCategories.includes(fm.data.category)) {
        issues.push(`Invalid category '${fm.data.category}'. Valid: ${validCategories.join(', ')}`);
      }
    }

    const status = issues.length === 0 ? 'PASS' : 'FAIL';
    if (status === 'PASS') passed++; else failed++;

    results.push({ file: `commands/${file}`, status, issues });
  }

  return {
    results,
    summary: { total: files.length, passed, failed },
    error: null,
  };
}

// ── Cross-Reference Validation ──────────────────────────────────────────

function validateCrossReferences() {
  const issues = [];

  // Find orphan skills (skill dirs with no SKILL.md)
  const skillsDir = join(ROOT, '.opencode', 'skills');
  if (existsSync(skillsDir)) {
    const skillDirs = readdirSync(skillsDir).filter(d => statSync(join(skillsDir, d)).isDirectory());
    for (const dir of skillDirs) {
      if (!existsSync(join(skillsDir, dir, 'SKILL.md'))) {
        issues.push(`Orphan: skills/${dir} — directory exists but no SKILL.md`);
      }
    }
  }

  // Check for README files in skills (pattern violation — skills should only have SKILL.md + assets)
  if (existsSync(skillsDir)) {
    const skillDirs = readdirSync(skillsDir).filter(d => statSync(join(skillsDir, d)).isDirectory());
    for (const dir of skillDirs) {
      const entries = readdirSync(join(skillsDir, dir));
      for (const entry of entries) {
        if (entry.toLowerCase().startsWith('readme')) {
          issues.push(`Pattern violation: skills/${dir}/${entry} — skill dirs should not contain README files`);
        }
      }
    }
  }

  return {
    results: [{ file: 'cross-references', status: issues.length === 0 ? 'PASS' : 'FAIL', issues }],
    summary: { total: 1, passed: issues.length === 0 ? 1 : 0, failed: issues.length === 0 ? 0 : 1 },
    error: null,
  };
}

// ── Output ───────────────────────────────────────────────────────────────

function generateReport(sections) {
  let report = '';
  let totalPassed = 0;
  let totalFailed = 0;
  let totalTests = 0;

  report += '# Agent Framework Validation Report\n\n';
  report += `**Date**: ${new Date().toISOString().split('T')[0]}\n\n`;
  report += '---\n\n';

  for (const section of sections) {
    const { label, result } = section;
    if (result.error) {
      report += `## ${label}: ERROR\n\n${result.error}\n\n---\n\n`;
      continue;
    }

    const { summary, results } = result;
    totalPassed += summary.passed;
    totalFailed += summary.failed;
    totalTests += summary.total;

    report += `## ${label}: ${summary.failed === 0 ? 'PASS' : 'FAIL'}\n\n`;
    report += `**Result**: ${summary.passed}/${summary.total} passed\n\n`;

    // Show only failing entries
    const failures = results.filter(r => r.status === 'FAIL');
    if (failures.length > 0) {
      report += '### Failures\n\n';
      for (const f of failures) {
        report += `- **${f.file}**\n`;
        for (const issue of (f.issues || [])) {
          report += `  - ❌ ${issue}\n`;
        }
        report += '\n';
      }
    }

    // Show exempted entries
    const exempted = results.filter(r => r.status === 'EXCEPTED');
    if (exempted.length > 0) {
      report += '### Excepted\n\n';
      report += 'These agents are in the known exceptions list (AGENT_EXCEPTIONS). They are validated but do not block CI. Remove from the exceptions list when fixed.\n\n';
      for (const e of exempted) {
        const exceptedIssues = (e.warnings || []).filter(w => w.startsWith('[EXCEPTED]'));
        report += `- **${e.file}** — intentionally incomplete (${exceptedIssues.length} gaps waived)\n`;
        for (const w of exceptedIssues) {
          report += `  - 🔶 ${w.replace('[EXCEPTED] ', '')}\n`;
        }
        report += '\n';
      }
    }

    // Show warnings
    const itemsWithWarnings = results.filter(r => (r.warnings || []).length > 0);
    if (itemsWithWarnings.length > 0) {
      report += '### Warnings\n\n';
      for (const w of itemsWithWarnings) {
        for (const warning of (w.warnings || [])) {
          report += `- ⚠️ ${w.file}: ${warning}\n`;
        }
      }
      report += '\n';
    }

    report += '---\n\n';
  }

  report += '## Overall Result\n\n';
  report += `| Category | Passed | Failed | Total |\n`;
  report += `|----------|--------|--------|-------|\n`;
  for (const section of sections) {
    const { label, result } = section;
    if (result.error) {
      report += `| ${label} | 0 | 1 (ERROR) | — |\n`;
      totalFailed++;
    } else {
      report += `| ${label} | ${result.summary.passed} | ${result.summary.failed} | ${result.summary.total} |\n`;
    }
  }
  report += `| **Total** | **${totalPassed}** | **${totalFailed}** | **${totalTests}** |\n`;
  report += `\n**Verdict**: ${totalFailed === 0 ? '✅ PASS' : '❌ FAIL'}\n`;
  report += `\n**Coverage**: ${totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : '0.0'}%\n`;

  return { report, passed: totalFailed === 0 };
}

// ── Main ─────────────────────────────────────────────────────────────────

function main() {
  console.log('🔍 Validating agent framework...\n');

  const sections = [
    { label: 'Agent Definitions', result: validateAgents() },
    { label: 'Skill Definitions', result: validateSkills() },
    { label: 'Command Definitions', result: validateCommands() },
    { label: 'Cross-References', result: validateCrossReferences() },
  ];

  const { report, passed } = generateReport(sections);

  // Print to console
  console.log(report);

  // Write report file
  const reportPath = join(ROOT, 'tests', 'agents', 'validation-report.md');
  writeFileSync(reportPath, report);
  console.log(`📄 Report saved to: tests/agents/validation-report.md`);

  if (!passed) {
    console.log('\n❌ Validation FAILED — fix the issues above before merging.');
    process.exit(1);
  }

  console.log('\n✅ All validations passed.');
  process.exit(0);
}

main();
