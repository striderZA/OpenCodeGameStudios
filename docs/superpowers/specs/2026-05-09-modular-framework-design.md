# Modular Framework Design

**Status:** Approved
**Date:** 2026-05-09
**Context:** OCGS v0.6.0 framework is monolithic — 49 agents, 77 skills, 52 commands, 3 plugins, 11 rules, all installed together. Users who only need art tools get the entire combat, narrative, live-ops, and localization machinery. This design partitions the framework into independently installable theme modules with a single-repo CLI installer.

---

## Architecture Decision

Approach A: Flat module directories + CLI installer. Modules live as `.opencode/modules/<name>/` directories. A single Node.js script (`install.mjs`) copies files from module directories into the working `.opencode/` tree. No external registry, no branch proliferation, no npm dependencies beyond Node.js built-ins. Files stay in one repo on trunk. Merge-only conflict resolution — add new files, skip existing ones, warn on overlap.

Alternatives considered:
- **B) Module branches + git archive:** Too many branches; breaks trunk-based workflow.
- **C) npm-scoped packages:** External registry overhead; version bumps for every file change; unnecessary for text-file copying.

---

## Module Layout

```
.opencode/modules/
  install.mjs                  CLI: module add/remove/list
  installed.json               Manifest of what's installed (tracked per module)
  core/                        Always installed, never removable
    modulefile.yaml
    agents/                    creative-director, technical-director, producer
    skills/                    start, help, brainstorm, setup-engine, init-template,
                               map-systems, project-stage-detect, gate-check,
                               create-architecture, architecture-decision
    commands/                  (mirrors skills above)
    plugins/                   ccgs-hooks.ts, drift-detector.ts, changelog-generator.ts
    docs/                      workflow-catalog.yaml, director-gates.md,
                               coordination-rules.md, context-management.md
  art/
    modulefile.yaml
    agents/                    art-director, technical-artist
    skills/                    art-bible, art-generate, asset-audit, asset-spec
    commands/                  art-bible, art-generate, asset-audit, asset-spec
    rules/                     asset-naming
    mcp/                       aseprite.json
  design/
    modulefile.yaml
    agents/                    game-designer, systems-designer, economy-designer
    skills/                    design-system, design-review, review-all-gdds,
                               quick-design, balance-check, consistency-check,
                               content-audit, scope-check, estimate, playtest-report
    commands/                  (mirrors skills above)
  architecture/
    modulefile.yaml
    agents/                    lead-programmer
    skills/                    architecture-review, create-control-manifest, propagate-design-change
    commands/                  (mirrors above)
    rules/                     design-docs
  stories/
    modulefile.yaml
    skills/                    create-epics, create-stories, story-readiness,
                               dev-story, story-done, code-review, tech-debt,
                               reverse-document, adopt, onboard
    commands/                  (mirrors above)
  programming/
    modulefile.yaml
    agents/                    gameplay-programmer, ai-programmer, engine-programmer,
                               network-programmer, tools-programmer
    rules/                     gameplay-code, ai-code, engine-code, network-code, shader-code
  ui/
    modulefile.yaml
    agents/                    ux-designer, ui-programmer, accessibility-specialist
    skills/                    team-ui, ux-design, ux-review
    commands/                  (mirrors above)
    rules/                     ui-code
  audio/
    modulefile.yaml
    agents/                    audio-director, sound-designer
    skills/                    team-audio
    commands/                  team-audio
  narrative/
    modulefile.yaml
    agents/                    narrative-director, writer, world-builder
    skills/                    team-narrative
    commands/                  team-narrative
    rules/                     narrative
  level-design/
    modulefile.yaml
    agents/                    level-designer
    skills/                    team-level
    commands/                  team-level
  qa/
    modulefile.yaml
    agents/                    qa-lead, qa-tester, performance-analyst, security-engineer
    skills/                    team-qa, qa-plan, smoke-check, soak-test,
                               regression-suite, test-setup, test-helpers,
                               test-flakiness, test-evidence-review,
                               automated-smoke-test, bug-report, bug-triage,
                               security-audit, perf-profile, team-polish
    commands/                  (mirrors above)
    rules/                     test-standards
  release/
    modulefile.yaml
    agents/                    release-manager, devops-engineer, analytics-engineer
    skills/                    team-release, release-checklist, launch-checklist,
                               milestone-review, sprint-plan, sprint-status,
                               retrospective, changelog, patch-notes, hotfix, day-one-patch
    commands/                  (mirrors above)
  prototyping/
    modulefile.yaml
    agents/                    prototyper
    skills/                    prototype, hybrid-prototype, explore
    commands/                  prototype, hybrid-prototype, explore
    rules/                     prototype-code
  live-ops/
    modulefile.yaml
    agents/                    live-ops-designer, community-manager
    skills/                    team-live-ops
    commands/                  team-live-ops
  localization/
    modulefile.yaml
    agents/                    localization-lead
    skills/                    localize
    commands/                  localize
  engine-godot/
    modulefile.yaml
    agents/                    godot-specialist, godot-gdscript-specialist,
                               godot-csharp-specialist, godot-shader-specialist,
                               godot-gdextension-specialist
  engine-unity/
    modulefile.yaml
    agents/                    unity-specialist, unity-dots-specialist,
                               unity-shader-specialist, unity-addressables-specialist,
                               unity-ui-specialist
  engine-unreal/
    modulefile.yaml
    agents/                    unreal-specialist, ue-blueprint-specialist,
                               ue-gas-specialist, ue-replication-specialist,
                               ue-umg-specialist
  data/
    modulefile.yaml
    rules/                     data-files
```

