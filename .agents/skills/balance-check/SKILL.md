---
name: balance-check
description: "Analyzes game balance data files, formulas, and configuration to identify outliers, broken progressions, degenerate strategies, and economy imbalances. Use after modifying any balance-related data or design. Use when user says 'balance report', 'check game balance', 'run a balance check'."
argument-hint: "[system-name|path-to-data-file] [--review full|lean|solo]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Write, Edit, Task, question
agent: economy-designer
---

## Phase 1: Identify Balance Domain

Determine the balance domain from `$ARGUMENTS`:

- **Combat** → weapon/ability DPS, time-to-kill, damage type interactions
- **Economy** → resource faucets/sinks, acquisition rates, item pricing
- **Progression** → XP/power curves, dead zones, power spikes
- **Loot** → rarity distribution, pity timers, inventory pressure
- **File path given** → load that file directly and infer domain from content

If no argument, use `question`:
- "Which system should I check for balance?"
- Options: `[A] Combat balance` / `[B] Economy balance` / `[C] Progression balance` / `[D] Loot balance`

---

## Phase 2: Gather Context

Run these in parallel using Glob/Grep:

```
Glob pattern="assets/data/**/*.json" → find all data files
Glob pattern="assets/data/**/*.tres" → find Godot resource data files
Grep pattern="balance" path="design/gdd/" → find relevant GDDs
Glob pattern="design/balance/**/*.md" → find previous balance reports
```

- Read the GDD for the identified domain from `design/gdd/`
- Read all relevant data files from `assets/data/`
- Extract intended design targets, tuning knobs, and expected value ranges from the GDD

---

## Phase 3: Delegate Expert Analysis

Spawn specialist agents via Task in **parallel** for the identified domain. Pass the full GDD content and data file content to each agent.

### Combat balance → spawn `systems-designer`
Ask them to:
- Calculate DPS for all weapons/abilities at each power tier
- Check time-to-kill at each tier
- Identify any options that dominate all others (strictly better)
- Check if defensive options can create unkillable states
- Verify damage type/resistance interactions are balanced
- Produce a table of outliers with expected vs actual values

### Economy balance → spawn `economy-designer`
Ask them to:
- Map all resource faucets and sinks with flow rates
- Project resource accumulation over time
- Check for infinite resource loops
- Verify gold sinks scale with gold generation
- Check if any items are never worth purchasing
- Produce a resource flow diagram in table form

### Progression balance → spawn `systems-designer`
Ask them to:
- Plot the XP curve and power curve
- Check for dead zones (no meaningful progression for too long)
- Check for power spikes (sudden jumps in capability)
- Verify content gates align with expected player power
- Check if skip/grind strategies break intended pacing
- Produce a progression curve health assessment

### Loot balance → spawn `economy-designer`
Ask them to:
- Calculate expected time to acquire each rarity tier
- Check pity timer math
- Verify no loot is strictly useless at any stage
- Check inventory pressure vs acquisition rate
- Produce a drop table health assessment

**Always also spawn `economy-designer`** for a cross-domain check: pass all agent findings and ask for any cross-domain imbalance (e.g., combat rewards flooding the economy, progression gated by an unbalanced loot table).

---

## Phase 4: Synthesize Findings

Collect all agent outputs. Identify:
- **Outliers**: values outside expected ranges, confirmed by agents
- **Degenerate strategies**: player behaviors that break intended balance
- **Conflicts**: disagreements between agents on what constitutes an issue

Surface any agent disagreements to the user via `question` before proceeding.

---

## Phase 5: Output the Analysis

Present the synthesized report:

```
## Balance Check: [System Name]

### Data Sources Analyzed
- [List of files read]

### Agent Contributors
- systems-designer: [findings summary]
- economy-designer: [findings summary]

### Health Summary: [HEALTHY / CONCERNS / CRITICAL ISSUES]

### Outliers Detected
| Item/Value | Expected Range | Actual | Severity | Issue |
|-----------|---------------|--------|----------|-------|

### Degenerate Strategies Found
- [Strategy description and why it is problematic]

### Progression Analysis
[Graph description or table showing progression curve health]

### Cross-Domain Impact
[economy-designer findings on how this domain affects others]

### Recommendations
| Priority | Issue | Suggested Fix | Impact | Owner |
|----------|-------|--------------|--------|-------|
```

Ask: "May I write this balance report to `design/balance/balance-check-[system]-[date].md`?"

If yes, write the file (create `design/balance/` directory if needed).

---

## Phase 6: Fix & Verify Cycle

After writing the report, use `question`:

> "Would you like to fix any of these balance issues now?"
> - Options: `[A] Yes — fix the highest-priority issue` / `[B] Yes — let me pick which one` / `[C] No — save the report for later`

If yes:
- Ask which issue to address first (refer to the Recommendations table by priority row)
- Guide the user to update the relevant data file in `assets/data/` or formula in `design/balance/`
- After each fix, offer to re-run the relevant balance checks to verify no new outliers were introduced
- If the fix changes a tuning knob defined in a GDD or referenced by an ADR, remind:
  > "This value is defined in a design document. Run `/propagate-design-change [path]` on the affected GDD to find downstream impacts before committing."

If no:
- Remind: "Re-run `/balance-check` after fixes to verify. The report is saved at `design/balance/balance-check-[system]-[date].md`."

## Recommended Next Steps

- `/propagate-design-change [gdd-file]` — if fixes changed GDD-defined values
- `/consistency-check` — verify fixed values don't conflict with other GDDs
- `/design-review [gdd-file]` — if the balance changes require design re-validation
- `/architecture-decision` — if a balance fix requires a new technical pattern
