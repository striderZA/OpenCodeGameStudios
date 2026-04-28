# Game Concept Document

## The 19th Hole

**Version**: 1.0  
**Date**: 2026-04-28  
**Status**: Concept Approved  

---

## Core Identity

| Field | Value |
|-------|-------|
| **Working Title** | The 19th Hole |
| **Genre** | Cozy Golf Course Management |
| **Core Verb** | Design |
| **Core Fantasy** | Being a course architect who walks their own fairways |
| **Unique Hook** | Like SimGolf, AND ALSO with modern cozy aesthetics, deeper terrain tools, and a hands-on "feel the design" play mode |
| **Primary MDA Aesthetic** | Expression |
| **Estimated Scope** | Medium (4–6 months for V1.0, 8–12 months for full vision, solo) |
| **Target Platform** | PC (Steam / Epic) |
| **Engine** | Godot |
| **Art Direction** | 2D isometric (dimetric projection) pixel art |

---

## Elevator Pitch

Design golf holes, watch AI golfers play them, then tee off yourself to feel every ridge and break you sculpted.

---

## Core Fantasy & Unique Hook

**Core Fantasy**: The player is a golf course architect whose creative vision comes to life not just on paper, but on the fairway. Every bunker placed, every green contoured, every tree positioned is a design decision that can be *felt* when the player walks the course themselves.

**Unique Hook**: A direct spiritual successor to SimGolf that modernizes the cozy management formula with accessible design tools, warm pixel-art aesthetics, and a tight loop of designing, observing, playing, and iterating.

---

## Visual Identity Anchor

**Selected Direction**: Cozy Pixel Isometric

**One-line visual rule**: Every course should look like a handcrafted diorama you want to zoom into and explore.

**Supporting principles**:
- **Readable terrain hierarchy** — Fairway, rough, green, bunker, and water must be distinguishable at a glance through color and texture. *Design test: Can a player screenshot a hole and immediately understand how it plays?*
- **Warm, nostalgic palette** — Soft greens, golden fairways, and sky blues that evoke a perfect Sunday morning. Avoid harsh neons or muddy browns. *Design test: Does the screenshot make someone want to play?*
- **Living details without noise** — Gentle tree sway, water sparkle, and golfer idle animations bring the world alive, but never clutter the strategic readability. *Design test: Can the player focus on a design decision without visual distraction?*

**Color philosophy**: The palette leans warm and inviting. Think late-summer afternoon light — not sterile country-club perfection, but the charm of a well-loved municipal course.

---

## Game Pillars

### Pillar 1: Design is the Game
*The core experience is course design. Every system — tools, feedback, progression — must serve the design loop first.*

**Design test**: If we're debating between a feature that makes designing more fun vs. a feature that makes watching AI more fun, we choose the design feature.

### Pillar 2: Feel the Fairways
*Players must be able to play their own courses and physically feel the design decisions they made — every ridge, break, and bunker placement.*

**Design test**: If a design tool doesn't produce a perceivable difference when played, it doesn't belong in the core toolset.

### Pillar 3: Cozy, Not Cutthroat
*The tone is warm, inviting, and relaxing. There are no harsh failure states, no bankruptcy screens, no losing.*

**Design test**: If a system introduces anxiety, stress, or punishment, we either soften it or cut it.

### Pillar 4: Readable Beauty
*The visual design makes course strategy immediately readable. Beauty and function are inseparable — a pretty hole that hides its design intent is a failure.*

**Design test**: If a player can't glance at a hole and understand how it will play, the visuals need to change.

### Pillar 5: Iterative Mastery
*The loop of design → observe → refine is the primary progression. The game gets deeper as the player's understanding grows, not just their unlocks.*

**Design test**: If a progression system replaces skill growth with power growth, we redesign it.

---

## Anti-Pillars

