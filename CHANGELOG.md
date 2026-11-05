# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Changed

- **Pi delegation retired** — `.pi/extensions/ocgs-delegation/` was removed. Pi's
  `ExtensionContext.sessionManager` is a `ReadonlySessionManager` with no
  sub-session constructor, so `Task` and `/consult` failed before any work
  started. Pi now does the work directly when a workflow names `Task`. The
  exported `createAgentSession()` SDK path was not evaluated; retirement is a
  tradeoff, not proof that delegation is impossible.
- **Harness tool map** — new `ocgs-tool-map` extension injects a short mapping
  into the system prompt on `before_agent_start`: `Task` → `task` (with
  `subagent_type` → `agent`, prompt → `task`, and required `solutionSpace`) and
  `question` → `ask` on omp; Pi is told to use another delegation tool if
  installed or work directly. Canonical `.agents/` content keeps its OpenCode
  tool names. Wired into `.omp/config.yml`.

### Removed

- `.pi/extensions/ocgs-delegation/` (`Task` tool and `/consult` command)

---

## [v0.14.0] — 2026-11-04

### Added

- **oh-my-pi (`omp`) harness support** — a project-scoped `.omp/config.yml` loads the
  shared `.pi/extensions` under `omp` 18.16.0, while `omp` reads `.agents/` skills,
  commands, and rules natively. It does not load `.agents/agents/`; its task tool
  uses `.omp/agents/`. New `docs/omp-compatibility.md` documents what loads, the
  acceptance matrix, and the open gaps (#112)
- **`ocgs-hooks` extension for Pi and `omp`** — the 12 CCGS bash hooks ported to one
  harness-neutral `core.ts` with per-harness event mapping: session context, commit and
  push guards, asset and skill checks, agent audit, compaction context, and
  notifications. Subagent sessions cannot archive the parent `active.md` (#113)
- **Tracked git hooks** — `.githooks/commit-msg` enforces Conventional Commits and
  `.githooks/pre-commit` blocks staged credentials, conflict markers, >20 MB files and
  broken `.opencode/*` redirect stubs. The pre-commit gate runs framework validation,
  workflow integrity, and plugin tests when their paths are staged. Installed by
  `npm run hooks:install` and covered by `npm run test:hooks` (#110)
- **`/autopilot-playtest` skill and command** — optional MCP-driven playtesting through
  [Autopilot](https://github.com/ramenvr/autopilot) for Godot 4.7+ projects. The MCP
  server ships disabled and nothing launches until the user opts in. Tool naming covers
  OpenCode, Pi and `omp` (#114)
- **Autopilot integration decision record** — `docs/framework/autopilot-integration.md`,
  with `/setup-engine` wiring for OpenCode, Pi and `omp`, plus setup-requirements and
  quick-start entries (#114)
- **Godot 4.7.2 engine reference** — refreshed from 4.6 with the official 4.6 → 4.7
  migration notes, 4.7 breaking changes, renamed/removed APIs, and the 4.7 timeline row

### Changed

- **OpenCode V2 configuration schema** — `opencode.json` now uses `mcp.servers`,
  `disabled`, the ordered `permissions` array, and `commands`. Under V2 the previous V1
  shapes loaded without error and were then ignored, so MCP servers and deny rules
  (including `rm -rf`, force pushes and `sudo`) were not in effect. Verified on OpenCode
  2.2.5 (#107, #114)
- **Model assignment removed from the framework** — per-item `model:` frontmatter was
  dropped from 85 agent and skill files, `utils/assign-models.js` and the model-tier
  policy were removed, and the OpenCode GitHub workflow was deleted. Model choice now
  belongs to each developer's harness (#111)

### Removed

- `utils/assign-models.js` and the `/init-template` model-assignment step (#111)
- `.github/workflows/opencode.yml` (`/oc` comment trigger) (#111)
- Per-item `model:` frontmatter in `.agents/` and the OpenCode module copies (#111)

### Fixed

- **Stale documentation counts** — README.md and the framework docs now report the
  actual tree: 78 skills, 78 commands, 52 agents, 9 Pi extensions, 19 plugin test
  suites (177 tests) and 54 hook tests. The README port-status and key-mapping tables
  gained an `omp` column, and the quick start gained an `oh-my-pi` section

---

## [v0.13.1] — 2026-10-06

### Fixed

- **OpenCode V2 plugin migration**: `CCGSHooks`, `DriftDetector`, and `ChangelogGenerator`
  ported to the OpenCode V2 `id`/`setup(ctx)` plugin contract and V2 hook payloads
  (`ctx.tool.hook`, `ctx.event.subscribe`) in all six runtime/core-module copies (#107, #108)
- **Project-scoped event handling**: events resolve to this project via envelope/nested
  location or `session.get()` when location is omitted; foreign-project `session.created`
  / `session.idle` events are ignored before archiving state (#108)
- **Asset validation reporting**: invalid V2 asset output is reported through the completed
  tool result instead of throwing from `execute.after` (#108)
- **V2 `shell` tool recognition**: protected-branch push checks and changelog command
  detection read V2 `shell` input; CCGS agent auditing handles V2 `subagent` invocations
  and completions with correct ordering (#108)
- **Session ID import**: `Session.ID` imported from `@opencode/schema/session` in all six
  plugin copies (#108)
- **Framework docs alignment**: agent/module counts and stale references corrected across
  framework documentation (#106)
- Plugin regression suite `test-plugin-v2.mjs` (19 tests); full suite now 177 tests passing

---

## [v0.13.0] — 2026-08-10

### Added

- **Bevy engine support** — brings Bevy to parity with the other five engine specialists:
  - `engine-bevy` module (`.agents/modules/` and `.opencode/modules/` trees) with a single
    `bevy-specialist` agent covering ECS, 2D/3D rendering, bevy_ui, assets, audio, input,
    Cargo build, and WASM/mobile targets
  - 12 version-pinned reference docs at `docs/engine-reference/bevy/` (pinned **Bevy
    0.19.0**, HIGH knowledge-gap risk) — VERSION, breaking-changes, deprecated-apis,
    current-best-practices, and 8 module guides, every API claim source-cited against
    official Bevy 0.19 migration guides and docs.rs
  - `/setup-engine` guided selection, tradeoffs, genre guidance, Cargo scaffold, and
    specialist routing for Bevy
  - Cross-cutting updates: AGENTS.md, README.md, `init-template` skill, `engine-code` rule
    (Rust/Bevy zero-alloc example), agent roster (#104)

### Fixed

- **Bevy agent frontmatter leak**: the canonical `.agents/agents/bevy-specialist.md` carried
  OpenCode-only `mode`/`model` frontmatter fields that belong solely in the
  `.opencode/modules/` copy, breaking parity with every other canonical engine specialist
  and the harness-agnostic contract
- **Stale agent/module counts**: adding the 22nd module and 52nd agent left README.md and
  AGENTS.md still reporting "21 modules" / "51 agents" in six places; corrected to 22/52

---

## [v0.12.1] — 2026-08-02

### Fixed

- **Windows `.opencode/` symlinks**: New `tools/fix-opencode-symlinks.mjs` repairs the
  `.opencode/{agents,commands,skills,rules}` symlinks into real symlinks/junctions when a
  Windows checkout (`core.symlinks=false`) materializes them as inert stub files, which
  silently broke OpenCode's agent/skill/command discovery (#77, #93)
- **`assign-models.js`**: Now points directly at the canonical `.agents/agents` directory
  instead of the `.opencode/agents` symlink, so it no longer silently scans 0 agent files
  when the symlink isn't materialized (#96)
- **Plugin test docs**: `npm run test:plugins` was broken (`ERR_MODULE_NOT_FOUND`) and docs
  told contributors to invoke `.mjs` test files directly, which fails without the `tsx` ESM
  loader; both are fixed and now run 158/158 passing (#95)
- **Stale doc counts**: Corrected command count (54 -> 77), test count (183 -> 158), and
  module count (17 -> 21) across AGENTS.md, README.md, and docs/pi-compatibility.md (#94)

### Changed

- Bumped `actions/stale` from 10 to 11 (#92)
- Added `.gitignore` pattern for stray `omp-session-*.html` coding-agent transcripts (#97)


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






