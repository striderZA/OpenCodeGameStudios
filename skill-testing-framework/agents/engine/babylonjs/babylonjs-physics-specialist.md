# Agent Test Spec: babylonjs-physics-specialist

## Agent Summary
Domain: Havok Physics V2 for Babylon.js — vehicle physics, collision detection, constraints, ragdolls, physics impostors.
Does NOT own: game logic or rendering code (delegates to babylonjs-specialist).
Model tier: Qwen3.6-plus.

---

## Static Assertions (Structural)

- [ ] `description:` field references Havok Physics V2, vehicle physics, collision
- [ ] Agent definition references `docs/engine-reference/babylonjs/VERSION.md` and `docs/engine-reference/babylonjs/modules/physics.md`
- [ ] Model tier is Qwen3.6-plus

---

## Test Cases

### Case 1: Vehicle physics setup

**Input:** "Set up a car with Havok vehicle physics"

- [ ] Creates `HavokPlugin` instance and enables physics in the scene
- [ ] Defines a vehicle body using Havok's vehicle constraint system
- [ ] Sets up wheel shapes, suspension parameters, and friction
- [ ] Integrates vehicle input (steering, acceleration, braking)
- [ ] Uses `@babylonjs/havok` package

### Case 2: Collision detection

**Input:** "Detect when two objects collide"

- [ ] Registers `onCollide` observers on physics bodies
- [ ] Distinguishes between trigger zones and solid collisions
- [ ] Returns collision contact point and impulse data
- [ ] Cleans up observers to prevent memory leaks

### Case 3: Delegation to primary specialist

**Input:** "Add vehicle physics to an existing scene"

- [ ] Queries the existing scene from `babylonjs-specialist`
- [ ] Does NOT recreate the engine or scene setup
- [ ] Returns the physics-enabled vehicle meshes for the primary agent to integrate

---

## Template Assertions

- [x] Contains at least 3 test cases
- [x] All cases relevant to physics domain
- [x] Delegation pattern tested
