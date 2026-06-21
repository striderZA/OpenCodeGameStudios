---
name: explore
description: "Pre-workflow rapid prototyping for exploring multiple game ideas before committing to a development workflow. Produces lightweight reports with no workflow commitment."
argument-hint: "[concept-description]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Write, Edit, Bash, Task
agent: prototyper
isolation: worktree
---

## Overview

This skill is the **pre-workflow exploration lane**. Use it when you have one or more rough game ideas and want to validate them before choosing between the Hybrid workflow (lean, iterative) or the Full OCGS workflow (formal, structured).

**When to use `/explore`:**
- You have 2-4 rough ideas and want to feel them out before committing
- You are not sure if your concept is fun, feasible, or scoped correctly
- You want to avoid formal process overhead until you know what you're making

**When NOT to use `/explore`:**
- You already know your game and are ready to build → use `/start` directly
- You are in the middle of production → use `/prototype` or `/hybrid-prototype`
- You need a formal vertical slice → use `/prototype` within the full workflow

**Key properties:**
- **No workflow commitment**: Does not create `production/stage.txt`, `production/review-mode.txt`, or any production artifacts
- **No process overhead**: No GDDs, no ADRs, no architecture, no sprint plans
- **Time-boxed**: 1-2 days per idea maximum
- **Isolated**: All work lives in `prototypes/explore/[idea-name]/`
- **Composable**: Run it multiple times for multiple ideas, then compare results

**Agents involved**: `prototyper` only. No director reviews, no multi-tier coordination.

---

## Phase 1: Define the Question (5 minutes)

Read the concept description from the argument. State the **one core question** this prototype must answer. If the concept is vague, ask the user to clarify before proceeding.

Examples of good questions:
- "Does the core loop of harvesting + crafting feel satisfying for 10 minutes?"
- "Is the combat pace too slow or too frantic with 3 enemy types?"
- "Does the movement mechanic make exploration feel good, or tedious?"

Bad question: "Is this game fun?" (Too broad. Narrow it down to one mechanic or feeling.)

**Ask the user**: "The core question for this prototype is: **[question]**. Proceed?"

---

## Phase 2: Plan (15 minutes)

Define the minimum viable prototype in 3-5 bullet points:

- What is the absolute minimum code to answer the question?
- What can be hardcoded / placeholder / skipped?
- What is the success criteria? (e.g., "Player completes 3 crafting cycles without confusion")
- What is the time budget? (default: 1-2 days)

**Present the plan to the user and ask for confirmation.**

If the user is exploring multiple ideas, remind them: "This is idea **[N]** of your exploration. Keep the scope tight so you can compare fairly."

---

## Phase 3: Build (1-2 days)

**Ask**: "May I create the prototype directory at `prototypes/explore/[idea-name]/` and begin implementation?"

If yes, create the directory. Every file must begin with:

```
// EXPLORE PROTOTYPE - NOT FOR PRODUCTION
// Question: [Core question being tested]
// Date: [Current date]
// Workflow: pre-workflow exploration (no workflow committed)
```

**Rules for explore prototype code**:
- Hardcode values freely
- Use placeholder assets (colored squares, simple shapes, primitive meshes)
- Skip error handling, polish, and architecture
- Use the simplest approach that works
- Copy code rather than importing from production
- NEVER import from `src/` — explore prototypes are fully isolated
- NEVER create files in `production/`, `design/`, `docs/architecture/`, or `src/`

**Run the prototype** as you build. Test continuously. Fix blockers, but don't polish.

If the build exceeds 2 days, **stop and report**. Exploration prototypes that drag on lose their purpose. Either reduce scope or mark as TIMEOUT.

---

## Phase 4: Playtest (1-2 hours)

Play the prototype yourself. Then ask the user to play it. Collect observations:

- What worked?
- What felt bad?
- Did it answer the core question?
- Any surprising discoveries?
- How long did it take to build?

**Document findings informally** — a bulleted list is fine at this stage.

---

## Phase 5: Generate Report (15 minutes)

Draft a lightweight report:

