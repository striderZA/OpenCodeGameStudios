# Modular Framework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Partition the OCGS monolithic framework into 19 theme modules with a flat-directory registry and a `node install.mjs` CLI for add/remove/list.

**Architecture:** Module directories live under `.opencode/modules/<name>/` with a `modulefile.yaml` manifest. A single Node.js script (`install.mjs`) copies files from module directories into the working `.opencode/` tree using merge-only conflict resolution. The `core` module is always installed and never removable. Files are copied (not moved) into modules — originals remain in `.opencode/` as the "installed" state so this project continues to dogfood without changes.

**Tech Stack:** Node.js (built-ins only: `fs`, `path`, `child_process`), YAML (hand-written, no parser needed), JSON (native).

---

## Phase 1: Module Scaffolding

### Task 1: Create module directory skeleton

**Files:**
- Create: `.opencode/modules/core/modulefile.yaml`
- Create: `.opencode/modules/art/modulefile.yaml`
- Create: `.opencode/modules/design/modulefile.yaml`
- Create: `.opencode/modules/architecture/modulefile.yaml`
- Create: `.opencode/modules/stories/modulefile.yaml`
- Create: `.opencode/modules/programming/modulefile.yaml`
- Create: `.opencode/modules/ui/modulefile.yaml`
- Create: `.opencode/modules/audio/modulefile.yaml`
- Create: `.opencode/modules/narrative/modulefile.yaml`
- Create: `.opencode/modules/level-design/modulefile.yaml`
- Create: `.opencode/modules/qa/modulefile.yaml`
- Create: `.opencode/modules/release/modulefile.yaml`
- Create: `.opencode/modules/prototyping/modulefile.yaml`
- Create: `.opencode/modules/live-ops/modulefile.yaml`
- Create: `.opencode/modules/localization/modulefile.yaml`
- Create: `.opencode/modules/engine-godot/modulefile.yaml`
- Create: `.opencode/modules/engine-unity/modulefile.yaml`
- Create: `.opencode/modules/engine-unreal/modulefile.yaml`
- Create: `.opencode/modules/data/modulefile.yaml`

**Subdirs to create within each module:** `agents/`, `skills/`, `commands/`, `rules/`
**Extra subdirs for core only:** `plugins/`, `docs/`
**Extra subdirs for art only:** `mcp/`

- [ ] **Step 1: Write the module directory creator script**

```javascript
// tools/create-module-dirs.mjs
import { mkdirSync } from 'fs';
import { join } from 'path';

const MODULES = [
  { name: 'core', extra: ['plugins', 'docs'] },
  { name: 'art',  extra: ['mcp'] },
  { name: 'design' },
  { name: 'architecture' },
  { name: 'stories' },
  { name: 'programming' },
  { name: 'ui' },
  { name: 'audio' },
  { name: 'narrative' },
  { name: 'level-design' },
  { name: 'qa' },
  { name: 'release' },
  { name: 'prototyping' },
  { name: 'live-ops' },
  { name: 'localization' },
  { name: 'engine-godot' },
  { name: 'engine-unity' },
  { name: 'engine-unreal' },
  { name: 'data' },
];

const BASE = '.opencode/modules';
const SUBDIRS = ['agents', 'skills', 'commands', 'rules'];

for (const mod of MODULES) {
  const dirs = [...SUBDIRS, ...(mod.extra || [])];
  for (const sub of dirs) {
    mkdirSync(join(BASE, mod.name, sub), { recursive: true });
  }
  console.log(`Created: ${mod.name}/ (${dirs.length} subdirs)`);
}
console.log('Done.');
```

- [ ] **Step 2: Run the directory creator**

Run: `node tools/create-module-dirs.mjs`
Expected: 19 modules created with subdirectories.

- [ ] **Step 3: Commit**

```bash
git add .opencode/modules/ tools/create-module-dirs.mjs
git commit -m "feat: scaffold 19 module directories with subdirectory structure"
```

### Task 2: Write all 19 modulefile.yaml files

- [ ] **Step 1: Write core/modulefile.yaml**

```yaml
name: core
version: "0.6.0"
description: "Framework skeleton — directors, onboarding, validation, workflow foundation. Required."
depends: []
provides:
  agents: [creative-director, technical-director, producer]
  skills: [start, help, brainstorm, setup-engine, init-template, map-systems, project-stage-detect,
           gate-check, create-architecture, architecture-decision]
  commands: [start, help, brainstorm, setup-engine, init-template, map-systems, project-stage-detect,
             gate-check, create-architecture, architecture-decision]
  rules: []
  plugins: [ccgs-hooks, drift-detector, changelog-generator]
  docs: [workflow-catalog, director-gates, coordination-rules, context-management]
plugged-into:
  engines: []
```

- [ ] **Step 2: Write art/modulefile.yaml**

```yaml
name: art
version: "0.6.0"
description: "Aseprite MCP, art generation, art bible, asset specs. Visual identity and production pipeline."
depends: []
provides:
  agents: [art-director, technical-artist]
  skills: [art-bible, art-generate, asset-audit, asset-spec]
  commands: [art-generate]
  rules: []
  mcp: [aseprite]
plugged-into:
  engines: [godot]
```

- [ ] **Step 3: Write design/modulefile.yaml**

```yaml
name: design
version: "0.6.0"
description: "Game mechanics, systems design, economy, balance, playtesting analysis."
depends: []
provides:
  agents: [game-designer, systems-designer, economy-designer]
  skills: [design-system, design-review, review-all-gdds, quick-design, balance-check,
           consistency-check, content-audit, scope-check, estimate, playtest-report, team-combat]
  commands: [design-system, design-review, review-all-gdds, quick-design, team-combat]
  rules: []
plugged-into:
  engines: []
```

- [ ] **Step 4: Write architecture/modulefile.yaml**

```yaml
name: architecture
version: "0.6.0"
description: "Technical architecture planning, ADRs, control manifest, cross-document traceability."
depends: []
provides:
  agents: [lead-programmer]
  skills: [architecture-review, create-control-manifest, propagate-design-change]
  commands: [architecture-review, create-control-manifest]
  rules: [design-docs]
plugged-into:
  engines: []
```

- [ ] **Step 5: Write stories/modulefile.yaml**

```yaml
name: stories
version: "0.6.0"
description: "Epics, stories, dev implementation, code review, tech debt tracking, onboarding."
depends: []
provides:
  agents: []
  skills: [create-epics, create-stories, story-readiness, dev-story, story-done,
           code-review, tech-debt, reverse-document, adopt, onboard]
  commands: [create-epics, create-stories, story-readiness, dev-story, story-done,
             code-review, reverse-document]
  rules: []
plugged-into:
  engines: []
```

- [ ] **Step 6: Write programming/modulefile.yaml**

