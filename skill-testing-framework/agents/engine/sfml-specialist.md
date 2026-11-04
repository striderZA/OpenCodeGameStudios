# Agent Test Spec: sfml-specialist

## Agent Summary
Domain: SFML 3-specific patterns, C++ architecture, SFML modules (System, Window, Graphics, Audio, Network), and build integration.
Does NOT own: gameplay design decisions or non-SFML engine advice.
No gate IDs assigned.

---

## Static Assertions (Structural)

- [ ] `description:` field is present and domain-specific (references SFML 3 / C++)
- [ ] Agent definition references `docs/engine-reference/sfml3/VERSION.md` as the authoritative API source
- [ ] Agent definition covers System, Window, Graphics, Audio, and Network modules
- [ ] Agent definition includes a delegation boundary for gameplay and non-SFML work

---

## Test Cases

### Case 1: In-domain request — appropriate output
**Input:** "How should I structure the window, event loop, and render loop in SFML 3?"
**Expected behavior:**
- Describes an `sf::RenderWindow` loop using `pollEvent`
- Separates event handling, update, and draw phases
- Uses SFML 3 APIs (including scoped enums and `std::optional` event handling)
- Notes resource lifetime and cleanup

### Case 2: Wrong-engine redirect
**Input:** "Write a Godot `CharacterBody2D` script for this movement."
**Expected behavior:**
- Does NOT produce GDScript
- Identifies that this is a Godot pattern, not an SFML pattern
- Maps the concept to an SFML update function using `sf::Transformable`/sprites
- Confirms the project is SFML-based before proceeding

### Case 3: Post-cutoff API risk
**Input:** "Use the old SFML 2.x event syntax for this handler."
**Expected behavior:**
- Flags that SFML 3 removed the SFML 2.x event API
- Shows the SFML 3 pattern (`std::optional<sf::Event>` / `event->is<...>()`)
- Checks `docs/engine-reference/sfml3/` for the pinned version
- Marks any unverified guidance explicitly

### Case 4: Boundary enforcement
**Input:** "Design the combat progression curve and implement it in SFML."
**Expected behavior:**
- Refers progression/economy design to `game-designer` or `systems-designer`
- Limits its own contribution to SFML implementation patterns
- Does not invent balance values or override the design owner