---

## Modulefile Format

Every module directory contains a `modulefile.yaml` at its root:

```yaml
name: art
version: "0.6.0"
description: "Aseprite MCP, art generation, art bible, asset specs"
depends: []
provides:
  agents: [art-director, technical-artist]
  skills: [art-bible, art-generate, asset-audit, asset-spec]
  commands: [art-generate, art-bible, asset-audit, asset-spec]
  rules: [asset-naming]
  mcp: [aseprite]
plugged-into:
  engines: [godot]
```

Fields:
- `name` — directory name, used as CLI argument and in `installed.json`
- `version` — semver; compared against bundled version for upgrade detection
- `description` — one-line display in `module list`
- `depends` — array of `name>=version` strings. Checked at install time. `core` is an implicit dependency of all modules
- `provides` — declares what the module ships. Used by the validator to check completeness
- `plugged-into` — optional filter. `engines` limits visibility to projects using that engine. Engine modules only appear in `module list` when the project's engine matches

---

## Core Module (Special)

The `core` module is the framework skeleton. Every project has it; it is installed at `init-template` time and cannot be removed.

Contents:
| Category | Items |
|----------|-------|
| Directors | creative-director, technical-director, producer |
| Onboarding | /start, /help, /brainstorm, /setup-engine, /init-template |
| Validation | ccgs-hooks.ts, drift-detector.ts, changelog-generator.ts |
| Workflow foundation | /map-systems, /project-stage-detect, /gate-check, /create-architecture, /architecture-decision |
| Cross-cutting docs | workflow-catalog.yaml, director-gates.md, coordination-rules.md, context-management.md |

Project root files (`opencode.json`, `AGENTS.md`, `tests/`, `.github/workflows/`) live in the user's project repository, not in modules. The module system manages only `.opencode/` internals. `validate.mjs` and CI workflows are project-scaffolded by `init-template`.

Engine specialists (godot-specialist, unity-specialist, unreal-specialist) live in engine modules, not core. Core is engine-agnostic.

---

## CLI Behavior

Script: `node .opencode/modules/install.mjs <verb> [args]`

### Commands

| Command | Behavior |
|---------|----------|
| `list` | Print table of all modules: name, version, installed? (checkmark), available? |
| `info <name>` | Print `modulefile.yaml` contents for a module |
| `add <name...>` | Install one or more modules |
| `remove <name>` | Remove a module (core is protected) |

### add logic

1. Read `modulefile.yaml` for each named module. Error if not found.
2. Validate `depends:` — check each dependency is installed (or co-installed in this batch). Check version constraints.
3. Recursively walk each module subdirectory (`agents/`, `skills/`, `commands/`, `rules/`, plus `plugins/`, `docs/` for core), preserving inner directory structure. Skill directories (e.g., `skills/art-bible/`) are copied as whole trees to `.opencode/skills/`. For each leaf file:
   - Compute destination path in `.opencode/<subdir>/<relative-path>`
   - If destination exists → **skip**, log `[SKIP] <path> (already present)`
   - If not → **copy**, log `[ADD] <path>`