```yaml
name: programming
version: "0.6.0"
description: "Gameplay, AI, engine, networking, and tools programming. No skills — agents and rules only."
depends: []
provides:
  agents: [gameplay-programmer, ai-programmer, engine-programmer, network-programmer, tools-programmer]
  skills: []
  commands: []
  rules: [gameplay-code, ai-code, engine-code, network-code, shader-code]
plugged-into:
  engines: []
```

- [ ] **Step 7: Write ui/modulefile.yaml**

```yaml
name: ui
version: "0.6.0"
description: "UX design, UI programming, accessibility, HUD and menu systems."
depends: []
provides:
  agents: [ux-designer, ui-programmer, accessibility-specialist]
  skills: [team-ui, ux-design, ux-review]
  commands: [team-ui]
  rules: [ui-code]
plugged-into:
  engines: []
```

- [ ] **Step 8: Write audio/modulefile.yaml**

```yaml
name: audio
version: "0.6.0"
description: "Audio direction, sound design, music cue planning."
depends: []
provides:
  agents: [audio-director, sound-designer]
  skills: [team-audio]
  commands: [team-audio]
  rules: []
plugged-into:
  engines: []
```

- [ ] **Step 9: Write narrative/modulefile.yaml**

```yaml
name: narrative
version: "0.6.0"
description: "Story architecture, world-building, character design, dialogue."
depends: []
provides:
  agents: [narrative-director, writer, world-builder]
  skills: [team-narrative]
  commands: [team-narrative]
  rules: [narrative]
plugged-into:
  engines: []
```

- [ ] **Step 10: Write level-design/modulefile.yaml**

```yaml
name: level-design
version: "0.6.0"
description: "Level layout, encounter pacing, spatial puzzle design, environmental storytelling."
depends: []
provides:
  agents: [level-designer]
  skills: [team-level]
  commands: [team-level]
  rules: []
plugged-into:
  engines: []
```

- [ ] **Step 11: Write qa/modulefile.yaml**

```yaml
name: qa
version: "0.6.0"
description: "QA strategy, testing, bug tracking, performance profiling, security, skill validation."
depends: []
provides:
  agents: [qa-lead, qa-tester, performance-analyst, security-engineer]
  skills: [team-qa, qa-plan, smoke-check, soak-test, regression-suite, test-setup,
           test-helpers, test-flakiness, test-evidence-review, automated-smoke-test,
           bug-report, bug-triage, security-audit, perf-profile, team-polish,
           skill-test, skill-improve]
  commands: [team-qa, qa-plan, smoke-check, soak-test, regression-suite, test-setup,
             test-helpers, test-flakiness, test-evidence-review, bug-report, bug-triage,
             security-audit, team-polish]
  rules: [test-standards]
plugged-into:
  engines: []
```

- [ ] **Step 12: Write release/modulefile.yaml**

```yaml
name: release
version: "0.6.0"
description: "Release management, CI/CD, sprint planning, changelogs, hotfixes, launch readiness."
depends: []
provides:
  agents: [release-manager, devops-engineer, analytics-engineer]
  skills: [team-release, release-checklist, launch-checklist, milestone-review,
           sprint-plan, sprint-status, retrospective, changelog, patch-notes, hotfix, day-one-patch]
  commands: [team-release, release-checklist, launch-checklist, milestone-review,
             sprint-plan, sprint-status, retrospective, hotfix, day-one-patch]
  rules: []
plugged-into:
  engines: []
```

- [ ] **Step 13: Write prototyping/modulefile.yaml**

```yaml
name: prototyping
version: "0.6.0"
description: "Rapid prototyping, hybrid prototype fast-lane, pre-workflow exploration."
depends: []
provides:
  agents: [prototyper]
  skills: [prototype, hybrid-prototype, explore]
  commands: [prototype, explore]
  rules: [prototype-code]
plugged-into:
  engines: []
```

- [ ] **Step 14: Write live-ops/modulefile.yaml**

```yaml
name: live-ops
version: "0.6.0"
description: "Post-launch content strategy, seasonal events, community management."
depends: []
provides:
  agents: [live-ops-designer, community-manager]
  skills: [team-live-ops]
  commands: [team-live-ops]
  rules: []
plugged-into:
  engines: []
```

- [ ] **Step 15: Write localization/modulefile.yaml**

```yaml
name: localization
version: "0.6.0"
description: "i18n architecture, string extraction, translation pipeline, locale testing."
depends: []
provides:
  agents: [localization-lead]
  skills: [localize]
  commands: []
  rules: []
plugged-into:
  engines: []
```

- [ ] **Step 16: Write engine-godot/modulefile.yaml**

```yaml
name: engine-godot
version: "0.6.0"
description: "Godot 4 engine specialists — GDScript, C#, shaders, GDExtension."
depends: []
provides:
  agents: [godot-specialist, godot-gdscript-specialist, godot-csharp-specialist,
           godot-shader-specialist, godot-gdextension-specialist]
  skills: []
  commands: []
  rules: []
plugged-into:
  engines: [godot]
```

- [ ] **Step 17: Write engine-unity/modulefile.yaml**

```yaml
name: engine-unity
version: "0.6.0"
description: "Unity engine specialists — DOTS/ECS, shaders, Addressables, UI."
depends: []
provides:
  agents: [unity-specialist, unity-dots-specialist, unity-shader-specialist,
           unity-addressables-specialist, unity-ui-specialist]
  skills: []
  commands: []
  rules: []
plugged-into:
  engines: [unity]
```

- [ ] **Step 18: Write engine-unreal/modulefile.yaml**

```yaml
name: engine-unreal
version: "0.6.0"
description: "Unreal Engine 5 specialists — Blueprint, GAS, replication, UMG."
depends: []
provides:
  agents: [unreal-specialist, ue-blueprint-specialist, ue-gas-specialist,
           ue-replication-specialist, ue-umg-specialist]
  skills: []
  commands: []
  rules: []
plugged-into:
  engines: [unreal]
```

- [ ] **Step 19: Write data/modulefile.yaml**

```yaml
name: data
version: "0.6.0"
description: "Data file conventions and validation rules."
depends: []
provides:
  agents: []
  skills: []
  commands: []
  rules: [data-files]
plugged-into:
  engines: []
```

- [ ] **Step 20: Commit**

```bash
git add .opencode/modules/*/modulefile.yaml
git commit -m "feat: add modulefile.yaml manifests for all 19 modules"
```

---

## Phase 2: File Migration

### Task 3: Copy all agents into module homes

- [ ] **Step 1: Write the agent migration script**

