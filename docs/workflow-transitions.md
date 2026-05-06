# Workflow Transition Guide

This document defines how to transition between development modes in the OCGS
framework. It covers four paths:

- **[Path A](#path-a-explore--hybrid)**: Pre-workflow `/explore` → Hybrid workflow
- **[Path B](#path-b-explore--full-ocgs)**: Pre-workflow `/explore` → Full OCGS
- **[Path C](#path-c-hybrid-discovery--full-ocgs)**: Hybrid Discovery → Full OCGS
- **[Path D](#path-d-full-ocgs-prototype--production)**: Full OCGS `/prototype` → Production

---

## Core Principle: Code Never Promotes

**The number one rule across ALL transition paths:**

> Prototype code is never refactored into production code.
> Production code never imports from prototype directories.

This is not negotiable. Prototype code is written under relaxed standards:
hardcoded values, no error handling, no architecture. Moving it into production
creates technical debt that costs more to fix than a clean rewrite. Every path
below follows this rule.

**What promotes:**
- Design insights and findings
- Balance data that was empirically validated
- Asset ideas (concept art, mood boards, placeholder specs)
- Acceptance criteria that were validated in playtesting

**What gets rewritten from scratch:**
- All source code
- Scene/level files
- Configuration files (rewritten with production structure)
- Asset placeholders (replaced with production-quality assets)

---

## Path A: Explore → Hybrid

**Trigger**: `/gate-check workflow-selection` returns Hybrid recommendation
and user confirms.

**Starting artifacts**: One or more reports in `prototypes/explore/*/REPORT.md`
with PROMISING verdicts.

### Steps

1. **Archive exploration prototypes**
   ```
   prototypes/explore/  →  prototypes/archive/explore/[date]/
   ```
   This preserves the explore work for reference without cluttering the
   active prototype directory.

2. **Promote the winning idea**
   Create an informal concept document at `design/concept.md` capturing:
   - The core question the winning prototype answered
   - Why it was chosen over alternatives
   - Key findings from the explore report
   - Estimated production effort

   This is NOT a formal GDD — it is a lightweight concept document for the
   Hybrid workflow's Discovery phase.

3. **Enter Hybrid Discovery**
   The Hybrid workflow starts with its Discovery phase. If the winning
   prototype already answered the core mechanic question, you can:
   - Skip to `/hybrid-prototype [winning-idea]` to build a playable
     vertical slice
   - Or go directly to mapping systems with `/map-systems`
   - Or begin writing a GDD with `/design-system`

4. **Reference explore findings**
   Include links to the archived explore reports in any GDD or decision
   document. The explore `REPORT.md` findings become the "Prior Art" that
   informs the GDD's rules and tuning knobs.

### Artifact Map

| Artifact | Action | Destination |
|----------|--------|-------------|
| `prototypes/explore/[idea]/REPORT.md` | Archive | `prototypes/archive/explore/[date]/[idea]/REPORT.md` |
| `prototypes/explore/[idea]/code/` | Archive (never reuse) | `prototypes/archive/explore/[date]/[idea]/code/` |
| Winning idea design insight | Promote | `design/concept.md` |
| Balance/config data | Evaluate | Promote if proven, rewrite if uncertain |
| Placeholder assets | Discard | Replace with new assets in `assets/` |

---

## Path B: Explore → Full OCGS

**Trigger**: `/gate-check workflow-selection` returns Full OCGS recommendation
and user confirms.

**Starting artifacts**: One or more reports in `prototypes/explore/*/REPORT.md`
with PROMISING verdicts.

### Steps

1. **Archive exploration prototypes** (same as Path A)
   ```
   prototypes/explore/  →  prototypes/archive/explore/[date]/
   ```

2. **Formalize the concept**
   Run `/brainstorm [winning-idea]` to produce a formal game concept document
   at `design/gdd/game-concept.md` with full MDA analysis, pillars, core loop,
   and player journey.

   The explore findings feed directly into the brainstorm — the core question
   has already been answered, so the concept document can be more specific
   than a typical brainstorm output.

3. **Set up the engine**
   Run `/setup-engine [engine]` to pin the engine version, generate technical
   preferences, and populate engine reference docs.

4. **Design the systems**
   Run `/map-systems` to enumerate all systems, then `/design-system` per
   system to write formal 8-section GDDs. The explore prototype's findings
   directly inform each GDD's rules, formulas, and tuning knobs.

5. **Reference explore findings**
   Embed links to the archived explore `REPORT.md` files in the GDDs. For
   example, in the combat system GDD's "Tuning Knobs" section: "Prototype
   testing showed that damage values above 50 felt too punishing — validated
   range: 10-40."

### Artifact Map

| Artifact | Action | Destination |
|----------|--------|-------------|
| `prototypes/explore/[idea]/REPORT.md` | Archive, cross-reference | `prototypes/archive/explore/[date]/[idea]/REPORT.md` |
| `prototypes/explore/[idea]/code/` | Archive (never reuse) | `prototypes/archive/explore/[date]/[idea]/code/` |
| Winning idea | Formalize | `design/gdd/game-concept.md` (via `/brainstorm`) |
| Prototype findings | Embed in GDDs | `design/gdd/[system].md` (Tuning Knobs, Edge Cases sections) |
| Engine (none yet) | Set up | Via `/setup-engine` |

---

## Path C: Hybrid Discovery → Full OCGS

**Trigger**: Any of the conditions in [When to Switch to Full OCGS](hybrid-workflow.md#when-to-switch-to-full-ocgs)
become true: team grows beyond 5, timeline exceeds 6 months, publisher
requirements, or need for live ops / analytics / multiplayer.

**Starting artifacts**: Hybrid Discovery artifacts — informal concept doc,
prototypes in `prototypes/`, lightweight specs in `design/quick-specs/`.

### Steps

1. **Archive Discovery prototypes**
   ```
   prototypes/[discovery-proto]/  →  prototypes/archive/discovery/[date]/
   ```

2. **Promote surviving designs to formal GDDs**
   For each system that was prototyped and validated:
   - Run `/design-system retrofit design/gdd/[system].md` to add the
     required 8 sections to any informal spec or bullet-point doc
   - Or run `/design-system [system]` from scratch if no document exists
   - Embed prototype findings (especially tuning knobs and edge cases)

3. **Write ADRs for proven systems**
   Run `/architecture-decision` for each architectural choice that was
   implicitly made during prototyping:
   - Scene/state management approach
   - Data flow between systems
   - Save/load strategy
   - Input handling architecture

4. **Recruit additional agents**
   Expand from the 4-role Hybrid roster to the full agent hierarchy.
   See [Slimmed Agent Hierarchy](hybrid-workflow.md#slimmed-agent-hierarchy-49--10)
   for which roles to add first.

5. **Switch to `src/` with full coding standards**
   All new code goes into `src/` with doc comments, dependency injection,
   unit tests, and no hardcoded values. Do not move prototype code into
   `src/` — rewrite from scratch.

6. **Enable all quality gates**
   - `/test-setup` to scaffold the test framework
   - `/qa-plan` to generate QA plans
   - `/gate-check` at every phase transition
   - Enable pre-commit hooks for validation

### Artifact Map

| Artifact | Action | Destination |
|----------|--------|-------------|
| `prototypes/[proto]/` | Archive | `prototypes/archive/discovery/[date]/` |
| `design/concept.md` (informal) | Promote | `design/gdd/game-concept.md` (formalize) |
| `design/quick-specs/*.md` | Retrofit | `design/gdd/[system].md` (via `/design-system retrofit`) |
| Prototype code | Archive (never reuse) | `prototypes/archive/discovery/[date]/` |
| Implicit architecture decisions | Document | `docs/architecture/adr-[*].md` (via `/architecture-decision`) |

---

## Path D: Full OCGS Prototype → Production

**Trigger**: A `/prototype` within the Full OCGS Phase 4 (Pre-Production)
returns a PROCEED verdict and the creative director approves.

**Starting artifacts**: `prototypes/[mechanic-name]/` with a `REPORT.md`
and throwaway code.

### Steps

1. **Archive the prototype**
   ```
   prototypes/[mechanic-name]/  →  prototypes/archive/[date]-[mechanic-name]/
   ```

2. **Update the GDD with prototype findings**
   Open the relevant system GDD at `design/gdd/[system].md` and add:
   - Updated tuning knobs and safe ranges based on prototype data
   - Edge cases discovered during prototyping
   - Acceptance criteria that were validated
   - Any formula adjustments found necessary

3. **Create or update ADRs**
   If the prototype revealed architectural requirements:
   - Run `/architecture-decision` to record the decision
   - Or update an existing ADR if the decision refines a previous one

4. **Create stories from prototype insights**
   Run `/create-stories [epic-slug]` with the prototype findings embedded
   in the story acceptance criteria. The prototype report's "If Proceeding"
   section is the direct input for implementation requirements.

5. **Implement from scratch in `src/`**
   The production implementation is written in `src/` with full coding
   standards. The prototype code is reference only — do not copy, refactor,
   or import from it.

### Artifact Map

| Artifact | Action | Destination |
|----------|--------|-------------|
| `prototypes/[mechanic]/REPORT.md` | Archive, cross-reference | `prototypes/archive/[date]-[mechanic]/REPORT.md` |
| `prototypes/[mechanic]/code/` | Archive (never reuse) | `prototypes/archive/[date]-[mechanic]/code/` |
| Updated tuning ranges | Promote to GDD | `design/gdd/[system].md` (Tuning Knobs section) |
| Discovered edge cases | Promote to GDD | `design/gdd/[system].md` (Edge Cases section) |
| Architectural requirements | Promote to ADR | `docs/architecture/adr-[*].md` |
| Implementation scope | Promote to stories | `production/epics/[slug]/story-[*].md` |

---

## Quick Reference

| What | Promote? | Rule |
|------|----------|------|
| Source code | Never | Rewrite from scratch |
| Scenes / levels | Never | Rebuild from scratch |
| Placeholder assets | Never | Replace with production assets |
| Design insights | Always | Merge into GDDs or concept docs |
| Tuning data | Evaluate | Promote if empirically validated; retest if uncertain |
| Edge cases | Always | Document in GDD Edge Cases section |
| Acceptance criteria | Always | Include in story files |
| Architecture patterns | Evaluate | Document via ADR if proven; revisit if uncertain |
| Config files | Never | Recreate with production structure |
| Research notes | Always | Archive as-is for reference |

---

## See Also

- [`docs/hybrid-workflow.md`](hybrid-workflow.md) — Hybrid Discovery-Production workflow
- [`docs/WORKFLOW-GUIDE.md`](WORKFLOW-GUIDE.md) — Full OCGS 7-phase workflow
- `.opencode/skills/explore/SKILL.md` — Pre-workflow prototyping skill
- `.opencode/skills/gate-check/SKILL.md` — Workflow Selection gate