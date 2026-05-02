# Hybrid Discovery-Production Workflow

## Overview

This document defines a pragmatic hybrid workflow that balances **creative agility** during pre-production with **production discipline** once the game's direction is proven. It is designed for indie teams (1–5 people) who need to iterate quickly to find the fun, but still want professional-grade coordination when building the real thing.

**When to use this workflow**: Small teams, unknown designs, short timelines (weeks to a few months), prototypes that may be pivoted or killed.

**When to use the full OCGS workflow**: Large teams (5–15+), known designs, long timelines (6+ months), funded projects with publisher requirements.

---

## Two-Phase Model

The project lifecycle is split into two modes with **different rules**:

| Dimension | Discovery | Production |
|-----------|-----------|------------|
| **Goal** | Find the fun | Ship a polished game |
| **Process overhead** | Low | High (full OCGS) |
| **Time to playable** | 2–4 days | 2–4 weeks planning first |
| **GDDs** | Quick-design / bullet points | Formal GDDs |
| **Architecture** | None | ADRs required |
| **Code location** | `prototypes/` | `src/` |
| **Tests** | Manual playtest only | Unit + integration + QA |
| **Sprint planning** | Weekly goals (informal) | Formal sprint plan |
| **Agents** | 4 core roles | 10 core roles |

---

## Phase 1: Discovery (Pre-Production)

### Goal
Answer one question per prototype: *Is this mechanic/system/fun?*

### Rules
- **No formal GDDs.** Use `/quick-design` for lightweight specs, or bullet points in a markdown file.
- **No architecture.** Build throwaway scenes in `prototypes/`.
- **Minimal agents.** Only `creative-director`, `game-designer`, `prototyper`, and `godot-specialist` (or engine equivalent).
- **Time-boxed.** 2–4 weeks maximum per prototype.
- **Kill cheaply.** If it's not fun, pivot or scrap. No sunk-cost fallacy.

### What NOT to do in Discovery
- Architecture Decision Records (ADRs)
- Epic/story breakdowns
- QA plans
- Asset pipeline setup
- Unit tests (prototypes are throwaway)
- Formal sprint plans

### Deliverable
A working prototype that answers one core design question.

---

## Phase 2: Production (Post-Prototype)

### Goal
Build, polish, and ship the game with full quality gates.

### Rules
- Use the existing OCGS framework, but with a **consolidated agent hierarchy** (see below).
- All changes require design review, architecture review, and QA sign-off.
- Code lives in `src/` with full coding standards.
- Every system has an ADR in `docs/architecture/`.
- Tests first for gameplay systems (TDD).

### Slimmed Agent Hierarchy (49 → 10)

| Tier | Role | Responsibilities |
|------|------|------------------|
| 1 | `creative-director` | Vision, final say on design |
| 1 | `technical-director` | Architecture, tech choices, code quality |
| 2 | `game-designer` | Core mechanics, balance, progression |
| 2 | `art-director` | Visual identity, asset specs |
| 2 | `lead-programmer` | Code review, task breakdown |
| 3 | `gameplay-programmer` | Player systems, combat, UI |
| 3 | `technical-artist` | Shaders, VFX, rendering pipeline |
| 3 | `qa-lead` | Test strategy, bug triage |
| 3 | `sound-designer` | Audio direction |
| 3 | `writer` | Narrative, lore, dialogue |

> **Note**: The `producer` role is merged into `technical-director`. Cross-domain coordination falls to `technical-director` (sprint planning, milestone reviews, scope management). Gate checks and release coordination are shared with `creative-director`. Design conflicts escalate to `creative-director`.

### Merged / Deferred Roles
The following roles from the full 49-agent roster are either merged into the 10 above, or deferred until late production:

- `engine-programmer`, `tools-programmer` → `lead-programmer`
- `ai-programmer`, `network-programmer` → `gameplay-programmer` (until needed)
- `level-designer`, `world-builder` → `game-designer`
- `ui-programmer`, `ux-designer` → `gameplay-programmer`
- `economy-designer`, `systems-designer` → `game-designer`
- `performance-analyst` → `technical-artist` / `lead-programmer`
- `security-engineer`, `accessibility-specialist`, `live-ops-designer` → deferred until late production
- `community-manager`, `analytics-engineer`, `localization-lead` → post-launch only

---

## Decision Gates

| Gate | Trigger | Checks |
|------|---------|--------|
| **Prototype Gate** | 2–4 weeks or prototype complete | Is it fun? Is scope realistic? |
| **Production Gate** | Prototype approved | Is there a GDD? Is architecture defined? Is team staffed? |
| **Alpha Gate** | Core loop complete | Balance, performance, major bugs |
| **Ship Gate** | Content complete | QA sign-off, no critical bugs |

**Removed gates** (vs. full OCGS):
- Full architecture review (lightweight ADR is enough)
- Complete epic/story breakdown before implementation
- Pre-commit architecture for every feature

---

## The `/prototype` Fast Lane

A new skill/command that shortcuts the path to a playable prototype:

1. `creative-director` approves concept (informal/chat).
2. `prototyper` + `godot-specialist` build it.
3. Manual playtest.
4. `creative-director` + `game-designer` decide: **iterate**, **pivot**, or **productionize**.

**Average time to playable**: 2–3 days instead of 2–3 weeks of planning.

---

## Artifact Comparison

| Artifact | Discovery | Production |
|----------|-----------|------------|
| Game concept doc | Informal (`design/concept.md`) | Formal GDDs |
| Architecture | None | ADRs required |
| Code | `prototypes/` | `src/` with standards |
| Tests | Manual playtest only | Unit + integration |
| Sprint plans | Weekly goals in chat | Formal sprint plan |
| QA | "Does it crash?" | Full QA plan |

---

## When to Switch to Full OCGS

Switch back to the **full 49-agent framework** if any of these become true:
- Team grows beyond 5 people
- Project timeline exceeds 6 months
- Multiple features need parallel development
- You need live ops, analytics, or multiplayer
- Funding/publisher requires formal process

---

## Comparison

| Aspect | Full OCGS | Hybrid |
|--------|-----------|--------|
| Time to first prototype | 2–4 weeks | 2–4 days |
| Process overhead (early) | High | Low |
| Coordination (late) | Excellent | Good |
| Team size | 5–15 | 1–5 |
| Best for | Known game, funded, long timeline | Unknown game, indie, iterating |

---

## Migration Path

If a project starts with the hybrid workflow and later needs the full OCGS framework:

1. **Archive prototypes** to `prototypes/archive/`.
2. **Promote surviving designs** to formal GDDs in `design/`.
3. **Write ADRs** for the architecture of systems proven in prototypes.
4. **Recruit additional agents** from the full roster as needed.
5. **Switch to `src/`** with full coding standards.
6. **Enable all quality gates** from the full framework.

---

## Notes

This workflow is a **first-class citizen** of the OCGS framework, not a hack. All existing OCGS skills, gates, and documentation remain valid and are simply deferred to the Production phase. The `/prototype` skill is designed to integrate cleanly with the existing command structure.