```javascript
// tools/migrate-to-modules.mjs
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';

const AGENT_MAP = {
  // core
  'creative-director': 'core',
  'technical-director': 'core',
  'producer': 'core',
  // art
  'art-director': 'art',
  'technical-artist': 'art',
  // design
  'game-designer': 'design',
  'systems-designer': 'design',
  'economy-designer': 'design',
  // architecture
  'lead-programmer': 'architecture',
  // programming
  'gameplay-programmer': 'programming',
  'ai-programmer': 'programming',
  'engine-programmer': 'programming',
  'network-programmer': 'programming',
  'tools-programmer': 'programming',
  // ui
  'ux-designer': 'ui',
  'ui-programmer': 'ui',
  'accessibility-specialist': 'ui',
  // audio
  'audio-director': 'audio',
  'sound-designer': 'audio',
  // narrative
  'narrative-director': 'narrative',
  'writer': 'narrative',
  'world-builder': 'narrative',
  // level-design
  'level-designer': 'level-design',
  // qa
  'qa-lead': 'qa',
  'qa-tester': 'qa',
  'performance-analyst': 'qa',
  'security-engineer': 'qa',
  // release
  'release-manager': 'release',
  'devops-engineer': 'release',
  'analytics-engineer': 'release',
  // prototyping
  'prototyper': 'prototyping',
  // live-ops
  'live-ops-designer': 'live-ops',
  'community-manager': 'live-ops',
  // localization
  'localization-lead': 'localization',
  // engine-godot
  'godot-specialist': 'engine-godot',
  'godot-gdscript-specialist': 'engine-godot',
  'godot-csharp-specialist': 'engine-godot',
  'godot-shader-specialist': 'engine-godot',
  'godot-gdextension-specialist': 'engine-godot',
  // engine-unity
  'unity-specialist': 'engine-unity',
  'unity-dots-specialist': 'engine-unity',
  'unity-shader-specialist': 'engine-unity',
  'unity-addressables-specialist': 'engine-unity',
  'unity-ui-specialist': 'engine-unity',
  // engine-unreal
  'unreal-specialist': 'engine-unreal',
  'ue-blueprint-specialist': 'engine-unreal',
  'ue-gas-specialist': 'engine-unreal',
  'ue-replication-specialist': 'engine-unreal',
  'ue-umg-specialist': 'engine-unreal',
};

const SRC = '.opencode/agents';
const DST_BASE = '.opencode/modules';

let copied = 0;
for (const [agent, module] of Object.entries(AGENT_MAP)) {
  const src = join(SRC, `${agent}.md`);
  const dst = join(DST_BASE, module, 'agents', `${agent}.md`);
  if (!existsSync(src)) {
    console.warn(`WARN: Source not found: ${src}`);
    continue;
  }
  copyFileSync(src, dst);
  copied++;
}
console.log(`Copied ${copied} agents into module homes.`);
```

- [ ] **Step 2: Run agent migration**

Run: `node tools/migrate-to-modules.mjs`
Expected: `Copied 49 agents into module homes.`

- [ ] **Step 3: Commit**

```bash
git add .opencode/modules/*/agents/ tools/migrate-to-modules.mjs
git commit -m "feat: copy all 49 agents into module homes"
```

### Task 4: Copy all skills into module homes

- [ ] **Step 1: Extend migration script for skills**

```javascript
// Append to tools/migrate-to-modules.mjs

const SKILL_MAP = {
  // core
  'start': 'core',
  'help': 'core',
  'brainstorm': 'core',
  'setup-engine': 'core',
  'init-template': 'core',
  'map-systems': 'core',
  'project-stage-detect': 'core',
  'gate-check': 'core',
  'create-architecture': 'core',
  'architecture-decision': 'core',
  // art
  'art-bible': 'art',
  'art-generate': 'art',
  'asset-audit': 'art',
  'asset-spec': 'art',
  // design
  'design-system': 'design',
  'design-review': 'design',
  'review-all-gdds': 'design',
  'quick-design': 'design',
  'balance-check': 'design',
  'consistency-check': 'design',
  'content-audit': 'design',
  'scope-check': 'design',
  'estimate': 'design',
  'playtest-report': 'design',
  'team-combat': 'design',
  // architecture
  'architecture-review': 'architecture',
  'create-control-manifest': 'architecture',
  'propagate-design-change': 'architecture',
  // stories
  'create-epics': 'stories',
  'create-stories': 'stories',
  'story-readiness': 'stories',
  'dev-story': 'stories',
  'story-done': 'stories',
  'code-review': 'stories',
  'tech-debt': 'stories',
  'reverse-document': 'stories',
  'adopt': 'stories',
  'onboard': 'stories',
  // ui
  'team-ui': 'ui',
  'ux-design': 'ui',
  'ux-review': 'ui',
  // audio
  'team-audio': 'audio',
  // narrative
  'team-narrative': 'narrative',
  // level-design
  'team-level': 'level-design',
  // qa
  'team-qa': 'qa',
  'qa-plan': 'qa',
  'smoke-check': 'qa',
  'soak-test': 'qa',
  'regression-suite': 'qa',
  'test-setup': 'qa',
  'test-helpers': 'qa',
  'test-flakiness': 'qa',
  'test-evidence-review': 'qa',
  'automated-smoke-test': 'qa',
  'bug-report': 'qa',
  'bug-triage': 'qa',
  'security-audit': 'qa',
  'perf-profile': 'qa',
  'team-polish': 'qa',
  'skill-test': 'qa',
  'skill-improve': 'qa',
  // release
  'team-release': 'release',
  'release-checklist': 'release',
  'launch-checklist': 'release',
  'milestone-review': 'release',
  'sprint-plan': 'release',
  'sprint-status': 'release',
  'retrospective': 'release',
  'changelog': 'release',
  'patch-notes': 'release',
  'hotfix': 'release',
  'day-one-patch': 'release',
  // prototyping
  'prototype': 'prototyping',
  'hybrid-prototype': 'prototyping',
  'explore': 'prototyping',
  // live-ops
  'team-live-ops': 'live-ops',
  // localization
  'localize': 'localization',
};

const SKILL_SRC = '.opencode/skills';

for (const [skill, module] of Object.entries(SKILL_MAP)) {
  const srcDir = join(SKILL_SRC, skill);
  const dstDir = join(DST_BASE, module, 'skills', skill);
  if (!existsSync(srcDir)) {
    console.warn(`WARN: Source not found: ${srcDir}`);
    continue;
  }
  mkdirSync(dstDir, { recursive: true });
  const files = fs.readdirSync(srcDir);
  for (const file of files) {
    const src = join(srcDir, file);
    const dst = join(dstDir, file);
    copyFileSync(src, dst);
  }
  copied++;
}
console.log(`Copied ${copied} skills into module homes.`);
```

Note: requires adding `import { readdirSync } from 'fs';`

- [ ] **Step 2: Run skill migration**

Run: `node tools/migrate-to-modules.mjs`
Expected: `Copied 77 skills into module homes.`

- [ ] **Step 3: Commit**

```bash
git add .opencode/modules/*/skills/
git commit -m "feat: copy all 77 skills into module homes"
```

### Task 5: Copy all commands into module homes

- [ ] **Step 1: Extend migration script for commands**