4. For MCP fragments (`.opencode/modules/<name>/mcp/*.json`):
   - Read the JSON fragment (a partial `{mcp: {server-name: {...}}}`)
   - Deep-merge into `opencode.json`. If server key already exists → skip, warn
5. Append module entry to `installed.json` with version, timestamp, and file list
6. Run `node tests/agents/validate.mjs` to confirm no broken references
7. Print summary

### remove logic

1. Validate module is in `installed.json`. Error if not found or `core`.
2. Check reverse dependencies: if any installed module lists this one in `depends` → block
3. For each file tracked in `installed.json` for this module:
   - Read current file content
   - Compare against canonical content in `.opencode/modules/<name>/`
   - If unchanged (byte-for-byte match) → **delete**
   - If changed → **keep**, log `[KEEP] <path> (modified by user)`
4. For MCP fragments → remove the server block from `opencode.json`
5. Remove module entry from `installed.json`
6. Run validator to confirm no broken references
7. Print summary

### installed.json format

```json
{
  "core": {
    "version": "0.6.0",
    "installed_at": "2026-05-09T10:00:00Z",
    "files": [
      "agents/creative-director.md",
      "agents/technical-director.md",
      "skills/start/SKILL.md"
    ]
  },
  "art": {
    "version": "0.6.0",
    "installed_at": "2026-05-09T10:05:00Z",
    "files": [
      "agents/art-director.md",
      "agents/technical-artist.md",
      "skills/art-bible/SKILL.md"
    ]
  }
}
```

Each file path is relative to `.opencode/`. The file list is a snapshot taken at install time — used during remove to know what to clean up.

---

## Conflict Resolution

Merge-only, no overwrites. Guiding principles:

1. **Add new files, skip existing ones.** Never overwrite user files by default.
2. **Warn on conflicts.** Every skipped file is logged with the destination path.
3. **MCP config is deep-merged.** Server-level keys are checked; existing servers are skipped.
4. **Remove only deletes unmodified files.** If a user has edited an installed file, it is kept. This prevents data loss if someone customizes an agent's instructions.
5. **No force overwrite.** No `--force` flag in v1. If the user wants fresh copies, they remove the module and re-add it.

Future: a manifest tracked by module would allow smart updates (the CLI knows which bytes it installed and can overwrite only those).

---

## Validation

The existing `validate.mjs` already checks agent/skill/command structure and cross-references. The module system adds two checks:

1. **Modulefile completeness:** For each module in `.opencode/modules/`, verify every file listed in `provides` actually exists in the module directory
2. **Post-install validation:** After `add` or `remove`, run `validate.mjs` to catch broken cross-references (e.g., a command referencing a skill that was just removed)

---

## Migration from Monolith

The existing `.opencode/` tree becomes a one-time installation target. The migration phases:

1. **Create module directories** — move agents, skills, commands, rules from `.opencode/` into their module homes under `.opencode/modules/<name>/`
2. **Write modulefile.yaml for each** — declare provides, depends, version
3. **Create core module** — extract the skeleton into `core/`
4. **Build install.mjs** — the CLI
5. **Update init-template** — scaffolding now runs `install.mjs add core [engine] [optional modules]`
6. **CI update** — validate module integrity, test CLI

The monolith files remain in `.opencode/` during migration (they are the "installed" state). The module directories under `.opencode/modules/` are the "source" state. No project breaks because all files stay where they are until `init-template` is updated for new projects.

---

## Future Growth Paths

- **`depends` enforcement:** Once modules are stable, wire up real dependencies (qa depends on testing, combat depends on ai + design + programming)
- **`opencode module update`:** Compare `installed.json` versions against module versions, copy new/updated files, preserve user modifications
- **`opencode module search`:** Text search across module descriptions
- **Remote modules:** Allow `opencode module add <url>` to fetch a module from a URL/gist — no need to clone the whole framework repo
- **Per-module git history:** If individual modules grow too large, they can be split into submodules or separate repos without changing the CLI interface
