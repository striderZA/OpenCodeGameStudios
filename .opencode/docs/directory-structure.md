# Directory Structure

```text
/
├── AGENTS.md or CLAUDE.md         # Master configuration
├── .opencode/                     # Agent definitions, skills, hooks, rules, docs, modules
│   └── modules/                   # Theme modules (install.mjs + module dirs)
│       ├── install.mjs            # CLI: add/remove/list modules
│       ├── installed.json         # Manifest of installed modules
│       ├── core/                  # Core module (always installed)
│       ├── art/                   # Art module (aseprite MCP, art bible)
│       ├── design/                # Design module (mechanics, systems, economy)
│       ├── qa/                    # QA module (testing, profiling, security)
│       └── ...                    # 19 modules total
├── src/                         # Game source code (core, gameplay, ai, networking, ui, tools)
├── assets/                      # Game assets (art, audio, vfx, shaders, data)
├── design/                      # Game design documents (gdd, narrative, levels, balance)
├── docs/                        # Technical documentation (architecture, api, postmortems)
│   └── engine-reference/        # Curated engine API snapshots (version-pinned)
├── tests/                       # Test suites (unit, integration, performance, playtest)
├── tools/                       # Build and pipeline tools (ci, build, asset-pipeline)
├── prototypes/                  # Throwaway prototypes (isolated from src/)
└── production/                  # Production management (sprints, milestones, releases)
    ├── session-state/           # Ephemeral session state (active.md — gitignored)
    └── session-logs/            # Session audit trail (gitignored)
```