```javascript
// Append to tools/migrate-to-modules.mjs

const COMMAND_MAP = {
  // core
  'start': 'core',
  'help': 'core',
  'brainstorm': 'core',
  'setup-engine': 'core',
  'init-template': 'core',
  'map-systems': 'core',
  'project-stage-detect': 'core',
  'gate-check': 'core',
  'create-architecture': 'core',
  'architecture-decision': 'core',
  // art
  'art-generate': 'art',
  // design
  'design-system': 'design',
  'design-review': 'design',
  'review-all-gdds': 'design',
  'quick-design': 'design',
  'team-combat': 'design',
  // architecture
  'architecture-review': 'architecture',
  'create-control-manifest': 'architecture',
  // stories
  'create-epics': 'stories',
  'create-stories': 'stories',
  'story-readiness': 'stories',
  'dev-story': 'stories',
  'story-done': 'stories',
  'code-review': 'stories',
  'reverse-document': 'stories',
  // ui
  'team-ui': 'ui',
  // audio
  'team-audio': 'audio',
  // narrative
  'team-narrative': 'narrative',
  // level-design
  'team-level': 'level-design',
  // qa
  'team-qa': 'qa',
  'qa-plan': 'qa',
  'smoke-check': 'qa',
  'soak-test': 'qa',
  'regression-suite': 'qa',
  'test-setup': 'qa',
  'test-helpers': 'qa',
  'test-flakiness': 'qa',
  'test-evidence-review': 'qa',
  'bug-report': 'qa',
  'bug-triage': 'qa',
  'security-audit': 'qa',
  'team-polish': 'qa',
  // release
  'team-release': 'release',
  'release-checklist': 'release',
  'launch-checklist': 'release',
  'milestone-review': 'release',
  'sprint-plan': 'release',
  'sprint-status': 'release',
  'retrospective': 'release',
  'hotfix': 'release',
  'day-one-patch': 'release',
  // prototyping
  'prototype': 'prototyping',
  'explore': 'prototyping',
};

const CMD_SRC = '.opencode/commands';

for (const [cmd, module] of Object.entries(COMMAND_MAP)) {
  const src = join(CMD_SRC, `${cmd}.md`);
  const dst = join(DST_BASE, module, 'commands', `${cmd}.md`);
  if (!existsSync(src)) {
    console.warn(`WARN: Source not found: ${src}`);
    continue;
  }
  copyFileSync(src, dst);
  copied++;
}
console.log(`Copied ${copied} commands into module homes.`);
```

Note: the `copyFileSync` and `existsSync` `mkdirSync` imports need to be at the top of the script.

- [ ] **Step 2: Run command migration**

Run: `node tools/migrate-to-modules.mjs`
Expected: `Copied 52 commands into module homes.`

- [ ] **Step 3: Commit**

```bash
git add .opencode/modules/*/commands/
git commit -m "feat: copy all 52 commands into module homes"
```

### Task 6: Copy rules and plugins/docs into module homes

- [ ] **Step 1: Extend migration for rules**

```javascript
// Append to tools/migrate-to-modules.mjs

const RULE_MAP = {
  'design-docs': 'architecture',
  'gameplay-code': 'programming',
  'ai-code': 'programming',
  'engine-code': 'programming',
  'network-code': 'programming',
  'shader-code': 'programming',
  'ui-code': 'ui',
  'narrative': 'narrative',
  'test-standards': 'qa',
  'prototype-code': 'prototyping',
  'data-files': 'data',
};

const RULE_SRC = '.opencode/rules';

for (const [rule, module] of Object.entries(RULE_MAP)) {
  const src = join(RULE_SRC, `${rule}.md`);
  const dst = join(DST_BASE, module, 'rules', `${rule}.md`);
  if (!existsSync(src)) {
    console.warn(`WARN: Source not found: ${src}`);
    continue;
  }
  copyFileSync(src, dst);
  copied++;
}
console.log(`Copied ${copied} rules into module homes.`);
```

- [ ] **Step 2: Copy core plugins and docs**

```bash
node -e "
const fs = require('fs');
// plugins
for (const f of fs.readdirSync('.opencode/plugins').filter(f => f.endsWith('.ts'))) {
  fs.copyFileSync('.opencode/plugins/' + f, '.opencode/modules/core/plugins/' + f);
}
// docs
for (const f of ['workflow-catalog.yaml', 'director-gates.md', 'coordination-rules.md', 'context-management.md']) {
  fs.copyFileSync('.opencode/docs/' + f, '.opencode/modules/core/docs/' + f);
}
console.log('Done.');
"
```

- [ ] **Step 3: Create aseprite MCP fragment**

```json
// .opencode/modules/art/mcp/aseprite.json
{
  "aseprite": {
    "type": "local",
    "command": ["uv", "--directory", "tools/aseprite-mcp", "run", "-m", "aseprite_mcp"],
    "enabled": true,
    "environment": {
      "ASEPRITE_PATH": "{env:ASEPRITE_PATH}"
    }
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add .opencode/modules/*/rules/ .opencode/modules/core/plugins/ .opencode/modules/core/docs/ .opencode/modules/art/mcp/
git commit -m "feat: copy rules, plugins, docs, and MCP fragments into module homes"
```

---

## Phase 3: CLI

### Task 7: Build install.mjs — core module + argument parsing

**Files:**
- Create: `.opencode/modules/install.mjs`

- [ ] **Step 1: Write the argument parser and help text**

```javascript
#!/usr/bin/env node
// .opencode/modules/install.mjs
// OCGS Module CLI — install, remove, and list framework modules.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { copyFileSync, readdirSync, statSync, rmSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OPC = join(__dirname, '..', '..');
const MODULES_DIR = __dirname;
const INSTALLED_PATH = join(MODULES_DIR, 'installed.json');

function usage() {
  console.log([
    'Usage: node .opencode/modules/install.mjs <command> [args]',
    '',
    'Commands:',
    '  list                  Show all modules: installed, available, version',
    '  info <name>           Show modulefile.yaml details for a module',
    '  add <name...>         Install one or more modules',
    '  remove <name>         Remove a module (core is protected)',
    '',
    'Examples:',
    '  node .opencode/modules/install.mjs add art testing',
    '  node .opencode/modules/install.mjs list',
    '  node .opencode/modules/install.mjs remove combat',
  ].join('\n'));
}

const [,, verb, ...args] = process.argv;

if (!verb) { usage(); process.exit(1); }

// Determine project root (where .opencode lives)
const PROJ = join(MODULES_DIR, '..', '..');

// ... (subsequent steps fill in the handlers)
```

- [ ] **Step 2: Implement list command**

