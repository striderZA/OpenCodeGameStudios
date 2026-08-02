# OpenCode Game Studios

Indie game development managed through 51 coordinated OpenCode agents.
Each agent owns a specific domain, enforcing separation of concerns and quality.

## Technology Stack

- **Engine**: [CHOOSE: Godot 4 / Unity / Unreal Engine 5 / SFML 3 / Raylib]
- **Language**: [CHOOSE: GDScript / C# / C++ / Blueprint / C / C++17]
- **Build System**: [SPECIFY after choosing engine]
- **Asset Pipeline**: [SPECIFY after choosing engine]

> **Note**: Engine-specialist agents exist for Godot, Unity, Unreal, SFML 3,
> and Raylib. Use the set matching your engine.

## Project Structure

```text
/
├── AGENTS.md                    # Project configuration
├── opencode.json                # OpenCode config (permissions, plugins)
├── .pi/                         # Pi settings and extensions
├── .agents/                     # Canonical content (harness-agnostic)
│   ├── agents/                  # 51 agent definitions
│   ├── skills/                  # 77 skill workflows
│   ├── commands/                # 54 slash commands
│   ├── rules/                   # 11 path-scoped coding standards
│   └── modules/                 # 21 installable modules
├── .opencode/                   # OpenCode-specific
│   ├── plugins/                 # TypeScript plugins (ccgs-hooks, drift-detector, changelog-generator)
│   ├── agents/ → ../.agents/agents/   (symlink)
│   ├── skills/ → ../.agents/skills/   (symlink)
│   ├── commands/ → ../.agents/commands/ (symlink)
│   └── rules/ → ../.agents/rules/     (symlink)
├── .pi/                         # Pi-specific extensions & settings
│   └── extensions/              # Pi extensions (ocgs-core, delegation, question, path-guard, etc.)
├── docs/
│   ├── architecture/            # Architecture Decision Records (ADRs)
│   ├── engine-reference/        # Curated engine API snapshots (version-pinned)
│   ├── framework/               # OCGS framework reference docs & templates
│   │   ├── director-gates.md    # Quality gate definitions
│   │   ├── technical-preferences.md  # Project tech config (populated by /setup-engine)
│   │   ├── agent-roster.md      # Full agent inventory
│   │   ├── coding-standards.md  # Code review standards
│   │   ├── coordination-rules.md    # Agent coordination rules
│   │   ├── templates/           # Document templates (GDDs, ADRs, specs, etc.)
│   │   └── ...                  # Skills reference, workflow catalog, etc.
│   ├── pi-compatibility.md      # Pi setup guide
│   ├── pi-extensions.md         # Pi extension reference
│   ├── pi-workflow.md           # Pi workflow differences
│   ├── authoring-agents.md      # Agent creation guide
│   ├── authoring-skills.md      # Skill creation guide
│   ├── hybrid-workflow.md       # Hybrid workflow reference
│   └── CONTRIBUTING.md          # Framework contribution guide
├── tests/
│   ├── agents/                  # Agent framework validation
│   │   ├── validate.mjs         # Structural compliance checker
│   │   ├── validate-gdscript.mjs # GDScript snippet linter
│   │   └── validation-report.md # Latest audit results
│   ├── extensions/              # Pi extension unit tests
│   ├── e2e/                     # E2E parity tests
│   └── [game-specific tests]
├── src/                         # Game source code
├── assets/                      # Game assets
├── design/                      # Game design documents
├── tools/                       # Build and pipeline tools
│   ├── migrate-to-agents.mjs    # Migration script (.opencode/ → .agents/)
│   └── ...
├── prototypes/                  # Throwaway prototypes
└── production/                  # Sprint plans, milestones, session logs
```

## Modular Framework

The framework is partitioned into installable theme modules.

**Core** (always installed): creative-director, technical-director, producer, /start, /help, /concept-brainstorm, /setup-engine, validation suite.

**Available modules:** art, design, architecture, stories, programming, ui, audio, narrative, level-design, qa, release, prototyping, live-ops, localization, data, engine-godot, engine-unity, engine-unreal, engine-sfml3, engine-raylib.

**Install:** `node .opencode/modules/install.mjs add <name>`
**Remove:** `node .opencode/modules/install.mjs remove <name>`
**List:** `node .opencode/modules/install.mjs list`

## Coordination Rules

1. **Vertical Delegation**: Leadership agents delegate to department leads, who
   delegate to specialists. Never skip a tier for complex decisions.
2. **Horizontal Consultation**: Agents at the same tier may consult each other
   but must not make binding decisions outside their domain.
3. **Conflict Resolution**: When two agents disagree, escalate to the shared
   parent. If no shared parent, escalate to `creative-director` for design
   conflicts or `technical-director` for technical conflicts.
4. **Change Propagation**: When a design change affects multiple domains, the
   `producer` agent coordinates the propagation.
5. **No Unilateral Cross-Domain Changes**: An agent must never modify files
   outside its designated directories without explicit delegation.

## Collaboration Protocol

**User-driven collaboration, not autonomous execution.**
Every task follows: **Question -> Options -> Decision -> Draft -> Approval**

- Agents MUST ask "May I write this to [filepath]?" before using Write/Edit tools
- Agents MUST show drafts or summaries before requesting approval
- Multi-file changes require explicit approval for the full changeset
- No commits without user instruction

## Coding Standards

- All game code must include doc comments on public APIs
- Every system must have a corresponding architecture decision record in `docs/architecture/`
- Gameplay values must be data-driven (external config), never hardcoded
- All public methods must be unit-testable (dependency injection over singletons)
- Commits must reference the relevant design document or task ID
- **Verification-driven development**: Write tests first when adding gameplay systems.
  For UI changes, verify with screenshots. Compare expected output to actual output
  before marking work complete. Every implementation should have a way to prove it works.

## Context Management

Context is the most critical resource in an OpenCode session. Manage it actively.

**The file is the memory, not the conversation.** Conversations are ephemeral and
will be compacted or lost. Files on disk persist across compactions and session crashes.

Maintain `production/session-state/active.md` as a living checkpoint. Update it
after each significant milestone:

- Design section approved and written to file
- Architecture decision made
- Implementation milestone reached
- Test results obtained

The state file should contain: current task, progress checklist, key decisions
made, files being worked on, and open questions.

## Workflow Modes

This project supports two workflow modes. Choose the one that fits your team size and project maturity:

### Hybrid Workflow (Recommended for Indie Teams)

- **Discovery Phase**: Rapid prototyping to find the fun. Low process overhead, minimal agents, throwaway code in `prototypes/`.
- **Production Phase**: Full OCGS discipline once the design is proven. Formal GDDs, ADRs, tests, and quality gates.
- **Best for**: Teams of 1–5, unknown designs, iterating to find the fun.
- **See**: `docs/hybrid-workflow.md` for full details.

### Full OCGS Workflow

- **All phases formal**: Every feature goes through design → architecture → stories → code → tests → review.
- **Best for**: Teams of 5–15, known designs, long timelines, publisher requirements.
- **See**: Full documentation in `docs/` and `.agents/skills/`.

## Getting Started

### OpenCode

Run `/start` in OpenCode to begin the guided onboarding flow.
Or jump directly to:
- `/concept-brainstorm` — explore game ideas from scratch
- `/setup-engine godot 4.6` — configure your engine (also: unity, unreal, sfml3, raylib)
- `/project-stage-detect` — analyze an existing project
- `/prototype` — rapid prototype a concept
- `/hybrid-prototype` — fast-lane prototype for discovery phase

### Pi

Start Pi from the project root:
```bash
pi
```

All OCGS skills, commands, and agents load automatically through the `.pi/extensions/` extensions.

Pi-specific commands differ from OpenCode in a few cases:
- Use `/generate-changelog` instead of `/changelog` (Pi has a built-in with that name)

See [docs/pi-compatibility.md](docs/pi-compatibility.md) for the full Pi setup guide,
[docs/pi-extensions.md](docs/pi-extensions.md) for the extension reference, and
[docs/pi-workflow.md](docs/pi-workflow.md) for workflow differences.

### Key commands in both harnesses

| Command | OpenCode | Pi |
|---------|----------|----|
| Delegation | `Task` tool (built-in) | `Task` tool (ocgs-delegation extension) |
| Peer review | — | `/consult <agent>` (ocgs-delegation extension) |
| Decision capture | question tool | question tool (ocgs-question with TUI) |
| Skill invocation | `/command-name` | `/command-name` (via prompt templates) |

## Available Commands

Type `/` in OpenCode to see all available commands. All 77 commands route to
corresponding skills in `.agents/skills/`.

| Category | Commands |
|----------|----------|
| **Onboarding** | `/start`, `/help`, `/project-stage-detect`, `/setup-engine`, `/init-template` |
| **Design** | `/concept-brainstorm`, `/map-systems`, `/design-system`, `/quick-design`, `/design-review`, `/review-all-gdds` |
| **Architecture** | `/create-architecture`, `/architecture-decision`, `/architecture-review`, `/create-control-manifest` |
| **Stories** | `/create-epics`, `/create-stories`, `/story-readiness`, `/dev-story`, `/story-done`, `/code-review` |
| **QA** | `/qa-plan`, `/smoke-check`, `/soak-test`, `/regression-suite`, `/test-setup`, `/test-helpers`, `/test-evidence-review`, `/test-flakiness` |
| **Prototyping** | `/prototype`, `/reverse-document` |
| **Team** | `/team-combat`, `/team-narrative`, `/team-ui`, `/team-level`, `/team-audio`, `/team-polish`, `/team-qa`, `/team-release` |
| **Release** | `/sprint-plan`, `/sprint-status`, `/milestone-review`, `/release-checklist`, `/launch-checklist`, `/retrospective` |
| **Ops** | `/hotfix`, `/day-one-patch`, `/bug-report`, `/bug-triage`, `/security-audit` |
| **Other** | `/balance-check`, `/consistency-check`, `/content-audit`, `/asset-audit`, `/perf-profile`, `/scope-check`, `/gate-check`, `/changelog`, `/patch-notes`, `/localize`, `/onboard`, `/tech-debt`, `/propagate-design-change`, `/estimate`, `/art-bible`, `/asset-spec`, `/playtest-report`, `/automated-smoke-test` |

## Studio Hierarchy

```
Tier 1 — Directors (Primary agents)
  creative-director    technical-director    producer

Tier 2 — Department Leads (Subagents)
  game-designer        lead-programmer       art-director
  audio-director       narrative-director    qa-lead
  release-manager      localization-lead

Tier 3 — Specialists (Subagents)
  gameplay-programmer  engine-programmer     ai-programmer
  network-programmer   tools-programmer      ui-programmer
  systems-designer     level-designer        economy-designer
  technical-artist     sound-designer        writer
  world-builder        ux-designer           prototyper
  performance-analyst  devops-engineer       analytics-engineer
  security-engineer    qa-tester             accessibility-specialist
  live-ops-designer    community-manager
```

## Engine Specialists

- **Godot 4**: `godot-specialist` + `godot-gdscript-specialist`, `godot-csharp-specialist`, `godot-shader-specialist`, `godot-gdextension-specialist`
- **Unity**: `unity-specialist` + `unity-dots-specialist`, `unity-shader-specialist`, `unity-addressables-specialist`, `unity-ui-specialist`
- **Unreal Engine 5**: `unreal-specialist` + `ue-blueprint-specialist`, `ue-gas-specialist`, `ue-replication-specialist`, `ue-umg-specialist`
- **SFML 3**: `sfml-specialist` (single agent — covers Graphics, Audio, Network, Window, System)
- **Raylib**: `raylib-specialist` (single agent — covers core, rlgl, raudio, raymath, raygui)

## Quality Gates

Before merging to `development`, the CI must pass:

- **Agent validation** (`.github/workflows/agent-validation.yml`):
  - All agent files have required frontmatter and sections
  - All skill files have valid cross-references to existing agents
  - All command files reference valid skill directories
- **Plugin tests** (`npm run test:plugins`):
  - 18 test suites, 158 tests covering all hooks

## Notes

This is a port of [Claude Code Game Studios](https://github.com/Donchitos/Claude-Code-Game-Studios)
to OpenCode. The 77 skills are in `.agents/skills/`, the 51 agents are in
`.agents/agents/`, and the 12 original bash hooks are implemented as a
TypeScript plugin in `.opencode/plugins/ccgs-hooks.ts`.

Additional plugins (`drift-detector.ts`, `changelog-generator.ts`) extend the
framework beyond the original port. See `.opencode/plugins/README.md` for the
plugin architecture guide.

To contribute to the framework itself — adding agents, skills, commands, rules,
or plugins — see `docs/CONTRIBUTING.md`.
