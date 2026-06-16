# Agent Test Spec: raylib-specialist

## Agent Summary
Domain: Raylib-specific patterns — core, rlgl, raudio, raymath, rtext, rtextures, rmodels. Guides C/C++ architecture, build integration, and raylib idioms.
Does NOT own: game logic design or engine selection (delegates to lead-programmer).
Model tier: Qwen3.6-plus (medium tier).
No gate IDs assigned.

---

## Static Assertions (Structural)

- [ ] `description:` field is present and domain-specific (references raylib modules, C/C++ architecture)
- [ ] `allowed-tools:` list includes Read, Write, Edit, Bash, Glob, Grep
- [ ] Model tier is Qwen3.6-plus (medium tier for engine specialists)
- [ ] Agent definition references `docs/engine-reference/raylib/VERSION.md` as the authoritative API source

---

## Test Cases

### Case 1: In-domain request — appropriate output
**Input:** "Initialize a window and draw a red rectangle that moves with arrow keys."
**Expected behavior:**
- Uses `InitWindow()` with width, height, and title
- Implements the main loop: `WindowShouldClose()` → `BeginDrawing()` → draw → `EndDrawing()`
- Uses `DrawRectangle()` with color parameter
- Reads keyboard input via `IsKeyDown()` with `KEY_RIGHT`/`KEY_LEFT`/`KEY_UP`/`KEY_DOWN`
- Calls `CloseWindow()` after the loop

### Case 2: Wrong-engine redirect
**Input:** "Create a Unity prefab for the player character with a MonoBehaviour script."
**Expected behavior:**
- Does NOT produce Unity C# or prefab structure
- Clearly identifies this is a Unity-specific concept
- Provides the raylib equivalent: struct-based entity data + procedural drawing
- Notes that raylib has no component system or serialization — it's a library, not an engine
- Redirects to raylib's simpler manual approach

### Case 3: Module routing
**Input:** "I need to load a 3D model and play background music."
**Expected behavior:**
- Routes 3D model loading to rmodels module: `LoadModel()` / `DrawModel()`
- Routes audio to raudio module: `LoadMusicStream()` + `PlayMusicStream()`
- Notes the texture/material pipeline for models
- Does NOT attempt to combine both into a single monolithic response

### Case 4: Build integration
**Input:** "How do I set up raylib with my build system?"
**Expected behavior:**
- References available install methods: system package manager, vcpkg, or building from source
- Notes raylib's single-header convenience or standard CMake integration
- Includes compiler linker flags: `-lraylib -lm` (Linux) or equivalent per platform
- Points to `docs/engine-reference/raylib/VERSION.md` for version-specific setup

---

## Template Assertions

- [x] Contains at least 3 test cases
- [x] Test cases cover primary specialist responsibility
- [x] Wrong-engine redirect tested
- [x] Static assertions check frontmatter compliance
