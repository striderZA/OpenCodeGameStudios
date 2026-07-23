---
name: onboard
description: "Generates a contextual onboarding document for a new contributor or agent joining the project. Summarizes project state, architecture, conventions, and current priorities relevant to the specified role or area."
argument-hint: "[role|area]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Write, question
model: opencode-go/deepseek-v4-flash
---

## Overview

This skill generates a contextual onboarding document tailored to a specific role or area. It loads project state, scans relevant directories, and produces a comprehensive guide for new contributors or agents.

**When to use `/onboard`:**
- A new team member (human or agent) is joining the project
- You need context on a specific area before starting work
- You want a quick reference for conventions, architecture, and current state

**When NOT to use `/onboard`:**
- You need to audit an existing brownfield project's format compliance → use `/adopt`
- You need to detect project stage and missing artifacts → use `/project-stage-detect`
- You are the project owner reviewing overall status → use `/sprint-status`

---

## Phase 1: Parse Arguments and Load Project Context

Read the argument to determine the target role or area. If no argument is provided, use `question` to ask:

- **Prompt**: "No role specified. Who is this onboarding document for?"
- **Options**:
  - `Programmer` — Code architecture, patterns, conventions, current implementation state
  - `Designer` — Design documents, GDDs, systems, balance data
  - `Narrative` — Story docs, world-building, lore, character profiles
  - `QA` — Test coverage, test plans, known bugs, QA conventions
  - `Production` — Sprint plans, milestones, velocity, blockers
  - `Artist` — Art bible, asset specs, asset audit results, visual standards

If the user provides a role that doesn't match the options above, accept it and proceed. Map it to the closest category for scanning purposes.

**Load project context:**

1. Read `AGENTS.md` for project overview, technology stack, and standards. If the file does not exist or is empty, **stop and report**: "Cannot generate onboarding document: `AGENTS.md` is missing or unreadable. This file is required for project context."

2. If a specific role is specified, read the corresponding agent definition from `.agents/agents/[role].md`. If the file does not exist, inform the user: "No agent definition found for `[role]`. Proceeding with generic onboarding." and continue without role-specific context.

3. Read `docs/framework/technical-preferences.md` for engine and language configuration. If the file contains `[TO BE CONFIGURED]` for the engine, note that the engine is not yet configured in the onboarding document.

---

## Phase 2: Scan Relevant Area

Based on the role or area, scan the appropriate directories. If a directory does not exist or is empty, note it in the onboarding document as "No [area] artifacts found yet."

**Scanning rules:**

- **Programmers**: Scan `src/` for source files (`*.gd`, `*.cs`, `*.cpp`, `*.h`, `*.rs`, `*.py`, `*.js`, `*.ts`). Identify architecture patterns (folder structure, naming conventions), key modules, and entry points. Check for `docs/architecture/` and read ADRs if present.

- **Designers**: Scan `design/` for GDDs (`*.md` in `design/gdd/`), balance data, and system definitions. Count documents and note which systems have GDDs vs. which are missing.

- **Narrative**: Scan `design/narrative/` for world-building docs, character profiles, story outlines. If the directory does not exist, check `design/` for any narrative-related files.

- **QA**: Scan `tests/` for test files, test plans, and coverage reports. Check `production/qa/` for bug reports and triage data. Note test framework and patterns.

- **Production**: Scan `production/` for sprint plans (`production/sprints/`), milestones (`production/milestones/`), session logs, and blockers. Read the most recent sprint plan if it exists.

- **Artists**: Scan `assets/` for art files, check for art bible in `design/art-bible.md`, and look for asset specs in `design/asset-specs/`. Check `design/art/` if it exists.

**Read recent changes** (if git is available):
- Run `git log --oneline -20` to understand current momentum
- Identify the most active areas and recent focus

If git is not available or the repository has no commits, skip this step and note: "No git history available."

---

## Phase 3: Generate Onboarding Document

Assemble the onboarding document using this structure. Fill each section with information gathered from Phases 1 and 2. If information is missing, state "Not yet defined" or "No artifacts found" rather than leaving the section blank.