```javascript
if (verb === 'list') {
  const installed = existsSync(INSTALLED_PATH)
    ? JSON.parse(readFileSync(INSTALLED_PATH, 'utf8'))
    : {};

  const available = readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && existsSync(join(MODULES_DIR, d.name, 'modulefile.yaml')))
    .map(d => d.name);

  console.log('%-20s  %-10s  %s', 'MODULE', 'VERSION', 'STATUS');
  console.log('-'.repeat(50));

  for (const name of available.sort()) {
    const installedVer = installed[name]?.version || '—';
    const status = installed[name] ? 'installed' : 'available';
    console.log('%-20s  %-10s  %s', name, installedVer, status);
  }
}
```

- [ ] **Step 3: Implement info command**

```javascript
else if (verb === 'info') {
  const name = args[0];
  if (!name) { console.error('Usage: install.mjs info <name>'); process.exit(1); }
  const mf = join(MODULES_DIR, name, 'modulefile.yaml');
  if (!existsSync(mf)) { console.error(`Module not found: ${name}`); process.exit(1); }
  console.log(readFileSync(mf, 'utf8'));
}
```

- [ ] **Step 4: Write `readModulefile` helper**

```javascript
function readModulefile(name) {
  const mfPath = join(MODULES_DIR, name, 'modulefile.yaml');
  if (!existsSync(mfPath)) return null;
  const raw = readFileSync(mfPath, 'utf8');
  const out = {};
  // Simple YAML parser for our constrained format
  const lines = raw.split('\n');
  let currentKey = null;
  let isList = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const listMatch = trimmed.match(/^\s*-\s+(.+)/);
    if (listMatch && currentKey) {
      if (!out[currentKey]) out[currentKey] = [];
      out[currentKey].push(listMatch[1].trim());
      continue;
    }

    // Handle flows: [a, b, c]
    const flowMatch = trimmed.match(/^(\w+):\s*\[(.*)\]$/);
    if (flowMatch) {
      out[flowMatch[1]] = flowMatch[2]
        ? flowMatch[2].split(',').map(s => s.trim()).filter(Boolean)
        : [];
      currentKey = flowMatch[1];
      continue;
    }

    // Handle nested key: value
    const nestedMatch = trimmed.match(/^\s+(\w+):\s*\[(.*)\]$/);
    if (nestedMatch && currentKey) {
      if (typeof out[currentKey] !== 'object' || Array.isArray(out[currentKey])) {
        out[currentKey] = {};
      }
      out[currentKey][nestedMatch[1]] = nestedMatch[2]
        ? nestedMatch[2].split(',').map(s => s.trim()).filter(Boolean)
        : [];
      continue;
    }

    const kvMatch = trimmed.match(/^(\w+):\s*"?(.*?)"?$/);
    if (kvMatch) {
      const key = kvMatch[1];
      const val = kvMatch[2]?.replace(/"/g, '') || '';
      if (val === '') {
        currentKey = key;
        out[key] = null;
      } else {
        out[key] = val;
        currentKey = key;
      }
    }
  }
  return out;
}
```

- [ ] **Step 5: Commit**

```bash
git add .opencode/modules/install.mjs
git commit -m "feat: add install.mjs CLI shell with list, info, and argument parsing"
```

### Task 8: Build install.mjs — add command

- [ ] **Step 1: Implement add command with merge-only copy logic**

```javascript
else if (verb === 'add') {
  if (args.length === 0) { console.error('Usage: install.mjs add <module...>'); process.exit(1); }

  const installed = existsSync(INSTALLED_PATH)
    ? JSON.parse(readFileSync(INSTALLED_PATH, 'utf8'))
    : {};

  for (const name of args) {
    const mf = readModulefile(name);
    if (!mf) { console.error(`Module not found: ${name}`); continue; }

    // Check depends
    if (mf.depends && mf.depends.length > 0) {
      for (const dep of mf.depends) {
        const depName = dep.replace(/>=.*/, '');
        if (!installed[depName]) {
          console.error(`Dependency not installed: ${dep} (needed by ${name})`);
          process.exit(1);
        }
      }
    }

    // Prevent re-install
    if (installed[name]) {
      console.log(`[SKIP] ${name} (already installed v${installed[name].version})`);
      continue;
    }

    const moduleDir = join(MODULES_DIR, name);
    const subdirs = readdirSync(moduleDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .filter(s => s !== '.' && s !== '..');

    const files = [];
    let added = 0, skipped = 0;

    for (const sub of subdirs) {
      const srcDir = join(moduleDir, sub);
      const dstDir = join(PROJ, '.opencode', sub);
      mkdirSync(dstDir, { recursive: true });
      copyDir(srcDir, dstDir, PROJ, { added: 0, skipped: 0 }, (s) => { added += s.added; skipped += s.skipped; collectFiles(s.files, files, sub); });
    }

    // MCP fragments
    const mcpDir = join(moduleDir, 'mcp');
    if (existsSync(mcpDir)) {
      mergeMcpFragments(mcpDir, PROJ);
    }

    // Record in installed.json
    installed[name] = {
      version: mf.version || '0.6.0',
      installed_at: new Date().toISOString(),
      files,
    };

    console.log(`Added ${name} (${added} files, ${skipped > 0 ? `${skipped} skipped ` : ''})`);
  }

  writeFileSync(INSTALLED_PATH, JSON.stringify(installed, null, 2), 'utf8');
}
```

- [ ] **Step 2: Add post-install validation helper**

```javascript
import { spawnSync } from 'child_process';

function runValidate(projRoot) {
  const validatePath = join(projRoot, 'tests', 'agents', 'validate.mjs');
  if (!existsSync(validatePath)) {
    console.log('[INFO] Validation script not found — skipping integrity check.');
    return;
  }
  console.log('[INFO] Running agent framework validation...');
  const result = spawnSync('node', [validatePath], { cwd: projRoot, timeout: 30000 });
  if (result.status === 0) {
    console.log('[PASS] Framework validation passed.');
  } else {
    console.log('[WARN] Framework validation returned non-zero. Run `node tests/agents/validate.mjs` for details.');
  }
}
```

Call `runValidate(PROJ)` at the end of both the `add` and `remove` command handlers.

- [ ] **Step 3: Implement recursive copyDir helper**

```javascript
function copyDir(src, dst, projRoot, counts, onDone) {
  const entries = readdirSync(src, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const dstPath = join(dst, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, dstPath, projRoot, counts, (subFiles) => {
        files.push(...subFiles);
      });
    } else {
      const relPath = join(dst, entry.name).replace(projRoot + '/', '').replace(/\\/g, '/');
      files.push(relPath);

      if (existsSync(dstPath)) {
        counts.skipped++;
        console.log(`[SKIP] ${relPath} (already present)`);
      } else {
        mkdirSync(dirname(dstPath), { recursive: true });
        copyFileSync(srcPath, dstPath);
        counts.added++;
        console.log(`[ADD ] ${relPath}`);
      }
    }
  }

  if (onDone) onDone(files);
  return files;
}

function collectFiles(files, target, subdir) {
  for (const f of files) {
    target.push(f);
  }
}
```

