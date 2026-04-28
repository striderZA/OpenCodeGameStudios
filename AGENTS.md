# OpenCode Game Studios

Indie game development managed through 49 coordinated OpenCode agents.
Each agent owns a specific domain, enforcing separation of concerns and quality.

## Technology Stack

- **Engine**: [CHOOSE: Godot 4 / Unity / Unreal Engine 5]
- **Language**: [CHOOSE: GDScript / C# / C++ / Blueprint]
- **Version Control**: Git with trunk-based development
- **Build System**: [SPECIFY after choosing engine]
- **Asset Pipeline**: [SPECIFY after choosing engine]

> **Note**: Engine-specialist agents exist for Godot, Unity, and Unreal with
> dedicated sub-specialists. Use the set matching your engine.

## Project Structure

```text
/
├── AGENTS.md                    # Master configuration
├── opencode.json                # OpenCode config (permissions, plugins)
├── .opencode/                   # Commands, agents, plugins, rules
│   ├── commands/                # 72 slash commands (was .claude/skills/)
│   ├── agents/                  # 49 agent definitions (was .claude/agents/)
│   ├── plugins/                 # CCGS hooks as TypeScript plugin
│   └── rules/                   # Path-scoped coding standards
├── src/                         # Game source code (core, gameplay, ai, networking, ui, tools)
├── assets/                      # Game assets (art, audio, vfx, shaders, data)
├── design/                      # Game design documents (gdd, narrative, levels, balance)
├── docs/                        # Technical documentation (architecture, api, postmortems)
│   └── engine-reference/        # Curated engine API snapshots (version-pinned)
├── tests/                       # Test suites (unit, integration, performance, playtest)
├── tools/                       # Build and pipeline tools (ci, build, asset-pipeline)
├── prototypes/                  # Throwaway prototypes (isolated from src/)
├── production/                  # Sprint plans, milestones, release tracking, session logs
└── README.md                    # Project overview
```

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

## Getting Started

Run `/start` in OpenCode to begin the guided onboarding flow.
Or jump directly to:
- `/brainstorm` — explore game ideas from scratch
- `/setup-engine godot 4.6` — configure your engine
- `/project-stage-detect` — analyze an existing project

## Available Commands

Type `/` in OpenCode to see all 72 commands. Key categories:

- **Onboarding**: `/start`, `/help`, `/project-stage-detect`, `/setup-engine`
- **Design**: `/brainstorm`, `/map-systems`, `/design-system`, `/quick-design`
- **Architecture**: `/create-architecture`, `/architecture-decision`, `/architecture-review`
- **Stories**: `/create-epics`, `/create-stories`, `/dev-story`, `/sprint-plan`
- **Reviews**: `/design-review`, `/code-review`, `/balance-check`, `/gate-check`
- **QA**: `/qa-plan`, `/smoke-check`, `/soak-test`, `/regression-suite`
- **Team**: `/team-combat`, `/team-narrative`, `/team-ui`, `/team-release`

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

- **Godot 4**: `godot-specialist` + `godot-gdscript-specialist`, `godot-shader-specialist`, `godot-gdextension-specialist`
- **Unity**: `unity-specialist` + `unity-dots-specialist`, `unity-shader-specialist`, `unity-addressables-specialist`, `unity-ui-specialist`
- **Unreal Engine 5**: `unreal-specialist` + `ue-blueprint-specialist`, `ue-gas-specialist`, `ue-replication-specialist`, `ue-umg-specialist`

## Notes

This is a port of [Claude Code Game Studios](https://github.com/Donchitos/Claude-Code-Game-Studios)
to OpenCode. The 72 skills are now in `.opencode/commands/`, the 49 agents are in
`.opencode/agents/`, and the 12 hooks are implemented as a TypeScript plugin in
`.opencode/plugins/ccgs-hooks.ts`.
