# Agent Test Spec: babylonjs-specialist

## Agent Summary
Domain: Babylon.js-specific patterns, scene graph management, rendering pipeline configuration, TypeScript architecture, and engine integration decisions.
Does NOT own: language-specific deep dives (delegates to babylonjs-* sub-specialists).
Model tier: Qwen3.6-plus.

---

## Static Assertions (Structural)

- [ ] `description:` field is present and domain-specific (references Babylon.js scene / rendering / engine decisions)
- [ ] `allowed-tools:` list includes Read, Write, Edit, Bash, Glob, Grep
- [ ] Model tier is Qwen3.6-plus (medium tier for engine specialists)
- [ ] Agent definition references `docs/engine-reference/babylonjs/VERSION.md` as the authoritative API source

---

## Test Cases

### Case 1: Basic scene setup with TypeScript

**Input:** "Set up a Babylon.js scene with a camera, light, and ground plane"

- [ ] Suggests creating an `Engine` instance with a canvas element
- [ ] Creates a `Scene` and attaches render loop
- [ ] Uses `FreeCamera` or `ArcRotateCamera` with `attachControl()`
- [ ] Adds `HemisphericLight` or `DirectionalLight`
- [ ] Creates ground plane via `MeshBuilder.CreateGround()`
- [ ] Uses proper import paths from `@babylonjs/core`

### Case 2: Asset loading with SceneLoader

**Input:** "Load a .glb model into the scene"

- [ ] Uses `SceneLoader.ImportMesh()` or `LoadAssetContainer()`
- [ ] Handles success callback with mesh positioning
- [ ] Shows error handling for failed loads
- [ ] References `@babylonjs/core/Loading/loadingScreen` if progress UI is needed

### Case 3: Multi-sub-specialist delegation

**Input:** "Add Havok physics to the car and a multiplayer lobby UI"

- [ ] Delegates physics to `babylonjs-physics-specialist`
- [ ] Delegates multiplayer to `babylonjs-network-specialist`
- [ ] Delegates lobby UI to `babylonjs-gui-specialist`
- [ ] Keeps ownership of overall scene coordination

---

## Template Assertions

- [x] Contains at least 3 test cases
- [x] Test cases cover primary specialist responsibility
- [x] One case explicitly tests sub-specialist delegation
- [x] Static assertions check frontmatter compliance
