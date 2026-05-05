# Workflow Selection Case Studies

Three real-world scenarios demonstrating how the OCGS workflow selection
process works in practice.

---

## Case Study 1: Solo Dev, First Game, 2-Month Timeline

**Developer**: Liam, solo developer
**Experience**: First commercial game, completed 2 game jams
**Timeline**: 2 months (summer break)
**Budget**: Self-funded, $500
**Ideas**: 3 prototypes explored via `/explore`

### Exploration Phase

Liam spent 2 weeks exploring 3 ideas:

```
/explore "a platformer where you rewind time"
    → REPORT.md: PROMISING — core mechanic feels great, but level design needs work
    → Time spent: 2 days

/explore "a farming sim with real-time crop growth"
    → REPORT.md: NOT_VIABLE — too complex for solo dev in 2 months
    → Time spent: 1.5 days

/explore "a bullet hell with rhythm game elements"
    → REPORT.md: NEEDS_WORK — fun concept but controls feel unresponsive
    → Time spent: 2 days
```

### Workflow Selection

```
/gate-check workflow-selection
    → Team size: Solo (0)
    → Timeline: Short — under 3 months (0)
    → Design clarity: Rough concept (0)
    → External requirements: None (0)
    → Experience: Small games — jams only (1)
    → Score: 1/15 → **Hybrid**
```

### Result

**Chosen workflow**: Hybrid
**Rationale**: Solo dev, short timeline, no external requirements. Full OCGS
would burn half his timeline in process overhead.

**Liam's path:**
1. `/brainstorm "time-rewind platformer"` — formalize the concept (1 day)
2. `/hybrid-prototype "time-rewind platformer"` — build vertical slice (3 days)
3. Playtest with 3 friends — fun validated
4. `/gate-check` → enter Hybrid Production mode
5. Build core game in 4 weeks with `gameplay-programmer` and `game-designer`
6. Week 7-8: polish, balance, release

**Outcome**: Shipped on itch.io at week 8. $200 revenue. Liam learned that
the time-rewind mechanic is worth building a bigger game around.

---

## Case Study 2: Funded Team of 8, 12-Month Timeline

**Team**: Stellar Forge Games, 8 people
**Experience**: 3 shipped titles between them
**Timeline**: 12 months
**Budget**: $150,000 (publisher-funded)
**Ideas**: 2 prototypes explored via `/explore`

### Exploration Phase

The team spent 3 weeks exploring 2 concepts:

```
/explore "co-op spaceship management with crew roles"
    → REPORT.md: PROMISING — strong emergent gameplay, clear roles
    → Time spent: 3 days

/explore "single-player space trading with combat"
    → REPORT.md: PROMISING — solid gameplay loop but less unique
    → Time spent: 2 days
```

### Workflow Selection

```
/gate-check workflow-selection
    → Team size: Medium team — 6-10 (2)
    → Timeline: Long — 6-12 months (2)
    → Design clarity: Some systems — core loop + 2-3 systems sketched (1)
    → External requirements: Contractual — signed milestone deliverables (2)
    → Experience: Experienced — shipped 1-3 commercial titles (2)
    → Score: 9/15 → **Hybrid with upgrade path**
```

### Result

**Chosen workflow**: Hybrid (with upgrade path to Full OCGS)
**Rationale**: Score is in the mid-range. The team size and publisher
requirements push toward Full, but the design isn't fully documented yet.
Start Hybrid, formalize quickly, then upgrade.

**The team's path:**
1. `/brainstorm "co-op spaceship management"` — formalize concept (2 days)
2. Write GDDs for core systems: ship management, crew roles, missions (2 weeks)
3. Build vertical slice in 6 weeks via `/hybrid-prototype`
4. Publisher signs off on vertical slice — milestone achieved
5. Upgrade to Full OCGS at month 3:
   - `/architecture-decision` × 6 (networking, save/load, state management, etc.)
   - `/create-control-manifest` for programmer rules
   - Enable full QA pipeline
6. Production sprints (months 4-10) with `/team-combat`, `/team-narrative`, etc.
7. Polish months 11-12 with `/perf-profile`, playtesting, localization