- [ ] **Step 3: Implement MCP merge helper**

```javascript
function mergeMcpFragments(mcpDir, projRoot) {
  const opencodePath = join(projRoot, 'opencode.json');
  if (!existsSync(opencodePath)) {
    console.log('[WARN] opencode.json not found, skipping MCP merge');
    return;
  }

  const config = JSON.parse(readFileSync(opencodePath, 'utf8'));
  if (!config.mcp) config.mcp = {};

  const fragments = readdirSync(mcpDir).filter(f => f.endsWith('.json'));
  for (const frag of fragments) {
    const fragData = JSON.parse(readFileSync(join(mcpDir, frag), 'utf8'));
    for (const [server, serverConfig] of Object.entries(fragData)) {
      if (config.mcp[server]) {
        console.log(`[SKIP] MCP server '${server}' already configured`);
      } else {
        config.mcp[server] = serverConfig;
        console.log(`[MCP ] Added server '${server}'`);
      }
    }
  }

  writeFileSync(opencodePath, JSON.stringify(config, null, 2) + '\n', 'utf8');
}
```

- [ ] **Step 5: Commit**

```bash
git add .opencode/modules/install.mjs
git commit -m "feat: implement add command — recursive copy, merge-only, MCP fragment merge"
```

### Task 9: Build install.mjs — remove command

- [ ] **Step 1: Implement remove command**

```javascript
else if (verb === 'remove') {
  const name = args[0];
  if (!name) { console.error('Usage: install.mjs remove <name>'); process.exit(1); }
  if (name === 'core') { console.error('Cannot remove core module.'); process.exit(1); }

  const installed = existsSync(INSTALLED_PATH)
    ? JSON.parse(readFileSync(INSTALLED_PATH, 'utf8'))
    : {};

  if (!installed[name]) {
    console.error(`Module not installed: ${name}`);
    process.exit(1);
  }

  // Check reverse dependencies
  for (const [depName, depInfo] of Object.entries(depends)) {
    // Actually, depends are checked from modulefile manifests, not from installed.json
  }

  // Simplified for initial release: just check if any installed module declares a dep on this one
  const deps = checkReverseDeps(name, installed);
  if (deps.length > 0) {
    console.error(`Cannot remove ${name}: required by ${deps.join(', ')}`);
    process.exit(1);
  }

  const modData = installed[name];
  let removed = 0, kept = 0;

  for (const relPath of modData.files || []) {
    const installedPath = join(PROJ, relPath);
    if (!existsSync(installedPath)) continue;

    // Compare against canonical in module directory
    const modulePath = installedPath.replace(
      join(PROJ, '.opencode'),
      join(MODULES_DIR, name)
    );

    if (!existsSync(modulePath)) {
      // Can't compare — file doesn't exist in module source (edge case)
      console.log(`[KEEP] ${relPath} (no source to compare)`);
      kept++;
      continue;
    }

    const installedContent = readFileSync(installedPath);
    const moduleContent = readFileSync(modulePath);

    if (Buffer.compare(installedContent, moduleContent) === 0) {
      rmSync(installedPath);
      console.log(`[DEL ] ${relPath}`);
      removed++;
    } else {
      console.log(`[KEEP] ${relPath} (modified by user)`);
      kept++;
    }
  }

  // Remove MCP servers
  removeMcpServers(name, PROJ);

  delete installed[name];
  writeFileSync(INSTALLED_PATH, JSON.stringify(installed, null, 2), 'utf8');

  console.log(`Removed ${name} (${removed} deleted, ${kept} kept).`);
}
```

- [ ] **Step 2: Implement checkReverseDeps**

```javascript
function checkReverseDeps(name, installed) {
  const deps = [];
  for (const [modName, modData] of Object.entries(installed)) {
    if (modName === name || modName === 'core') continue;
    const mf = readModulefile(modName);
    if (mf && mf.depends) {
      for (const dep of mf.depends) {
        const depName = dep.replace(/>=.*/, '');
        if (depName === name) deps.push(modName);
      }
    }
  }
  return deps;
}
```

- [ ] **Step 3: Implement removeMcpServers**

```javascript
function removeMcpServers(name, projRoot) {
  const mf = readModulefile(name);
  if (!mf || !mf.mcp || mf.mcp.length === 0) return;

  const opencodePath = join(projRoot, 'opencode.json');
  if (!existsSync(opencodePath)) return;

  const config = JSON.parse(readFileSync(opencodePath, 'utf8'));
  if (!config.mcp) return;

  let removed = false;
  for (const server of mf.mcp) {
    if (config.mcp[server]) {
      delete config.mcp[server];
      console.log(`[MCP ] Removed server '${server}'`);
      removed = true;
    }
  }

  if (removed) {
    writeFileSync(opencodePath, JSON.stringify(config, null, 2) + '\n', 'utf8');
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add .opencode/modules/install.mjs
git commit -m "feat: implement remove command — safe delete, user-modified files kept"
```

### Task 10: Create initial installed.json template and test

- [ ] **Step 1: Create installed.json declaring all modules as installed**

This marks the current monolith state as "all modules installed" during the migration period.

```javascript
// tools/seed-installed.mjs
import { writeFileSync, readFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MODULES_DIR = join(ROOT, '.opencode', 'modules');
const OPC = join(ROOT, '.opencode');
const INSTALLED_PATH = join(MODULES_DIR, 'installed.json');

const installed = {};

function collectFiles(dir, base) {
  const files = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(full, base));
    } else {
      files.push(full.replace(base + '/', '').replace(base + '\\', '').replace(/\\/g, '/'));
    }
  }
  return files;
}

// List modules
const modules = readdirSync(MODULES_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory() && existsSync(join(MODULES_DIR, d.name, 'modulefile.yaml')))
  .map(d => d.name);

for (const name of modules) {
  // Read version from modulefile
  const mfRaw = readFileSync(join(MODULES_DIR, name, 'modulefile.yaml'), 'utf8');
  const verMatch = mfRaw.match(/^version:\s*"?(.*?)"?$/m);
  const version = verMatch ? verMatch[1] : '0.6.0';

  // Collect files currently present in .opencode/ that map to this module
  const moduleDir = join(MODULES_DIR, name);

  installed[name] = {
    version,
    installed_at: new Date().toISOString(),
    files: [],
  };
}

writeFileSync(INSTALLED_PATH, JSON.stringify(installed, null, 2), 'utf8');
console.log(`Seeded installed.json with ${modules.length} modules.`);
```

Note: this seed script doesn't know which files in `.opencode/` correspond to which module. For the migration period, it uses empty file lists. Fully accurate file tracking will come when real installs/removes happen.

Actually, let me seed it properly — collect files from the module directory itself, since those are the canonical sources. For the installed state, we can collect files from `.opencode/` that match what's in each module.

Let me update the script:

