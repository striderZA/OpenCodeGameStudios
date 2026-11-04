# Skill Test Spec: /explore

## Skill Summary

`/explore` is a pre-workflow lane for time-boxed exploration of rough ideas, with only a `prototyper`. It creates isolated prototypes under `prototypes/explore/[idea-name]/` and a lightweight `REPORT.md`; it does not commit to Hybrid or Full OCGS, create production artifacts, stage.txt, or review-mode state. It asks before implementation and report writing. Verdicts are PROMISING, NEEDS_WORK, NOT_VIABLE, or TIMEOUT; process completion is COMPLETE.

## Static Assertions (Structural)

- [ ] Frontmatter includes `name`, `description`, `argument-hint`, `user-invocable`, `allowed-tools`
- [ ] Has ≥2 phase headings
- [ ] Contains verdict keyword: COMPLETE
- [ ] Contains “May I create” and “May I write” approval language
- [ ] Handoff to `/gate-check workflow-selection` once exploration is complete
- [ ] Does not create `production/stage.txt`, review mode, or production artifacts; bypasses existing workflow state

## Director Gate Checks

None; no director reviews or multi-agent coordination.

## Test Cases

### Case 1: Happy Path — Explore one idea

**Fixture:** Narrow concept and a playable question; user approves plan and build.

**Input:** `/explore a fishing loop built around weather`

**Expected:** Builds isolated prototype, playtests, documents observations in `prototypes/explore/[idea-name]/REPORT.md` after approval, gives one of the exploration verdicts, and recommends workflow selection when done.

### Case 2: Missing concept / unclear question

**Fixture:** Concept description is absent or too vague to form one testable question.

**Input:** `/explore`

**Expected:** Asks for clarification; does not proceed to build or create workflow artifacts.

### Case 3: Boundary — multiple ideas and strict isolation

**Fixture:** User is comparing several ideas; existing production stage state may exist.

**Input:** `/explore [concept]`

**Expected:** Treats this as pre-workflow exploration, ignores workflow state, writes only beneath `prototypes/explore/[idea-name]/`, never imports `src/`, and does not create `production/stage.txt`.

### Case 4: Timebox exceeded

**Fixture:** Prototype remains incomplete after the 1–2 day maximum.

**Input:** Continue the approved exploration.

**Expected:** Stops and reports TIMEOUT or scope reduction; does not silently extend the timebox.

## Verdict

Expected verdict keywords: **PROMISING**, **NEEDS_WORK**, **NOT_VIABLE**, **TIMEOUT**; completion verdict: **COMPLETE**.