**Outcome**: On track for milestone delivery. The upgrade from Hybrid to Full
at month 3 was smooth because the team had already documented GDDs and ADRs.
The publisher receives monthly milestone reports with `/milestone-review`.

---

## Case Study 3: Solo-to-Team, Scope Creep, 4-Month Timeline

**Developer**: Priya, solo founder → building a team
**Experience**: Shipped 2 commercial mobile games
**Timeline**: Originally 4 months, scope inflated to 8 months
**Ideas**: 1 concept, started building immediately without exploration

### The Problem

Priya started building her game directly — no `/explore`, no workflow selection.
By month 3, she had:
- A partially working prototype in `src/` (mixed prototype and production code)
- 3 friends offering to help (team growing to 4)
- An exploding scope (originally a simple puzzle game, now with RPG systems)
- No GDDs, no ADRs, no sprint planning

### Workflow Selection (Retrospective)

If Priya had run `/gate-check workflow-selection` before starting:

```
/gate-check workflow-selection
    → Team size at start: Solo (0), now growing to 4
    → Timeline: Originally 4mo, now 8mo
    → Design clarity: Rough concept — "puzzle RPG" (0)
    → External requirements: None (0)
    → Experience: Experienced — 2 shipped titles (2)
    → Score if run at start: 2/15 → **Hybrid**
    → Score if run now with team: Would signal upgrade needed
```

### Recovery Path

Priya runs `/gate-check workflow-selection` at month 3 (current state):

```
    → Team size: Small team — 2-5 (1)
    → Timeline: Medium — 3-6 months, trending to 8 (2)
    → Design clarity: Some systems — core + 2 RPG systems (1)
    → External requirements: None (0)
    → Experience: Experienced — 2 shipped (2)
    → Score: 6/15 → **Hybrid with upgrade path**
```

**Recommended path:**
1. **Stop coding.** Run `/project-stage-detect` + `/adopt` to assess what exists
2. **Separate prototype code from production code**:
   - Move `src/` code to `prototypes/archive/mvp/`
   - Start fresh `src/` with proper structure
3. **Formalize the design**:
   - `/brainstorm "puzzle RPG with crafting"` — get pillars down
   - `/design-system puzzle-core` — write a proper GDD
   - `/design-system crafting` — optional, defer if not MVP
4. **Upgrade to Full OCGS** (score 6 and growing team signal this):
   - `/create-architecture` — data flow between puzzle and RPG systems
   - `/architecture-decision` × 3-4 core decisions
   - `/create-control-manifest` for the new team members
5. **Onboard the team**:
   - `/onboard gameplay-programmer` — new team member orientation
   - `/sprint-plan new` — first sprint with realistic scope

**Upgrade trigger**: Team growing beyond solo, scope inflating, timeline
extending. The workflow selection at month 3 correctly identifies the need
for more structure, even though it started as a solo Hybrid project.

### Lessons

- **Prototype before committing**: Even experienced devs benefit from `/explore`
- **Re-run workflow selection when conditions change**: Team size, timeline,
  and scope are all dynamic
- **It's never too late**: Priya caught the problem at month 3 instead of
  month 8. The recovery path is clear even mid-project.

---

## Upgrade Trigger Reference

When any of these conditions become true, re-run `/gate-check workflow-selection`
to reassess:

| Trigger | What changed | New recommendation |
|---------|-------------|-------------------|
| Team grows from 1 → 3+ | Score +1 to +2 | Hybrid → Hybrid with upgrade |
| Team grows from 3 → 6+ | Score +1 to +2 | Hybrid → Full OCGS |
| Timeline extends past 6 months | Score +1 to +2 | Hybrid → Full OCGS |
| Publisher signs on | Score +2 | Hybrid → Full OCGS |
| Design scope doubles | Score +1 | Stay hybrid, but formalize |
| Need multiplayer or live ops | +1 per requirement | Push toward Full OCGS |
| First playtest fails | No score change | Rerun `/explore`, don't upgrade |
| Team consistently misses sprints | No score change | Upgrade to Full for process help |

---

## See Also

- `docs/hybrid-workflow.md` — Hybrid workflow overview and comparison
- `docs/workflow-transitions.md` — How to transition between workflows
- `.opencode/skills/gate-check/SKILL.md` — Workflow Selection gate implementation