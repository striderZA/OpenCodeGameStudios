# Skill Test Spec: /hybrid-prototype

## Skill Summary

`/hybrid-prototype` runs a fast Discovery Phase prototype within the Hybrid workflow, with four core roles and a 1–3 day budget. It creates `prototypes/[concept-name]/`, playtests, and writes a lightweight `DECISION.md` after approval. Unlike `/explore`, it commits to Hybrid and creates `production/stage.txt` for the hybrid stage; it bypasses review-mode gates. Decision verdicts are ITERATE, PIVOT, PRODUCTIONIZE, or KILL.

## Static Assertions (Structural)

- [ ] Frontmatter includes `name`, `description`, `argument-hint`, `user-invocable`, `allowed-tools`
- [ ] Has ≥2 phase headings
- [ ] Contains verdict keyword: ITERATE, PIVOT, PRODUCTIONIZE, or KILL
- [ ] Contains “May I create” and “May I write” approval language
- [ ] Handoff reflects verdict: iterate/pivot, production design, or stop
- [ ] Hybrid commitment is explicit; creates hybrid stage state, bypasses stale review-mode and uses no formal gates

## Director Gate Checks

No formal director gate. `creative-director` and `game-designer` collaborate informally via Task or conversation.

## Test Cases

### Case 1: Happy Path — Build and decide

**Fixture:** Focused concept, user approves core question, plan, build, and decision.

**Input:** `/hybrid-prototype responsive grappling movement`

**Expected:** Builds and playtests in `prototypes/[concept-name]/`, records verdict and reasoning in `DECISION.md` after approval, and reports the next step.

### Case 2: Missing/ambiguous concept

**Fixture:** No usable concept question can be identified.

**Input:** `/hybrid-prototype`

**Expected:** Requests clarification; does not create prototype directory or stage state before plan approval.

### Case 3: Boundary — stale workflow mode

**Fixture:** Existing `production/review-mode.txt` reflects a prior full workflow.

**Input:** `/hybrid-prototype [concept]`

**Expected:** Ignores review-mode and runs without formal gates while retaining Hybrid workflow commitment and hybrid stage.txt behavior; unlike `/explore`, it is not workflow-neutral.

### Case 4: Timebox exceeded

**Fixture:** Prototype is not working after 3 days.

**Input:** Continue the approved prototype.

**Expected:** Kills or pivots rather than extending the timebox indefinitely; does not import production code or claim production readiness without evidence.

## Verdict

Expected decision verdict keywords: **ITERATE**, **PIVOT**, **PRODUCTIONIZE**, **KILL**.