---
paths:
  - "design/gdd/**"
---

# Design Document Rules

- Every design document MUST contain these 8 sections: Overview, Player Fantasy, Detailed Rules, Formulas, Edge Cases, Dependencies, Tuning Knobs, Acceptance Criteria
- Formulas must include variable definitions, expected value ranges, and example calculations
- Edge cases must explicitly state what happens, not just "handle gracefully"
- Dependencies must be bidirectional — if system A depends on B, B's doc must mention A
- Tuning knobs must specify safe ranges and what gameplay aspect they affect
- Acceptance criteria must be testable — a QA tester must be able to verify pass/fail
- No hand-waving: "the system should feel good" is not a valid specification
- Balance values must link to their source formula or rationale
- Design documents MUST be written incrementally: create skeleton first, then fill
  each section one at a time with user approval between sections. Write each
  approved section to the file immediately to persist decisions and manage context
- Cross-system facts (entities, items, formulas shared between GDDs) must be registered
  in `design/registry/entities.yaml` — never define a value in two GDDs independently

## Examples

**Correct** (formula with variable table, edge case with resolution):

```markdown
## Formulas

The `damage_formula` is defined as:
`damage = base_damage * power_multiplier * (1 + crit_bonus)`

### Variables
| Symbol | Type | Range | Description |
|--------|------|-------|-------------|
| base_damage | float | 0–100 | Weapon's base damage value |
| power_multiplier | float | 0.5–3.0 | Player power scaling factor |

### Edge Cases
- If `base_damage = 0`: damage = 0 (no division by zero risk)
- If `crit_bonus > 0` and attack is not critical: `crit_bonus = 0`
```

**Incorrect** (vague, no variable table, unresolved edge case):

```markdown
## Damage Formula

Damage depends on weapon power and player level.
Crits do more damage obviously.
Edge case: handle when the player misses.
```

## Anti-Patterns

- Writing formulas in prose instead of symbolic equations with variable tables
- Edge cases described as "handle appropriately" without specifying the exact resolution
- Accepting "the system should feel good" as a spec — it needs measurable criteria
- Defining cross-system values independently in two GDDs without registry registration
- Committing the full GDD in one write instead of section-by-section with approvals
- Dependencies listed in one direction only (A depends on B, but B doesn't mention A)
- Acceptance criteria phrased as "system works correctly" instead of testable Given-When-Then

## Cross-References

- Agent: `game-designer` — oversees GDD authoring
- Agent: `systems-designer` — creates formulas and tuning knobs
- Agent: `qa-lead` — validates acceptance criteria testability
- Skill: `design-system` — section-by-section GDD authoring
- Skill: `design-review` — validates GDD completeness
- Skill: `consistency-check` — cross-GDD value consistency
- Skill: `quick-design` — lightweight alternative for small changes