```javascript
// tools/seed-installed.mjs
import { writeFileSync, readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MODULES_DIR = join(ROOT, '.opencode', 'modules');
const OPC = join(ROOT, '.opencode');
const INSTALLED_PATH = join(MODULES_DIR, 'installed.json');

const installed = {};

function collectRelFiles(dir, basePath) {
  const files = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectRelFiles(full, basePath));
    } else {
      files.push(full.replace(basePath, '').replace(/\\/g, '/').replace(/^\//, ''));
    }
  }
  return files;
}

const modules = readdirSync(MODULES_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory() && existsSync(join(MODULES_DIR, d.name, 'modulefile.yaml')))
  .map(d => d.name);

for (const name of modules) {
  const mfRaw = readFileSync(join(MODULES_DIR, name, 'modulefile.yaml'), 'utf8');
  const verMatch = mfRaw.match(/^version:\s*"?(.*?)"?$/m);
  const version = verMatch ? verMatch[1] : '0.6.0';

  const moduleDir = join(MODULES_DIR, name);
  const subdirs = readdirSync(moduleDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name !== 'mcp' && d.name !== 'modulefile.yaml')
    .map(d => d.name);

  const files = [];
  for (const sub of subdirs) {
    const srcDir = join(moduleDir, sub);
    const installedDir = join(OPC, sub);
    if (!existsSync(installedDir)) continue;
    const relFiles = collectRelFiles(join(moduleDir, sub), moduleDir);
    for (const f of relFiles) {
      // The installed path maps to .opencode/<sub>/<f> which is <sub>/<f> from module perspective
      files.push(f);
    }
  }

  installed[name] = { version, installed_at: new Date().toISOString(), files };
}

writeFileSync(INSTALLED_PATH, JSON.stringify(installed, null, 2), 'utf8');
console.log(`Seeded installed.json with ${Object.keys(installed).length} modules.`);
```

Wait, this is getting too complex for a plan step. Let me simplify: for the seed, we just check if `.opencode/<sub>/<filename>` exists for every file in the module. If yes, add it to the tracked files list. The files are "installed" because we copied them into modules from the live state.

Actually, let me just keep it simple. In the migration phase, we create `installed.json` with all 19 modules marked as installed but with empty file lists initially. The first real `add` or `remove` operation will populate accurate file lists. For now, the fact that modules are marked "installed" in installed.json is enough for `list` and `info` to work, and `remove` will do byte-for-byte comparisons against module sources.

Let me simplify the seed script.

Hmm, actually this is getting too detailed for every tiny step. Let me write a simpler plan for the seed step.

- [ ] **Step 1: Write seed script**

```javascript
// tools/seed-installed.mjs
import { writeFileSync, readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MODULES_DIR = join(ROOT, '.opencode', 'modules');
const INSTALLED_PATH = join(MODULES_DIR, 'installed.json');

// During migration, seed installed.json with all modules installed (empty file lists)
// Full file tracking is populated on real install/remove operations
const installed = {};
const modules = readdirSync(MODULES_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory() && existsSync(join(MODULES_DIR, d.name, 'modulefile.yaml')))
  .map(d => d.name);

for (const name of modules) {
  const mfRaw = readFileSync(join(MODULES_DIR, name, 'modulefile.yaml'), 'utf8');
  const verMatch = mfRaw.match(/^version:\s*"?(.*?)"?$/m);
  const version = verMatch ? verMatch[1] : '0.6.0';
  installed[name] = { version, installed_at: new Date().toISOString(), files: [] };
}

writeFileSync(INSTALLED_PATH, JSON.stringify(installed, null, 2), 'utf8');
console.log(`Seeded installed.json with ${Object.keys(installed).length} modules.`);
```

- [ ] **Step 2: Run seed**

Run: `node tools/seed-installed.mjs`
Expected: `Seeded installed.json with 19 modules.`

- [ ] **Step 3: Test list command**

Run: `node .opencode/modules/install.mjs list`
Expected: Table showing all 19 modules with version 0.6.0, all "installed".

- [ ] **Step 4: Commit**

```bash
git add .opencode/modules/installed.json tools/seed-installed.mjs
git commit -m "feat: seed installed.json with all 19 modules for migration phase"
```

---

## Phase 4: Integration

### Task 11: Update init-template skill to use modular install

**Files:**
- Modify: `.opencode/skills/init-template/SKILL.md`

- [ ] **Step 1: Read current init-template skill**

```bash
cat .opencode/skills/init-template/SKILL.md
```

- [ ] **Step 2: Add module installation step after project identity setup**

Find the section where project identity is configured (title, engine), and add after it:

```markdown
### Modular Installation

After setting project identity, install the desired framework modules:

```bash
# Always install the core module first
node .opencode/modules/install.mjs add core

# Install the engine module matching your engine choice
node .opencode/modules/install.mjs add engine-godot  # or engine-unity, engine-unreal

# Optionally install domain modules
node .opencode/modules/install.mjs add art design ui qa release prototyping
```

Available modules (run `node .opencode/modules/install.mjs list` to see all):

| Module | Description |
|--------|-------------|
| `core` | Framework skeleton (required) |
| `art` | Aseprite MCP, art generation, art bible |
| `design` | Game mechanics, systems design, combat |
| `architecture` | Technical planning, ADRs |
| `stories` | Epics, stories, dev workflow, code review |
| `programming` | Gameplay, AI, engine, network agents + rules |
| `ui` | UX design, UI programming, accessibility |
| `audio` | Audio direction, sound design |
| `narrative` | Story, world-building, dialogue |
| `level-design` | Level layout, encounter design |
| `qa` | Testing strategy, bug tracking, profiling |
| `release` | Release management, sprints, changelogs |
| `prototyping` | Rapid prototyping, exploration |
| `live-ops` | Post-launch content, community |
| `localization` | i18n, translation pipeline |
| `engine-godot` | Godot 4 specialists |
| `engine-unity` | Unity specialists |
| `engine-unreal` | Unreal Engine 5 specialists |
| `data` | Data file conventions |
```

- [ ] **Step 3: Verify init-template still works end-to-end**

In a temp directory, test the full init flow:
```bash
mkdir /tmp/test-modular-init && cd /tmp/test-modular-init
# Run init-template steps manually and verify install.mjs works
```

- [ ] **Step 4: Commit**

```bash
git add .opencode/skills/init-template/SKILL.md
git commit -m "feat: update init-template to use modular install.mjs"
```

### Task 12: Update CI validation to check module integrity

**Files:**
- Modify: `.github/workflows/agent-validation.yml`

- [ ] **Step 1: Add module validation job to CI**

```yaml
  validate-modules:
    runs-on: ubuntu-latest
    name: Module Integrity
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: recursive
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Validate module structure
        run: node tests/modules/validate-modules.mjs
```

- [ ] **Step 2: Write module validation script**

