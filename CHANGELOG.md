# Update unreleased — 2026-07-23

## Bug Fixes

- Update .opencode/{agents,skills,commands}/ paths to canonical .agents/
- Bump question tool max options from 4 to 10
- Remove dead ternary in question tool (both branches same value)


All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v0.11.0] — 2026-07-22

### Added

- **SFML 3 engine reference docs** — 9 files: VERSION, breaking changes, deprecated APIs,
  current best practices, and module guides (graphics, audio, network, window, system)
- **Raylib engine reference docs** — 10 files: VERSION, breaking changes, deprecated APIs,
  current best practices, and module guides (core, rlgl, raudio, raymath, raygui, platforms)
- Brings SFML 3 and Raylib to full parity with existing Godot, Unity, and Unreal engine
  reference sets (#78, #85)

### Fixed

- **Pi compatibility**: Fixed module installer `--pi` flag, Pi config awareness in drift
  detector, and cross-harness install path resolution (#84)
- **Plugin code quality**: Removed dead code, fixed cross-platform notification paths,
  improved E2E test coverage (#83)

### Dependencies

- Bumped `actions/setup-node` from 6 to 7 (#75)
- Bumped `actions/checkout` from 6 to 7 (#74)


## [v0.10.2] — 2026-06-22

### Changed

- **Pi docs**: Updated README.md, CONTRIBUTING.md, framework quick-start, and setup-requirements
  to document Pi alongside OpenCode as a supported harness
- **Gitignore**: Added `.superpowers/`, `docs/superpowers/`, and `framework/` paths

### Housekeeping

- Purged `docs/superpowers/` and `framework/` from git history (11 design docs, ~352KB)
- Removed superpowers reference from CHANGELOG

## [v0.10.1] — 2026-06-22

### Changed

- **Path canonicalization**: Moved framework reference docs from `.opencode/docs/` to `docs/framework/`
  — 54 files (16 reference docs + 38 document templates), all re-referenced across 145 skill files
- Updated `AGENTS.md` project structure to document `docs/framework/`

### Fixed

- **CLAUDE.md references**: 33 skill/agent files referenced non-existent `CLAUDE.md` instead of `AGENTS.md`
- **Canonical agent/skill/command paths**: 21 files pointed at symlinked `.opencode/` paths instead of
  canonical `.agents/` directories
- **`.claude/` stale references**: 3 workflow-catalog.yaml copies referenced `.claude/docs/` instead of
  `docs/framework/`
- **Pi harness awareness**: MCP config sections (godot-mcp, unity-mcp) now document `pi.json` alongside
  `opencode.json`; 5 Unity specialist agents updated to be harness-agnostic
- **Question tool `maxItems`**: Raised from 4 to 10 to support larger option sets with scrolling UI,
  number-key shortcuts (1-9), and aligned rendering
- **Question tool `ReferenceError`**: Fixed `answerText` → `result.answer` in TUI result rendering
- **`/brainstorm` → `/concept-brainstorm`**: Renamed to avoid clash with Superpowers brainstorming skill;
  updated all CI/test references and module catalogs
- **Question tool factory pattern**: Removed dead ternary (both branches returned same value)

## [v0.10.0] — 2026-06-21

### Added

- **Multi-harness framework**: Migrated OCGS content to harness-agnostic `.agents/` directory
- **ocgs-core**: Pi extension barrel for `.agents/` content discovery
- **ocgs-delegation**: Task tool (vertical delegation) and `/consult` (peer review) for Pi
- **ocgs-question**: Structured decision capture with TUI picker
- **ocgs-path-guard**: Dynamic path-scoped rule injection for Pi
- **ocgs-audit**: Byte-identical audit logging to `production/session-logs/agent-audit.log`
- **ocgs-changelog**: Conventional-commit changelog generation with TUI modal
- **ocgs-drift-detector**: Real-time structural drift detection with inline warnings
- **ocgs-validate**: `.agents/` content validation on startup and post-write
- Pi parity test suite (`tests/e2e/test-parity.test.ts`)

### Changed

- Content moved from `.opencode/` to `.agents/` (canonical, harness-agnostic)
- `.opencode/{agents,skills,commands,rules}` replaced with symlinks to `.agents/`
- `/changelog` renamed to `/generate-changelog` to avoid Pi built-in conflict
- Agent frontmatter made harness-neutral (removed `model:`, `mode:`, `permission:`)
- `ocgs-path-guard` uses inline glob matcher instead of `minimatch` dependency
- `ocgs-core` barrel: content discovery only; Pi auto-discovers extensions independently
- `ocgs-validate` scoped to agent files only for harness-field checks
- Docs: fixed stale agent/command/skill counts across WORKFLOW-GUIDE, AGENTS.md,
  README.md, and hybrid-workflow.md

### Fixed

- Double-load conflict between Pi auto-discovery and ocgs-core barrel
- Symlink setup so OpenCode correctly discovers `.agents/` content
- `.gitignore` entries removed for `.opencode/` symlinks (now tracked as git symlinks)

### Added (docs)

- `docs/pi-compatibility.md` — Pi setup guide
- `docs/pi-extensions.md` — Pi extension reference
- `docs/pi-workflow.md` — Pi workflow differences
### Changed (docs)

- All docs updated to reference `.agents/` paths instead of `.opencode/`
- `AGENTS.md` now includes Pi section with cross-harness command comparison
- `WORKFLOW-GUIDE.md` intro corrected from 48→51 agents, 68→54 commands
- `README.md` directory tree shows `.agents/` as canonical source

### Testing

- Added Pi extension parity tests (`tests/e2e/`)
- Added extension-specific tests (`tests/extensions/`)






