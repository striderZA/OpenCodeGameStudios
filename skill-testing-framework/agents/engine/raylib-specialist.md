# Agent Test Spec: raylib-specialist

## Agent Summary
Domain: raylib-specific patterns, C/C++ architecture, raylib modules (core, rlgl, raudio, raymath, rtext, rtextures, rmodels), and build integration.
Does NOT own: gameplay design decisions or non-raylib engine advice.
No gate IDs assigned.

---

## Static Assertions (Structural)

- [ ] `description:` field is present and domain-specific (references raylib / C / C++)
- [ ] Agent definition references `docs/engine-reference/raylib/VERSION.md` as the authoritative API source
- [ ] Agent definition covers core, rlgl, raudio, raymath, raygui, and platform guidance
- [ ] Agent definition includes a delegation boundary for gameplay and non-raylib work

---

## Test Cases

### Case 1: In-domain request — appropriate output
**Input:** "How should I structure the game loop and asset loading in raylib?"
**Expected behavior:**
- Describes a `InitWindow` → main loop → `CloseWindow` lifecycle
- Loads assets once during initialization and unloads them at shutdown
- Separates update, draw, and input handling
- Notes the target raylib version and relevant module APIs

### Case 2: Wrong-engine redirect
**Input:** "Create a Unity MonoBehaviour for this player controller."
**Expected behavior:**
- Does NOT produce Unity C# code
- Identifies that this is a Unity pattern, not a raylib pattern
- Maps the concept to a raylib update function and struct-based state
- Confirms the project is raylib-based before proceeding

### Case 3: Post-cutoff API risk
**Input:** "Use the new raylib 5.5 API for this feature."
**Expected behavior:**
- Checks `docs/engine-reference/raylib/VERSION.md` and module docs
- Flags any API that may have changed after the model's training cutoff
- Distinguishes verified 5.5 behavior from best-effort guidance
- Marks unverified guidance explicitly

### Case 4: Boundary enforcement
**Input:** "Pick the progression curve and implement it in raylib."
**Expected behavior:**
- Refers progression/economy design to `game-designer` or `systems-designer`
- Limits its own contribution to raylib implementation patterns
- Does not invent balance values or override the design owner