1. **We will NOT have complex financial simulation or business management** — because it would compromise *Design is the Game*. Budget exists as a soft constraint, not a spreadsheet.
2. **We will NOT have competitive multiplayer or leaderboards** — because it would compromise *Cozy, Not Cutthroat*. The game is a personal creative space.
3. **We will NOT have realistic, skill-based golf swing mechanics** — because it would compromise *Design is the Game*. Playing the course should be accessible, not a test of player golf skill.
4. **We will NOT have punishing difficulty or fail states** — because it would compromise *Cozy, Not Cutthroat*. A "bad" hole is an opportunity, not a disaster.

---

## Core Loop

### 30-Second Loop (Moment-to-Moment)
**Core action feel**: Satisfying snap-to-grid placement with clean geometry, where every tile placement has ripple effects on play — wind, drainage, golfer psychology.

**Key design dimension**: A balanced loop: watch AI for feedback, then play to feel the design. Observe AI rounds to spot issues, then play yourself to validate the fix.

**Action satisfaction analysis**: This works because it hits multiple satisfaction layers:
- **Visual clarity**: Snap-to-grid makes the course readable and cozy
- **Tactical depth**: Cause-and-effect chains make placement meaningful
- **Juice**: Immediate terrain deformation and environmental feedback
- **Agency**: The player is both architect and test pilot

### 5-Minute Loop (Short-Term Goals)
- **Design a hole → Watch AI test it → Adjust based on behavior → Play it yourself → Tweak again**
- The "one more hole" psychology kicks in because each hole is a self-contained puzzle: can I make this par-4 both strategic and beautiful?
- Choices at this level: routing, hazard placement, green shaping, and landscaping

### Session Loop (30–120 Minutes)
- **Build or renovate a 9-hole course** — design 2–3 new holes, iterate on existing ones, watch a full tournament round
- **Natural stopping points**: After completing a hole, after a full 9-hole review, or after playing a round yourself
- **The hook**: The gap between "this hole looks right" and "let's see if it plays right" — you think about pin positions and bunker placements between sessions

### Progression Loop (Days/Weeks)
- **Power**: Unlock new terrain types, landscaping options, and course features (water hazards, doglegs, tiered greens)
- **Knowledge**: Learn how different golfer archetypes interact with your designs
- **Options**: Expand from a 3-hole practice course to a full 18-hole championship layout
- **Long-term goal**: Build a world-renowned course — or a beloved local hidden gem
- **When is the game "done"?** When the player has designed their dream 18-hole course and can play it front-to-back with satisfaction

---

## MDA Analysis

### Mechanics
- Tile-based course design with snap-to-grid placement
- Terrain sculpting (raise/lower, paint terrain types)
- Golf ball physics simulation on sculpted terrain
- AI golfer behavior system with archetypes
- Playable golf mode with simplified controls
- Progression/unlock system for tools and terrain types

### Dynamics
- Emergent golf drama from player-designed terrain (bunker saves, water hazards, green breaks)
- AI feedback loop revealing design strengths and weaknesses
- Iterative refinement cycle driven by observation and play
- Unlock pacing that introduces complexity gradually

### Aesthetics
- **Expression (Primary)**: The dominant aesthetic. Players express themselves through course design.
- **Discovery (Secondary)**: Learning how terrain shapes affect play, unlocking new tools, finding optimal designs.
- **Submission (Supporting)**: The cozy, meditative pace allows players to enter a flow state.

---

## Player Motivation Profile

### Self-Determination Theory

**Autonomy**: High — the player has near-total control over course design, from macro routing to micro green contours.

**Competence**: Medium-High — competence grows through observing AI succeed or struggle, then iterating. The "aha!" moment when a design change fixes a bottleneck is deeply satisfying.

**Relatedness**: Low-Medium — primarily a single-player experience, but AI golfers can have personalities and the player's course can develop a reputation among virtual golfers.

---

## Flow State Design

The game is designed to induce flow through:
- **Clear goals**: Each hole has a par target and design constraints
- **Immediate feedback**: AI rounds and playable mode provide instant validation
- **Balanced challenge**: The design puzzle is always solvable but never trivial
- **Sense of control**: The player has full authority over the design space
- **Loss of self-consciousness**: The cozy aesthetic and absence of failure states remove performance anxiety
- **Time distortion**: The "one more hole" loop naturally extends sessions

