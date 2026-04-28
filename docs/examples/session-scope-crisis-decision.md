# Example Session: Scope Crisis - Strategic Decision Making

**Context:** Solo indie dev, week 8 of project (month 2), approaching Alpha milestone.

**Crisis:**
- Alpha milestone is in 2 weeks
- Crafting system (Pillar 2) not yet implemented
- Lead programmer says full crafting will take 3 weeks
- Investor demo at Alpha - must show all pillars

**Session Duration:** ~25 minutes
**Turns:** 8
**Outcome:** Strategic scope decision with documented ADR

---

## Turn 1: User Escalates Problem to Creative Director

**User:**
> We have a problem. Alpha is in 2 weeks. The crafting system (Pillar 2 "Emergent Discovery") isn't implemented yet. Lead programmer says it'll take 3 weeks to implement fully. But the investor demo is at Alpha and they need to see both pillars (Combat + Crafting). What should I do?

## Turn 2: Creative Director Gathers Full Context

**Agent (creative-director):**
> This is a classic pillar vs. schedule conflict - exactly what I'm here to help resolve. Let me gather the full context before recommending options.
>
> First, let me review the relevant documents:
> - `production/milestones/alpha.md` (milestone definition)
> - `design/pillars.md` (what's non-negotiable)
> - `design/gdd/crafting-system.md` (what was designed)
> - `production/sprints/sprint-current.md` (current work)
>
> [Reads documents]
>
> **Context Understood:**
> - Pillar 2: "Emergent Discovery Through Experimentation" (crafting is primary expression)
> - Alpha success criteria: "All pillars demonstrated in playable form"
> - Investor demo purpose: Validate vision and secure next funding round
> - Current crafting design: Tag-based deduction system with 12 tags, ~50 recipes, progressive hint unlocking
>
> **Clarifying Questions:**
> 1. Is the Alpha date **hard** (investor won't reschedule) or **soft** (we could ask for 1 more week)?
> 2. What's the **minimum crafting** that still demonstrates Pillar 2? (One recipe? Ten recipes? Full tag system?)
> 3. What **breaks** if crafting is cut entirely from Alpha? (Does the game still make sense?)
> 4. How **critical** is this investor relationship? (Nice-to-have funding vs. make-or-break for project survival?)
> 5. What's the **team status**? (Burned out from crunch? Fresh and could push if needed?)

## Turn 3: User Provides Decision Context

**User:**
> 1. Hard date - investor flying in specifically for demo, can't reschedule
> 2. I think minimum is: discovery mechanic working (tag system) + 10 recipes. Doesn't need polish.
> 3. Without crafting, Alpha only shows combat. That's 50% of the vision - investor might think it's just another combat game
> 4. Make-or-break. This investor is our only lead. No funding = project dies.
> 5. Just me solo, I'm not burned out yet.

## Turn 4: Creative Director Frames the Decision

**Agent:**
> Thank you. Now I understand what's truly at stake. Let me frame this decision properly:
>
> **The Core Question:**
> Do we deliver full crafting and slip Alpha, deliver simplified crafting and make Alpha, or cut crafting and risk the investor not seeing our full vision?
>
> **What's Really at Stake:**
> - **Vision Integrity**: Can investor see Pillar 2 at all?
> - **Schedule Trust**: Do we keep our commitment to Alpha date?
> - **Project Survival**: No funding = no game
> - **Quality Standards**: Is "rough but working" acceptable for this demo?
>
> **Decision Criteria (in priority order for this scenario):**
> 1. **Investor Confidence** (highest - project survival depends on this)
> 2. **Pillar Representation** (high - they need to see the full vision)
> 3. **Schedule Integrity** (medium - matters, but less than funding)
> 4. **Polish Quality** (lowest - vertical slice can be rough)
>
> Now let me present three strategic options...

## Turn 5: Creative Director Presents Options with Analysis

**Agent:**
> **Option A: Implement Full Crafting System (3 weeks, slip Alpha by 1 week)**
>
> **Execution:**
> - Implement complete tag-based system with all 50 recipes
> - Full UI polish, all features from GDD
> - Miss Alpha date, reschedule investor demo (+1 week)
>
> **Pros:**
> - ✅ Pillar 2 fully represented with production quality
> - ✅ No design compromises
> - ✅ First impression is polished
>
> **Cons:**
> - ❌ Breaks investor commitment (they're flying in for the original date)
> - ❌ Signals schedule management issues ("if they slipped Alpha, will they slip release?")
> - ❌ May damage investor trust more than rough demo would
>
> **Risk: CRITICAL**
> - Investor may not reschedule (busy schedule, other opportunities)
> - Even if they do, the slip damages credibility
> - Unlikely to succeed given hard date constraint
>
> **Verdict: NOT RECOMMENDED** - The date is hard and non-negotiable
>
> ---
>
> **Option B: Simplify Crafting to Core Pillar (1.5 weeks, make Alpha)**
>
> **Execution:**
> - Implement core tag discovery mechanic ONLY
> - 10 recipes instead of 50 (enough to demonstrate the system)
> - Basic UI (functional, not polished)
> - No progressive hint unlock (all tags visible at Skill 0 for demo clarity)
> - No failed-attempt feedback system (just success/fail)
>
> **Scope: "Vertical Slice of Pillar 2"**
> - Players CAN discover recipes by combining tagged ingredients
> - Players CAN learn tag patterns and deduce new recipes
> - The SOUL of Pillar 2 is present, just unpolished
>
> **Pros:**
> - ✅ Makes Alpha deadline (schedule integrity maintained)
> - ✅ Pillar 2 demonstrated (investor sees full vision)
> - ✅ Core mechanic is playable and provable
> - ✅ Can use "Alpha → Beta improvement" as narrative ("here's rough, here's polished")
>
> **Cons:**
> - ⚠️ First impression is "rough" (but vertical slices are expected to be rough)
> - ⚠️ Investor might think "this feels small" (mitigation: present roadmap showing post-Alpha expansion)
>
> **Risk: MEDIUM**
> - Investor might not "get" the pillar from 10 recipes (mitigation: good demo script explaining the vision)
> - Might feel incomplete (mitigation: frame as "vertical slice proving the concept")
>
> **Verdict: RECOMMENDED** - Balances all constraints
>
> ---
>
> **Option C: Cut Crafting from Alpha, Focus on Combat Polish (0 weeks, make Alpha)**
>
> **Execution:**
> - Deliver Alpha with only Pillar 1 (Combat) fully polished
> - Use extra 2 weeks to super-polish combat, add content, make it shine
> - Present crafting as "design doc + concept art" (not playable)
>
> **Pros:**
> - ✅ Makes deadline with zero stress
> - ✅ What's there is AAA-polished
> - ✅ No risk of "half-baked" perception
>
> **Cons:**
> - ❌ Pillar 2 not demonstrated (50% of vision missing)
> - ❌ Investor sees "another combat game" - not differentiated
> - ❌ Harder to secure funding for "potential" vs. "proven concept"
> - ❌ If combat alone doesn't wow them, we have no fallback
>
> **Risk: HIGH**
> - Investor won't see what makes this game special
> - They might think "Combat is fine, but where's the hook?"
> - Competing games have combat - we need to show our differentiator
>
> **Verdict: NOT RECOMMENDED** - Too risky for make-or-break demo
>
> ---
>
> ## My Recommendation: Option B (Simplified Crafting Core)
>
> **Reasoning:**
> 1. **Investor Confidence**: Making the date we committed to shows reliability
> 2. **Pillar Visibility**: Rough but working > polished but missing. Investors back VISION, not polish.
> 3. **Demo Narrative**: "Here's Alpha vs. Beta progression" is compelling - shows trajectory
> 4. **Risk Mitigation**: If crafting doesn't land, combat is still solid. If we cut crafting (Option C) and combat doesn't wow them alone, we have nothing.
> 5. **Historical Precedent**: Hades, Dead Cells, Slay the Spire all showed rough Early Access verticals and investors loved the SYSTEMS over polish
>
> **What Option B Sacrifices:**
> - Polish (acceptable for vertical slice)
> - Feature completeness (50 recipes → 10)
> - Progressive unlocks (deferred to post-Alpha)
>
> **What Option B Protects:**
> - Schedule trust
> - Pillar representation
> - Vision clarity
> - Project survival (funding secured)
>
> **Implementation Plan if you choose Option B:**
> 1. I'll create an ADR documenting this scope decision
> 2. I'll update `design/gdd/crafting-system.md` with "Alpha Scope" markers
> 3. I'll brief gameplay-programmer on simplified implementation
> 4. I'll create a demo script for you: how to PRESENT the 10-recipe system to show the 50-recipe vision
>
> **But this is your call.** You know this investor better than I do. If you believe they'll value polish over pillar representation, Option C might be right. If you think they'll forgive a 1-week slip, Option A is safest creatively.
>
> What's your decision?

## Turn 6: User Makes Decision

**User:**
> Option B. The investor is technical and will appreciate the systems thinking even if it's rough. Let's simplify the crafting scope to make Alpha. Can you create the ADR and update the GDD?

## Turn 7: Creative Director Documents Decision

**Agent:**
> Excellent decision. I'll document this thoroughly so future-you understands why we made this choice.
>
> **Creating:**
> 1. ADR-007: Alpha Crafting Scope Reduction
> 2. Updated design/gdd/crafting-system.md with Alpha/Beta scope markers
> 3. Updated production/milestones/alpha.md success criteria
> 4. Demo script guidance for investor presentation
>
> [Creates documents]
>
> **ADR Summary:**
> ```markdown
> ## Decision
> Simplify crafting system to core tag discovery mechanic (10 recipes)
> for Alpha milestone. Defer full implementation (50 recipes + progressive
> unlocks) to post-Alpha.
>
> ## Context
> - Alpha in 2 weeks (hard date, investor demo)
> - Full crafting requires 3 weeks
> - Investor demo is make-or-break for funding
>
> ## Consequences
> Positive:
> - Makes Alpha deadline, preserves investor trust
> - Both pillars demonstrated (rough but playable)
> - Can show Alpha→Beta improvement narrative
>
> Negative:
> - First impression is "rough"
> - Limited recipe variety
> - Missing progressive unlock system
>
> ## Validation Criteria
> We'll know this was the right choice if:
> - Investor demo successfully shows both pillars
> - Funding secured for next development phase
> - Post-Alpha sprint can implement full system without rework
> ```
>
> **Updated GDD Markers:**
> ```markdown
> ## Detailed Rules
>
> ### Core Loop (**ALPHA SCOPE**)
> [Core mechanic description]
>
> ### Progressive Unlocks (**POST-ALPHA**)
> [Skill-based hint system - deferred]
>
> ### Recipe Catalog
> - Alpha: 10 recipes (demonstrates tag variety)
> - Beta: 50 recipes (full content)
> ```
>
> **Demo Script Guidance:**
> ```markdown
> ## Presenting Crafting to Investor (10-recipe Alpha)
>
> **Frame it as proof-of-concept:**
> "This is a vertical slice of the crafting pillar. You'll see 10 recipes
> here, but the SYSTEM supports unlimited recipes through tag combinations.
> Watch how players deduce patterns..."
>
> **Show, don't tell:**
> - Live demo: Discover 2 recipes on the fly
> - Explain: "Notice Fire+Water made Steam Potion. Now the player knows
>   Fire+Water is valid. They can deduce that Fire+Earth might work..."
> - Connect to pillar: "This is Emergent Discovery - the game teaches rules,
>   players become scientists."
>
> **Roadmap slide:**
> "Alpha: 10 recipes (proof of concept)
>  Beta: 50 recipes (content expansion)
>  Release: 100+ recipes (includes community-designed recipes)"
>
> **Emphasize systems:**
> "We're not making a content game, we're making a systems game. The tag
> system can generate endless combinations. We're building a platform for
> discovery, not a recipe database."
> ```
>
> May I proceed to write these documents?

## Turn 8: User Approves and Agent Completes

**User:**
> Yes, create all those documents and also notify the gameplay-programmer about the scope change.

**Agent:**
> ✅ Complete! Created/Updated:
> - `docs/architecture/adr-007-alpha-crafting-scope.md`
> - `design/gdd/crafting-system.md` (added Alpha/Beta scope markers)
> - `production/milestones/alpha.md` (updated success criteria)
> - `production/demo-script-investor-alpha.md` (new file with presentation guide)
>
> **Notifications Sent:**
>
> To `gameplay-programmer`:
> > "Crafting scope simplified for Alpha: Core tag mechanic + 10 recipes only.
> > Progressive unlocks and full recipe set deferred to post-Alpha. Updated
> > GDD has implementation guidance. Estimated 1.5 weeks to implement Alpha scope."
>
> To `producer`:
> > "Strategic decision made: Simplified crafting to make Alpha deadline.
> > ADR-007 documents rationale. Sprint plan needs updating to reflect new scope."
>
> **Next Steps:**
> 1. Gameplay-programmer can start implementing simplified crafting
> 2. You can practice demo script before investor meeting
> 3. Producer will update sprint plan with new task breakdown
>
> **Validation:**
> We'll know this decision was correct when:
> - Alpha ships on time with both pillars playable
> - Investor demo successfully communicates the vision
> - Funding secured for continued development
>
> Good luck with the demo! This was the right call - vision over polish for this audience.

---

## Session Summary

**What Worked Well:**
- Creative director read context docs before proposing solutions
- Asked 5 clarifying questions to understand constraints
- Framed decision properly (what's at stake, evaluation criteria)
- Presented 3 distinct options with honest pros/cons
- Made clear recommendation with reasoning, but deferred to user
- Documented decision thoroughly with ADR and updated all affected docs
- Provided demo script to help user present the decision positively

**Key Collaborative Moments:**
- Turn 2: Agent gathered full context before jumping to solutions
- Turn 3: User provided decision criteria priority (funding > schedule > polish)
- Turn 5: Agent presented 3 options, made recommendation, but explicitly "this is your call"
- Turn 6: User made strategic decision
- Turn 7: Agent provided demo script to support user's presentation
- Turn 8: Agent cascaded decision to affected parties

**Strategic Decision Quality:**
- User made the final call
- Agent provided expert analysis using game dev theory and precedent
- Trade-offs were explicit and honest
- Decision was documented for future reference
- Success criteria defined for validation

**Files Created/Updated:**
- ADR-007 (decision record)
- Updated crafting GDD with scope markers
- Updated Alpha milestone definition
- Demo script for investor presentation

**Context Usage:** ~30%
**User Satisfaction:** High - confident decision made with full information
