# Directory Structure

```text
/
├── AGENTS.md                    # Master configuration
├── opencode.json                # OpenCode config (permissions, plugins)
├── .agents/                     # Canonical content (harness-agnostic)
│   ├── agents/                  # 51 agent definitions
│   ├── skills/                  # 77 skill workflows
│   ├── commands/                # 54 slash commands
│   ├── rules/                   # 11 path-scoped coding standards
│   └── modules/                 # 21 theme modules (source of truth)
│       ├── installed.json       # Manifest of installed modules
│       ├── core/                # Core module (always installed)
│       ├── art/                 # Art module (aseprite MCP, art bible)
│       ├── design/              # Design module (mechanics, systems, economy)
│       ├── engine-godot/        # Godot 4 specialists
│       ├── engine-unity/        # Unity specialists
│       ├── engine-unreal/       # Unreal Engine 5 specialists
│       ├── engine-sfml3/        # SFML 3 specialist
│       ├── engine-raylib/       # Raylib specialist
│       ├── qa/                  # QA module (testing, profiling, security)
│       └── ...                  # 21 modules total
├── .opencode/                   # OpenCode-specific (plugins, symlinks)
│   ├── agents/ → ../.agents/agents/    (symlink)
│   ├── skills/ → ../.agents/skills/    (symlink)
│   ├── commands/ → ../.agents/commands/ (symlink)
│   ├── rules/ → ../.agents/rules/      (symlink)
│   ├── plugins/                 # TypeScript plugins
│   │   ├── ccgs-hooks.ts       # Session lifecycle, validation
│   │   ├── drift-detector.ts   # Template drift detection
│   │   ├── changelog-generator.ts
│   │   └── tests/              # 11 test suites (140+ tests)
│   └── modules/
│       ├── install.mjs          # CLI: add/remove/list modules
│       └── installed.json       # Module manifest
├── .pi/                         # Pi-specific extensions & settings
│   ├── extensions/              # Pi extensions (ocgs-core, delegation, question, etc.)
│   └── settings.json            # Pi configuration
├── src/                         # Game source code (core, gameplay, ai, networking, ui, tools)
├── assets/                      # Game assets (art, audio, vfx, shaders, data)
├── design/                      # Game design documents (gdd, narrative, levels, balance)
├── docs/                        # Technical documentation
│   ├── architecture/            # Architecture Decision Records (ADRs)
│   ├── engine-reference/        # Curated engine API snapshots (version-pinned)
│   ├── framework/               # OCGS framework reference docs & templates
│   │   ├── director-gates.md    # Quality gate definitions
│   │   ├── technical-preferences.md  # Project tech config (populated by /setup-engine)
│   │   ├── agent-roster.md      # Full agent inventory
│   │   ├── coding-standards.md  # Code review standards
│   │   ├── coordination-rules.md # Agent coordination rules
│   │   ├── templates/           # Document templates (GDDs, ADRs, specs, etc.)
│   │   └── ...                  # Skills reference, workflow catalog, etc.
│   ├── pi-compatibility.md      # Pi setup guide
│   ├── pi-extensions.md         # Pi extension reference
│   ├── pi-workflow.md           # Pi workflow differences
│   ├── authoring-agents.md      # Agent creation guide
│   ├── authoring-skills.md      # Skill creation guide
│   ├── hybrid-workflow.md       # Hybrid workflow reference
│   └── CONTRIBUTING.md          # Framework contribution guide
├── tests/                       # Test suites
│   ├── agents/                  # Agent framework validation
│   │   ├── validate.mjs         # Structural compliance checker
│   │   ├── validate-gdscript.mjs # GDScript snippet linter
│   │   └── validation-report.md # Latest audit results
│   ├── extensions/              # Pi extension unit tests
│   ├── e2e/                     # E2E parity tests
│   └── [game-specific tests]
├── tools/                       # Build and pipeline tools
│   ├── migrate-to-agents.mjs    # Migration script (.opencode/ → .agents/)
│   └── ...
├── prototypes/                  # Throwaway prototypes (isolated from src/)
└── production/                  # Production management (sprints, milestones, releases)
    ├── session-state/           # Ephemeral session state (active.md — gitignored)
    └── session-logs/            # Session audit trail (gitignored)
```

## Key Principles

1. **`.agents/` is canonical**: All agent definitions, skills, commands, rules, and
   module sources live here. This directory is harness-agnostic.

2. **`.opencode/` and `.pi/` are harness-specific**: They contain symlinks to `.agents/`
   content plus harness-specific plugins, extensions, and configuration.

3. **Modules are installable**: Each theme module under `.agents/modules/<name>/`
   contains agents, skills, commands, and rules for a domain. Install with
   `node .opencode/modules/install.mjs add <name>`.

4. **21 modules available**: core, art, design, architecture, stories, programming,
   ui, audio, narrative, level-design, qa, release, prototyping, live-ops,
   localization, data, engine-godot, engine-unity, engine-unreal, engine-sfml3,
   engine-raylib.