```markdown
# Explore Report: [Idea Name]

## Question
[The core question this prototype set out to answer]

## Approach
[What was built, time spent, shortcuts taken]

## Result
[What actually happened — specific observations]

## Verdict
[PROMISING / NEEDS_WORK / NOT_VIABLE / TIMEOUT]

- **PROMISING**: The core idea works. Worth developing further.
- **NEEDS_WORK**: The idea has potential but needs significant adjustment.
- **NOT_VIABLE**: The idea does not work as conceived. Do not pursue.
- **TIMEOUT**: The prototype could not be completed in the timebox. Scope was too large or the idea is too complex to explore quickly.

## Reasoning
[One paragraph explaining the verdict with evidence]

## Surprises
[Any unexpected findings that affect this or other ideas]

## Estimated Production Effort
[Rough guess: small (weeks) / medium (months) / large (6+ months)]
```

**Ask**: "May I write this report to `prototypes/explore/[idea-name]/REPORT.md`?"

---

## Phase 6: Next Steps

After the report is written, present the user's options:

**If the user has more ideas to explore:**
> "Idea **[current idea]** is documented. You have **[N]** more ideas to explore. Ready to run `/explore [next-idea]`?"

**If the user is done exploring:**
> "Exploration complete. You have **[N]** reports in `prototypes/explore/`:
> - `[idea-1]`: PROMISING
> - `[idea-2]`: NOT_VIABLE
> - `[idea-3]`: NEEDS_WORK
>
> **Next step**: Run `/gate-check workflow-selection` to compare your prototypes and choose between the Hybrid and Full OCGS workflows.
>
> Or, if you want to refine one idea first: `/explore [revised-concept]` to iterate."

**Do NOT**:
- Suggest `/design-system`, `/create-architecture`, or any production-phase skill
- Create `production/stage.txt`
- Set a review mode
- Route to `/brainstorm` unless the user explicitly asks for ideation help

---

## Phase 7: Summary

Output a summary to the user:
- Idea name and core question
- Verdict (PROMISING / NEEDS_WORK / NOT_VIABLE / TIMEOUT)
- Location of the report
- Clear next step (explore another idea, or workflow selection)

Verdict: **COMPLETE** — exploration prototype finished. No workflow committed.

---

## Constraints

- Prototype code must NEVER import from production source files
- Production code must NEVER import from prototype directories
- If an idea is later productionized, rewrite from scratch — do not refactor explore prototype code
- Timebox strictly: 1-2 days per idea. If it's not testable after 2 days, verdict is TIMEOUT
- Keep the question narrow — one prototype, one question
- No workflow artifacts: do not touch `production/`, `design/gdd/`, `docs/architecture/`, or `src/`
- No review mode gates, no director reviews, no multi-agent coordination
- **Workflow isolation**: This skill explicitly bypasses `production/review-mode.txt` and `production/stage.txt`. Any existing workflow state is ignored during exploration.

---

## Comparison with Other Prototype Skills

| Aspect | `/explore` | `/prototype` (Full OCGS) | `/hybrid-prototype` (Hybrid) |
|--------|-----------|--------------------------|------------------------------|
| **Workflow stage** | Pre-workflow | Phase 4 (Pre-Production) | Phase 1 (Discovery) |
| **Workflow commitment** | None | Full OCGS | Hybrid |
| **Creates stage.txt?** | No | Yes | Yes (hybrid stage) |
| **Review mode gates** | None | Solo / Lean / Full | None |
| **Report format** | Lightweight `REPORT.md` | Formal `REPORT.md` | Lightweight `DECISION.md` |
| **Directory** | `prototypes/explore/` | `prototypes/[name]/` | `prototypes/[name]/` |
| **Next step on success** | `/gate-check workflow-selection` | `/design-system` or `/architecture-decision` | `/design-system` or `/create-architecture` |
| **Time budget** | 1-2 days | 1-3 days | 1-3 days |
| **Agents involved** | `prototyper` only | All tiers | 4 core roles |
| **Designed for** | Comparing multiple ideas | Validating a known concept | Finding the fun in one idea |

---

## Recommended Next Steps

- **If exploring more ideas**: Run `/explore [next-concept]` for the next idea
- **If done exploring**: Run `/gate-check workflow-selection` to choose Hybrid vs. Full OCGS
- **If one idea needs refinement**: Run `/explore [revised-concept]` with adjusted scope
- **If ready to commit to a workflow**: Run `/start` after workflow selection to begin formal onboarding