```markdown
# Onboarding: [Role/Area]

## Project Summary
[2-3 sentence summary of what this game is and its current state. Pull from AGENTS.md and design/gdd/game-concept.md if it exists.]

## Your Role
[What this role does on this project, key responsibilities, who you report to. Pull from the agent definition if available.]

## Project Architecture
[Relevant architectural overview for this role. For programmers: describe folder structure, key modules, dependencies. For designers: describe systems and their interactions. For others: describe how their work fits into the pipeline.]

### Key Directories
| Directory | Contents | Your Interaction |
|-----------|----------|-----------------|
| [dir] | [what's in it] | [how this role uses it] |

### Key Files
| File | Purpose | Read Priority |
|------|---------|--------------|
| [file] | [what it does] | [High/Medium/Low] |

## Current Standards and Conventions
[Summary of conventions relevant to this role from AGENTS.md and agent definition. Include coding standards, naming conventions, documentation requirements, test requirements.]

## Current State of Your Area
[What has been built, what is in progress, what is planned next. Pull from scan results and recent git commits.]

## Current Sprint Context
[What the team is working on now and what is expected of this role. Pull from production/sprints/ if available. If no sprint is active, state "No active sprint."]

## Key Dependencies
[What other roles/systems this role interacts with most. For programmers: which systems they modify. For designers: which programmers implement their designs. For QA: which areas need testing.]

## Common Pitfalls
[Things that trip up new contributors in this area. Pull from AGENTS.md coordination rules, coding standards, and any TODO/FIXME comments in scanned files.]

## First Tasks
[Suggested first tasks to get oriented and productive]

1. **Read these documents first**: [list 3-5 key documents]
2. **Review this code/content**: [point to specific files or directories]
3. **Start with this small task**: [suggest a low-risk first task, e.g., "Fix a typo in a GDD" or "Add a unit test for an existing function"]

## Questions to Ask
[Questions the new contributor should ask to get fully oriented. Examples: "What is the definition of done for a story?", "Who reviews my work?", "What is the deploy process?"]
```

---

## Phase 4: Review and Save Document

Present the onboarding document to the user in full. Do not truncate or summarize — show the complete document.

**Ask**: "May I write this to `production/onboarding/onboard-[role]-[date].md`?"

If yes:
1. Create the `production/onboarding/` directory if it does not exist
2. Write the file with the date in YYYY-MM-DD format
3. Confirm: "Onboarding document written to `[path]`."

If no:
- Ask: "Would you like me to revise the document, or skip saving it?"
- If revise, ask what to change and regenerate the relevant sections
- If skip, proceed to Phase 5 without writing

---

## Phase 5: Next Steps

Verdict: **COMPLETE** — onboarding document generated.

**Suggest next steps based on the role:**

- **Programmers**: "Run `/sprint-status` to see current work, then `/dev-story [story-id]` to pick up a task."
- **Designers**: "Run `/design-system [system-name]` to author a new GDD, or `/design-review [gdd-path]` to review an existing one."
- **QA**: "Run `/qa-plan` to create a test plan, or `/smoke-check` to run the smoke test suite."
- **Production**: "Run `/sprint-plan` to create or update the current sprint, or `/milestone-review` to assess progress."
- **Artists**: "Run `/art-bible` to review or create the visual identity spec, or `/asset-spec [system]` to generate asset specifications."
- **Narrative**: "Run `/design-system narrative` to author narrative GDDs, or review existing docs in `design/narrative/`."

**General**: "Run `/help` if you need guidance on what to work on next."

---

## Edge Cases

- **No argument provided**: Use `question` to ask for the role (see Phase 1).
- **AGENTS.md missing or unreadable**: Stop and report the error. Do not proceed without project context.
- **Role not found in `.agents/agents/`**: Proceed with generic onboarding, note the missing agent definition in the document.
- **Engine not configured**: Note in the document that the engine is not yet set up and recommend `/setup-engine`.
- **Empty project (no source files, no design docs, no production artifacts)**: Generate a minimal onboarding document noting that the project is in early setup phase. Recommend `/start` to begin the workflow.
- **Git not available or no commits**: Skip the git history section, note "No git history available."
- **User provides an unrecognized role**: Accept it, map to the closest category for scanning, and note in the document that no agent definition was found.
- **User declines to save the document**: Skip the write, proceed to next steps. Do not force the save.
- **Multiple roles specified** (e.g., "programmer and QA"): Generate separate onboarding documents for each role, or ask the user to pick one.

---

## Collaborative Protocol

1. **Ask first** — never assume the user wants to save the document without asking
2. **Show the full document** — do not truncate or summarize before asking to save
3. **Adapt to the role** — tailor the scan and document content to the specific role's needs
4. **Handle missing data gracefully** — note what's missing rather than leaving sections blank
5. **Suggest actionable next steps** — point to specific commands the user can run next
