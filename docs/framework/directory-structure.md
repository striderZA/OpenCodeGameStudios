# Directory Structure

```text
/
├── AGENTS.md                    # Master configuration
├── opencode.json                # OpenCode V2 config (plugins, MCP, permissions)
├── .githooks/                   # Tracked commit-msg and pre-commit hooks
├── .agents/                     # Canonical content (harness-agnostic)
│   ├── agents/                  # 52 agent definitions
│   ├── skills/                  # 78 skill workflows
│   ├── commands/                # 78 slash commands
│   ├── rules/                   # 11 path-scoped coding standards
│   └── modules/                 # 22 module sources for non-OpenCode targets
│       ├── installed.json       # Manifest of installed modules
│       ├── core/                # Core module (always installed)
│       ├── art/                 # Art module (aseprite MCP, art bible)
│       ├── design/              # Design module (mechanics, systems, economy)
│       ├── engine-godot/        # Godot 4 specialists
│       ├── engine-unity/        # Unity specialists
│       ├── engine-unreal/       # Unreal Engine 5 specialists
│       ├── engine-sfml3/        # SFML 3 specialist
│       ├── engine-raylib/       # Raylib specialist
│       ├── engine-bevy/         # Bevy specialist
│       ├── qa/                  # QA module (testing, profiling, security)
│       └── ...                  # 22 modules total
├── .opencode/                   # OpenCode-specific (plugins, symlinks)
│   ├── agents/ → ../.agents/agents/    (symlink)
│   ├── skills/ → ../.agents/skills/    (symlink)
│   ├── commands/ → ../.agents/commands/ (symlink)
│   ├── rules/ → ../.agents/rules/      (symlink)
│   ├── plugins/                 # TypeScript plugins
│   │   ├── ccgs-hooks.ts       # Session lifecycle, validation
│   │   ├── drift-detector.ts   # Template drift detection
│   │   ├── changelog-generator.ts
│   │   └── tests/              # 19 test suites (177 tests)
│   └── modules/                 # Module CLI + 22 OpenCode-target module sources
│       ├── install.mjs          # CLI: add/remove/list (--harness <id>)
│       └── installed.json       # Module manifest
├── .pi/                         # Pi-specific extensions & settings
│   ├── extensions/              # 9 Pi extensions (shared with omp)
│   └── settings.json            # Pi configuration
├── .omp/                        # oh-my-pi config
│   ├── agents/                  # Generated agents for the task tool
│   ├── config.yml               # Shared extension wiring
│   ├── modules/installed.json   # omp install manifest
│   └── mcp.json                 # Project MCP servers (disabled by default)
├── .claude/                     # Claude Code target (created by --harness claude)
│   ├── agents/                  # Subagents (name: frontmatter injected)
│   ├── skills/                  # Skills
│   ├── commands/                # Slash commands
│   ├── rules/                   # Path-scoped rules (paths: frontmatter)
│   └── modules/installed.json   # Claude install manifest
├── .mcp.json                    # Claude Code project MCP servers
├── .codex/                      # Codex target (created by --harness codex)
│   ├── agents/                  # TOML agents generated from .agents/agents/
│   ├── config.toml              # MCP servers under [mcp_servers.*]
│   └── modules/installed.json   # Codex install manifest
├── CLAUDE.md                    # Optional @AGENTS.md fallback for Claude Code < 2.1.277
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
│   ├── omp-compatibility.md     # oh-my-pi setup and known gaps
│   ├── WORKFLOW-GUIDE.md        # End-to-end workflow guide
│   ├── examples/                # Worked session examples
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

1. **`.agents/` is canonical**: Agent definitions, skills, commands, and rules
   live here. This directory is harness-agnostic.

2. **`.opencode/`, `.pi/`, `.omp/`, `.claude/`, and `.codex/` are harness-specific**:
   They contain symlinks or installed copies of `.agents/` content plus
   harness-specific plugins, extensions, and configuration.

3. **Modules are installable**: Theme modules are mirrored under
   `.opencode/modules/` (OpenCode target) and `.agents/modules/` (every other
   target). Install with `node .opencode/modules/install.mjs add <name>
   --harness <id>`. Keep the two source mirrors in sync when editing a module.

4. **22 modules available**: core, art, design, architecture, stories, programming,
   ui, audio, narrative, level-design, qa, release, prototyping, live-ops,
   localization, data, engine-godot, engine-unity, engine-unreal, engine-sfml3,
   engine-raylib, engine-bevy.
