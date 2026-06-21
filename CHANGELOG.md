# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## Unreleased

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
- `docs/superpowers/specs/2026-06-21-pi-agent-support-design.md` — Design spec

### Changed (docs)

- All docs updated to reference `.agents/` paths instead of `.opencode/`
- `AGENTS.md` now includes Pi section with cross-harness command comparison
- `WORKFLOW-GUIDE.md` intro corrected from 48→51 agents, 68→54 commands
- `README.md` directory tree shows `.agents/` as canonical source

### Testing

- Added Pi extension parity tests (`tests/e2e/`)
- Added extension-specific tests (`tests/extensions/`)
