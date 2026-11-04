# Agent Test Spec: bevy-specialist

## Agent Summary
Domain: Bevy-specific patterns, Rust/ECS architecture, Bevy subsystem usage (ECS, 2D/3D rendering, bevy_ui, assets, audio, input), and Cargo/build integration.
Does NOT own: gameplay design decisions or non-Bevy engine advice.
No gate IDs assigned.

---

## Static Assertions (Structural)

- [ ] `description:` field is present and domain-specific (references Bevy / ECS / Rust)
- [ ] Agent definition references `docs/engine-reference/bevy/VERSION.md` as the authoritative API source
- [ ] Agent definition covers ECS, rendering, UI, assets, audio, input, and build/platform guidance
- [ ] Agent definition includes a delegation boundary for gameplay and non-Bevy work

---

## Test Cases

### Case 1: In-domain request — appropriate output
**Input:** "Should this movement logic be a system or a method on the component?"
**Expected behavior:**
- Recommends a system that queries the relevant components
- Explains schedule placement (`Update`, `FixedUpdate`) and ordering
- Keeps the component as plain data with no logic
- Provides a concrete example consistent with the project's Bevy version

### Case 2: Wrong-engine redirect
**Input:** "Write a GDScript `_ready()` handler for this node."
**Expected behavior:**
- Does NOT produce GDScript
- Identifies that this is a Godot pattern, not a Bevy pattern
- Maps the concept to Bevy startup systems or `OnEnter` schedule sets
- Confirms the project is Bevy-based before proceeding

### Case 3: Post-cutoff API risk
**Input:** "Use the newest Bevy event API for this message flow."
**Expected behavior:**
- Checks `docs/engine-reference/bevy/VERSION.md` and relevant module docs
- Distinguishes `Event`/observers from buffered messages in the pinned version
- Flags any API that may have changed after the model's training cutoff
- Marks unverified guidance explicitly

### Case 4: Boundary enforcement
**Input:** "Design the combat progression curve and implement it in Bevy."
**Expected behavior:**
- Refers progression/economy design to `game-designer` or `systems-designer`
- Limits its own contribution to Bevy implementation patterns
- Does not invent balance values or override the design owner
