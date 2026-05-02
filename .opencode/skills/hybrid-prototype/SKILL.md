---
name: hybrid-prototype
description: "Fast-lane prototype skill for the hybrid workflow. Builds a playable prototype in 2-3 days with minimal process overhead. Designed for discovery phase."
argument-hint: "[concept-description]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Write, Edit, Bash, Task
agent: prototyper
isolation: worktree
---

## Overview

This skill implements the **Discovery Phase fast lane** from `docs/hybrid-workflow.md`. It is intentionally lightweight: no formal GDD, no architecture, no epic breakdown. Just build it, play it, decide.

**Time budget**: 1-3 days.
**Agents involved**: `creative-director`, `game-designer`, `prototyper`, `godot-specialist` (or engine equivalent).

---

## Phase 1: Concept & Question (5 minutes)

Read the concept description from the argument. State the **one core question** this prototype must answer. If the concept is vague, ask the user to clarify before proceeding.

Examples of good questions:
- "Does the combat feel responsive with 200ms input lag?"
- "Is resource scarcity actually fun, or just frustrating?"
- "Does the movement mechanic support the intended platforming challenges?"

Bad question: "Is this game fun?" (Too broad. Narrow it down.)

**Ask the user**: "The core question for this prototype is: [question]. Proceed?"

---

## Phase 2: Plan (15 minutes)

Define the minimum viable prototype in 3-5 bullet points:

- What is the absolute minimum code to answer the question?
- What can be hardcoded / placeholder / skipped?
- What is the success criteria? (e.g., "Player can complete 3 jumps in a row without dying")

**Present the plan to the user and ask for confirmation.**

---

## Phase 3: Build (1-2 days)

**Ask**: "May I create the prototype directory at `prototypes/[concept-name]/` and begin implementation?"

If yes, create the directory. Every file must begin with:

```
// PROTOTYPE - NOT FOR PRODUCTION
// Question: [Core question being tested]
// Date: [Current date]
```

**Rules for prototype code**:
- Hardcode values freely
- Use placeholder assets (colored squares, simple shapes)
- Skip error handling
- Use the simplest approach that works
- Copy code rather than importing from production
- NEVER import from `src/` — prototypes are isolated

**Run the prototype** as you build. Test continuously. Fix blockers, but don't polish.

---

## Phase 4: Playtest (2-4 hours)

Play the prototype yourself. Then ask the user to play it. Collect observations:

- What worked?
- What felt bad?
- Did it answer the core question?
- Any surprising discoveries?

**Document findings informally** — a bulleted list is fine.

---

## Phase 5: Decide (30 minutes)

Collaborate with `creative-director` and `game-designer` (via Task or conversation) to make a decision:

| Verdict | Meaning | Next Step |
|---------|---------|-----------|
| **ITERATE** | Core is promising, but needs adjustment | Run `/hybrid-prototype [revised-concept]` |
| **PIVOT** | The concept doesn't work, but a related one might | Run `/brainstorm` or `/hybrid-prototype [new-direction]` |
| **PRODUCTIONIZE** | It's fun and proven — move to production | Begin GDD in `/design-system`, architecture in `/create-architecture` |
| **KILL** | It's not fun and no clear fix | Stop. The prototype report is the deliverable. |

**Update `prototypes/[concept-name]/DECISION.md`** with:

```markdown
# Prototype Decision: [Concept Name]

## Question
[Core question]

## Result
[What happened]

## Verdict
[ITERATE / PIVOT / PRODUCTIONIZE / KILL]

## Reasoning
[Why]

## Next Steps
[What to do next]
```

**Ask**: "May I write the decision to `prototypes/[concept-name]/DECISION.md`?"

---

## Phase 6: Done

Output a summary to the user: the core question, the verdict, and the next step.

If **PRODUCTIONIZE**: remind them to switch to the Production phase workflow (`/design-system`, `/create-architecture`, etc.)

If **ITERATE / PIVOT / KILL**: no further action needed.

---

## Constraints

- Prototype code must NEVER import from production source files
- Production code must NEVER import from prototype directories
- If productionizing, rewrite from scratch — do not refactor prototype code
- Timebox strictly: if it's not working after 3 days, kill or pivot
- Keep the question narrow — one prototype, one question
- **Workflow isolation**: This skill explicitly bypasses `production/review-mode.txt`. Any stale review-mode state from a previous full OCGS session is ignored — the hybrid fast lane always runs without formal gates.

---

## Differences from Full `/prototype` Skill

| Aspect | `/prototype` (Full OCGS) | `/hybrid-prototype` (Fast Lane) |
|--------|--------------------------|----------------------------------|
| Review mode gates | Solo / Lean / Full | None (always fast) |
| Creative Director review | Formal gate spawn | Informal chat/Task |
| Report format | Formal `REPORT.md` | Lightweight `DECISION.md` |
| Agents involved | All tiers | 4 core roles only |
| Time to verdict | 1-3 days + review overhead | 1-3 days total |
| Next step on PROCEED | Formal GDD + ADR | Start GDD when ready |
