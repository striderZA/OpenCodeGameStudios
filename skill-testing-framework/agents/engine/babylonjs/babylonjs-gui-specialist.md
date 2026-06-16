# Agent Test Spec: babylonjs-gui-specialist

## Agent Summary
Domain: Babylon.js AdvancedDynamicTexture GUI system — HUD controls, menus, buttons, sliders, input handling, screen adaptation.
Does NOT own: 3D scene rendering or game logic (delegates to babylonjs-specialist).
Model tier: Qwen3.6-plus.

---

## Static Assertions (Structural)

- [ ] `description:` field references AdvancedDynamicTexture, HUD, GUI
- [ ] Agent definition references `docs/engine-reference/babylonjs/modules/ui.md`
- [ ] Model tier is Qwen3.6-plus

---

## Test Cases

### Case 1: HUD creation

**Input:** "Create a HUD with health bar, score, and minimap"

- [ ] Uses `AdvancedDynamicTexture.CreateFullscreenUI()`
- [ ] Creates `Rectangle`, `TextBlock`, and `Image` controls
- [ ] Positions elements using absolute positioning or stack panels
- [ ] Updates text values on state change (health, score)
- [ ] Handles resolution independence

### Case 2: Interactive menu

**Input:** "Build a main menu with start, settings, and quit buttons"

- [ ] Uses `Button.CreateSimpleButton()` or `Button.CreateImageButton()`
- [ ] Attaches `onPointerUpObservable` for click handling
- [ ] Implements scene transitions on button actions
- [ ] Supports keyboard navigation for non-pointer input

### Case 3: Delegation to primary specialist

**Input:** "Add a pause menu overlay to the game scene"

- [ ] Coordinates with `babylonjs-specialist` for scene reference
- [ ] Creates the GUI layer without modifying the 3D scene setup
- [ ] Returns control references for the primary agent to wire up game state

---

## Template Assertions

- [x] Contains at least 3 test cases
- [x] Covers HUD and menu scenarios
- [x] Delegation pattern tested