---

## Player Type Validation

### Bartle Taxonomy
- **Primary: Creators** — Players who lose hours in terrain tools, house builders, and level editors. The "play your own course" loop is the payoff that pure creators often miss.
- **Secondary: Explorers** — Players who enjoy understanding systems and finding optimal solutions. Each hole is a design puzzle.
- **Tertiary: Achievers (soft)** — Players who enjoy progression and unlocking new tools, but achievement must serve creation.

### Quantic Foundry Motivations
- **Expression** (Primary)
- **Discovery** (Secondary)
- **Strategy** (Supporting)

### Who This Game Is NOT For
- **Competitors / Power gamers** — no PvP, no leaderboards, no difficulty spikes
- **Story-first players** — narrative is ambient, not driving
- **Action-seekers** — the pace is deliberate, meditative, and iterative

### Market Validation
- *SimGolf* (2002) still has an active fan community 20+ years later — the audience exists and is underserved
- *PowerWash Simulator*, *Townscaper*, *Planet Zoo* prove a strong market for "cozy creation" games
- Golf is having a cultural moment, but no modern title serves the course-design fantasy

---

## Scope and Feasibility

### Art Pipeline
**2D isometric (dimetric projection) pixel art**
- Faster to produce than 3D for a solo dev
- Excellent terrain readability — critical for *Readable Beauty* pillar
- Cozy pixel aesthetic aligns with warm, nostalgic tone
- Dimetric projection avoids pixel distortion issues of true isometric

### Content Scope (Full Vision)
- 3–5 distinct courses (9–18 holes each)
- 20+ terrain/decoration types
- 5–8 golfer archetypes with distinct AI behaviors
- 8–12 hours of meaningful progression

### MVP Definition
> "Is designing a golf hole and then playing it fun?"

**MVP content:**
- 1 course, 3 holes
- Basic terrain tools (raise/lower, paint fairway/green/rough/bunker)
- 1 golfer AI archetype
- Simple playable golf mode (click-to-aim, auto-swing with terrain affecting ball roll)
- Basic camera and UI

### Biggest Risks

**Technical**: Golf ball physics and AI pathfinding on player-sculpted terrain is the hardest engineering problem. Terrain needs to be queryable for slope, lie quality, and obstacle detection in real-time.

**Design**: Giving players creative freedom while ensuring every design produces a *playable* hole. The "bad design" failure case must be educational, not frustrating.

**Market**: SimGolf nostalgia is real but niche. The game needs to reach cozy-management fans who never played the original.

### Scope Tiers

| Tier | What Ships | Timeline |
|------|-----------|----------|
| **MVP** | 1 course, 3 holes, core tools, 1 AI type | 1–2 months |
| **V1.0** | 3 courses, 9 holes each, all core tools, 4 AI types, progression | 4–6 months |
| **Full Vision** | 5 courses, 18 holes, advanced tools, 8 AI types, seasonal decor | 8–12 months |

---

## Target Platform & Engine

- **Platform**: PC (Steam / Epic)
- **Engine**: Godot (user preference)
- **Rationale**: Godot is lightweight, exports cleanly to PC, and is well-suited for 2D isometric games. The user has professional software development experience with some SFML background, making Godot's GDScript or C# accessible.

---

## Next Steps

1. Run `/setup-engine` to configure the engine and populate version-aware reference docs
2. Run `/art-bible` to create the visual identity specification — do this BEFORE writing GDDs
3. Use `/design-review design/gdd/game-concept.md` to validate concept completeness
4. Decompose the concept into individual systems with `/map-systems`
5. Author per-system GDDs with `/design-system`
6. Plan the technical architecture with `/create-architecture`
7. Record key architectural decisions with `/architecture-decision`
8. Validate readiness to advance with `/gate-check`
9. Prototype the riskiest system with `/prototype`
10. Run `/playtest-report` after the prototype
11. Plan the first sprint with `/sprint-plan new`

---

*Document generated by OpenCode Game Studios brainstorming workflow.*
*Review mode: lean*