```javascript
// tests/modules/validate-modules.mjs
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const MODULES_DIR = join(ROOT, '.opencode', 'modules');
const OPC = join(ROOT, '.opencode');

let failures = 0;

// Parse modulefile.yaml (simple)
function parseYaml(path) {
  const raw = readFileSync(path, 'utf8');
  const out = {};
  const lines = raw.split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const listMatch = t.match(/^\s*-\s+(.+)/);
    if (listMatch) {
      const key = Object.keys(out).pop();
      if (!Array.isArray(out[key])) out[key] = [];
      out[key].push(listMatch[1].trim());
      continue;
    }
    const flowMatch = t.match(/^(\w+):\s*\[(.*)\]$/);
    if (flowMatch) {
      out[flowMatch[1]] = flowMatch[2].split(',').map(s => s.trim()).filter(Boolean);
      continue;
    }
    const kvMatch = t.match(/^(\w+):\s*"?(.*?)"?$/);
    if (kvMatch) {
      out[kvMatch[1]] = kvMatch[2]?.replace(/"/g, '') || '';
    }
  }
  return out;
}

const modules = readdirSync(MODULES_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory() && !d.name.startsWith('.'));

console.log(`Validating ${modules.length} modules...\n`);

for (const mod of modules) {
  const modDir = join(MODULES_DIR, mod.name);
  const mfPath = join(modDir, 'modulefile.yaml');

  if (!existsSync(mfPath)) {
    console.log(`FAIL ${mod.name}: missing modulefile.yaml`);
    failures++;
    continue;
  }

  const mf = parseYaml(mfPath);
  if (!mf.name || mf.name !== mod.name) {
    console.log(`FAIL ${mod.name}: name mismatch in modulefile.yaml`);
    failures++;
    continue;
  }

  // Check provides exist
  const categories = { agents: 'agents', skills: 'skills', commands: 'commands', rules: 'rules' };
  for (const [key, dir] of Object.entries(categories)) {
    const items = mf[key] || [];
    for (const item of items) {
      let path;
      if (key === 'skills') {
        path = join(modDir, dir, item, 'SKILL.md');
      } else {
        path = join(modDir, dir, `${item}.md`);
      }
      if (!existsSync(path)) {
        console.log(`FAIL ${mod.name}: ${key}/${item} declared but not found at ${path}`);
        failures++;
      }
    }
  }
}

if (failures === 0) {
  console.log(`PASS: all ${modules.length} modules valid.`);
  process.exit(0);
} else {
  console.log(`\nFAIL: ${failures} validation error(s).`);
  process.exit(1);
}
```

- [ ] **Step 3: Test validation locally**

Run: `node tests/modules/validate-modules.mjs`
Expected: `PASS: all 19 modules valid.` or report failures with exact paths.

- [ ] **Step 4: Commit**

```bash
git add tests/modules/validate-modules.mjs .github/workflows/agent-validation.yml
git commit -m "feat: add module integrity validation to CI pipeline"
```

### Task 13: End-to-end test — fresh install

- [ ] **Step 1: Test core-only install**

```bash
# In a temp directory
mkdir /tmp/ocgs-test && cd /tmp/ocgs-test
cp -r .opencode/modules /tmp/ocgs-test/modules-test
node modules-test/install.mjs add core
node modules-test/install.mjs list
```

Expected: core shows as "installed", all others show as "available".

- [ ] **Step 2: Test core + art install**

```bash
node modules-test/install.mjs add art
# Verify .opencode/agents/ contains art-director.md and technical-artist.md
ls .opencode/agents/art-director.md .opencode/agents/technical-artist.md
```

Expected: files exist.

- [ ] **Step 3: Test re-add (should skip)**

```bash
node modules-test/install.mjs add art
```

Expected: `[SKIP] art (already installed v0.6.0)`

- [ ] **Step 4: Test remove (modified file kept)**

```bash
echo "// user edit" >> .opencode/agents/art-director.md
node modules-test/install.mjs remove art
```

Expected: `[KEEP] agents/art-director.md (modified by user)`, other art files deleted.

- [ ] **Step 5: Test remove blocked by dependency**

Create a test module with a `depends: [art]` declaration, install it, then try to remove art:

```bash
mkdir -p /tmp/ocgs-test/.opencode/modules/test-dep
cat > /tmp/ocgs-test/.opencode/modules/test-dep/modulefile.yaml << 'EOF'
name: test-dep
version: "0.1.0"
description: "Test module that depends on art"
depends: [art]
provides:
  agents: []
  skills: []
  commands: []
  rules: []
plugged-into:
  engines: []
EOF
cd /tmp/ocgs-test
node modules-test/install.mjs add test-dep
node modules-test/install.mjs remove art
```

Expected: `Cannot remove art: required by test-dep`

- [ ] **Step 6: Test MCP merge**

```bash
node modules-test/install.mjs add art
# Verify opencode.json has aseprite MCP entry
cat opencode.json | grep aseprite
```

Expected: aseprite MCP config present.

- [ ] **Step 7: Run full agent validation after module operations**

```bash
node tests/agents/validate.mjs
```

Expected: still PASS (all 49 agents, 77 skills, 52 commands valid).

- [ ] **Step 8: Commit any fixes**

```bash
git add -A && git commit -m "fix: end-to-end test fixes for module CLI"
```

---

## Phase 5: Documentation & Cleanup

### Task 14: Update AGENTS.md with modular framework reference

- [ ] **Step 1: Add modular framework section to AGENTS.md**

Add after the project structure section:

```markdown
## Modular Framework

This project uses theme modules. Not every project needs every module.

**Core (always installed):** creative-director, technical-director, producer, /start,
/help, /brainstorm, /setup-engine, validation suite.

**Available modules:** art, design, architecture, stories, programming, ui, audio,
narrative, level-design, qa, release, prototyping, live-ops, localization, data,
engine-godot, engine-unity, engine-unreal.

**Install a module:** `node .opencode/modules/install.mjs add <name>`
**Remove a module:** `node .opencode/modules/install.mjs remove <name>`
**List modules:** `node .opencode/modules/install.mjs list`
```

- [ ] **Step 2: Commit**

```bash
git add AGENTS.md
git commit -m "docs: add modular framework reference to AGENTS.md"
```

---

## Summary

| Phase | Tasks | Files |
|-------|-------|-------|
| 1: Scaffolding | 2 | 19 module dirs, 19 modulefile.yaml |
| 2: Migration | 4 | 49 agents, 77 skills, 52 commands, 11 rules, 3 plugins, 4 docs, 1 MCP fragment |
| 3: CLI | 4 | `install.mjs` (add/remove/list/info) |
| 4: Integration | 3 | init-template, CI, end-to-end tests |
| 5: Docs | 1 | AGENTS.md |

**Critical invariant:** Files are COPIED into modules, not MOVED. The `.opencode/` working tree remains functional for this project. Module directories are the canonical source-of-truth for distribution via `install.mjs`.
