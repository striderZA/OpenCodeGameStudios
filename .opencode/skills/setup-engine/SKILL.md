---
name: setup-engine
description: "Configure the project's game engine and version. Pins the engine in AGENTS.md (OpenCode) or CLAUDE.md (Claude Code), detects knowledge gaps, and populates engine reference docs via webfetch when the version is beyond the LLM's training data."
argument-hint: "[engine] | [engine version] | refresh | upgrade [old-version] [new-version] | no args for guided selection"
user-invocable: true
allowed-tools: Read, Glob, Grep, Write, Edit, webfetch, WebFetch, Task, question
---

When this skill is invoked:

## 1. Parse Arguments

Four modes:

- **Full spec**: `/setup-engine godot 4.6` — engine and version provided
- **Engine only**: `/setup-engine unity` — engine provided, version will be looked up
- **No args**: `/setup-engine` — fully guided mode (engine recommendation + version)
- **Refresh**: `/setup-engine refresh` — update reference docs (see Section 10)
- **Upgrade**: `/setup-engine upgrade [old-version] [new-version]` — migrate to a new engine version (see Section 11)

---

## 2. Guided Mode (No Arguments)

If no engine is specified, run an interactive engine selection process:

### Check for existing game concept
- Read `design/gdd/game-concept.md` if it exists — extract genre, scope, platform
  targets, art style, team size, and any engine recommendation from `/brainstorm`
- If no concept exists, inform the user:
  > "No game concept found. Consider running `/brainstorm` first to discover what
  > you want to build — it will also recommend an engine. Or tell me about your
  > game and I can help you pick."

### If the user wants to pick without a concept, ask in this order:

**Question 1 — Prior experience** (ask this first, always, via `question`):
- Prompt: "Have you worked in any of these engines before?"
- Options: `Godot` / `Unity` / `Unreal Engine 5` / `SFML 3 (C++ library)` / `Raylib (C/C++ library)` / `Babylon.js (TypeScript/WebGL)` / `Multiple — I'll explain` / `None of them`
- If they pick a specific engine → recommend that engine. Prior experience outweighs all other factors. Confirm with them and skip the matrix.
- If "None" or "Multiple" → continue to the questions below.

**Questions 2-6 — Decision matrix inputs** (only if no prior engine experience):

**Question 2 — Target platform** (ask this second, always, via `question` — platform eliminates or heavily weights engines before any other factor):
- Prompt: "What platforms are you targeting for this game?"
- Options: `PC (Steam / Epic)` / `Mobile (iOS / Android)` / `Console` / `Web / Browser` / `Multiple platforms`
- Platform rules that feed directly into the recommendation:
  - Mobile → Unity strongly preferred; Unreal is a poor fit; Godot is viable for simple mobile; SFML3 and Raylib require native compilation per platform (Android NDK, Emscripten for web) — significant extra effort
  - Console → Unity or Unreal; Godot and C++ library approaches require third-party publishers or significant porting work
  - Web → Babylon.js is the native web engine (no export step — runs in any browser); Godot exports cleanly to web; Unity WebGL is functional; Unreal has poor web support; Raylib has Emscripten support; SFML3 has no built-in web target
  - PC only → all engines viable including SFML3, Raylib, and Babylon.js (via Electron/Tauri); other factors decide
  - Multiple → Unity is the most portable across PC/mobile/console; SFML3/Raylib require per-platform build configuration; Babylon.js excels for web-first cross-platform with desktop wrappers

1. **What kind of game?** (2D, 3D, or both?)
2. **Primary input method?** (keyboard/mouse, gamepad, touch, or mixed?)
3. **Team size and experience?** (solo beginner, solo experienced, small team?)
4. **Any strong language preferences?** (GDScript, C#, C++, TypeScript, visual scripting?)
5. **Budget for engine licensing?** (free only, or commercial licenses OK?)

### Produce a recommendation

Do NOT use a simple scoring matrix that eliminates engines. Instead, reason through the user's profile against the honest tradeoffs below, then present 1-2 recommendations with full context. Always end with the user choosing — never force a verdict.

**Engine honest tradeoffs:**

**Godot 4**
- Genuine strengths: 2D (best in class), stylized/indie 3D, rapid iteration, free forever (MIT), open source, gentlest learning curve, best for solo devs who want full control
- Real limitations: 3D ecosystem is thin compared to Unity/Unreal (fewer tutorials, assets, community answers for 3D-specific problems); large open-world 3D is very hard and largely untested in Godot; console export requires third-party publishers or significant extra work; smaller professional job market
- Licensing reality: Truly free with no revenue thresholds ever. MIT license means you own everything.
- Best fit: 2D games of any scope; stylized/atmospheric 3D; contained 3D worlds (not open-world); first game projects where learning curve matters; projects where budget is a hard constraint at any scale

**Unity**
- Genuine strengths: Industry standard for mid-scope 3D and mobile; massive asset store and tutorial ecosystem; C# is a professional language; best console certification support for indie; strong community for almost every genre
- Real limitations: Licensing controversy in 2023 damaged trust (runtime fee was proposed then walked back — the risk of policy changes remains real); C# has a steeper initial curve than GDScript; heavier editor than Godot for simple projects
- Licensing reality: Free under $200K revenue AND 200K installs (Unity Personal/Plus). Only becomes costly if the game is genuinely successful — most indie games never hit this threshold. The 2023 controversy is worth knowing about but the actual current terms are reasonable for most indie developers.
- Best fit: Mobile games; mid-scope 3D; games targeting console; developers with C# background; projects needing large asset store; teams of 2-5

**Unreal Engine 5**
- Genuine strengths: Best-in-class 3D visuals (Lumen, Nanite, Chaos physics); industry standard for AAA and photorealistic 3D; large open-world support is mature and production-tested; Blueprint visual scripting lowers C++ barrier; strong for games targeting high-end PC or console
- Real limitations: Steepest learning curve; heaviest editor (slow compile times, large project sizes); overkill for stylized/2D/small-scope games; C++ is genuinely hard; not suitable for mobile or web; 5% royalty past $1M gross revenue
- Licensing reality: 5% royalty only applies AFTER $1M gross revenue per title. For a first game or any game that doesn't reach $1M, it costs nothing. This threshold is high enough that most indie developers will never pay it.
- Best fit: AAA-quality 3D; large open-world games; photorealistic visuals; developers with C++ experience or willing to use Blueprint; games targeting high-end PC/console where visual fidelity is a core selling point

**SFML 3**
- Genuine strengths: Full control over rendering pipeline (raw OpenGL 3.3+); lightweight and fast; C++17 modern idioms; modules are well-separated (Graphics, Audio, Network, Window, System); excellent for learning graphics programming; no runtime fees or licensing; tiny binary size
- Real limitations: No visual editor — everything is code; no built-in physics, UI system, or scene graph; no asset pipeline; desktop-only (no mobile/web support); minimal community compared to Godot/Unity; you must build your own tooling; steeper initial setup time
- Licensing reality: zlib/libpng license — completely free with no restrictions whatsoever
- Best fit: Solo developers who enjoy low-level tinkering; 2D games with custom rendering; educational/learning projects; games that need a tiny footprint; developers who prefer C++ and full pipeline control

**Raylib**
- Genuine strengths: Extremely simple API — designed for learning and rapid prototyping; supports many platforms (Windows, macOS, Linux, Web via Emscripten, Android, Raspberry Pi); raygui for immediate-mode UI; raymath for math helpers; active community; consistent cross-platform API surface; very small compiled binary
- Real limitations: No visual editor — everything is code; no built-in physics or scene graph; C API limits abstraction (no RAII, no namespaces in C) — C++ wrappers exist but are community-maintained; less suitable for large/complex games without significant scaffolding; limited 3D rendering compared to engines with deferred rendering
- Licensing reality: zlib/libpng license — completely free with no restrictions whatsoever
- Best fit: Learning/teaching game development; rapid prototyping; tiny indie games; game jams; developers who want the simplest possible graphics API; multi-platform 2D games with low performance requirements

**Babylon.js**
- Genuine strengths: Native web engine — runs in any browser without plugins; TypeScript-first with full type safety; modular architecture (physics, GUI, networking as optional imports); Havok Physics V2 built-in; excellent 3D scene pipeline (PBR, HDR, post-processing); strong developer tools (Playground, Sandbox, Inspector); free and open source (Apache 2.0); works with any build tool (Vite, webpack, esbuild)
- Real limitations: Requires a web browser or Electron/Tauri wrapper for desktop; no visual editor (use the Playground for prototyping); 3D scene graph but no built-in 2D system (2D is done through GUI or custom meshes); smaller community than Godot/Unity; mobile performance varies by device GPU
- Licensing reality: Apache 2.0 — completely free with no restrictions whatsoever
- Best fit: Web-first games; browser-based 3D experiences; games that benefit from tight web platform integration; TypeScript developers; multiplayer games with web socket architecture; projects where no-install, instant-play distribution matters

**Genre-specific guidance** (factor this into the recommendation):
- 2D any style → Godot strongly preferred; Raylib viable for simple 2D; SFML3 excellent for custom-rendered 2D
- 3D stylized / atmospheric / contained world → Godot viable, Unity solid alternative; Raylib viable for simple 3D; SFML3 limited 3D (no built-in model loader)
- 3D open world (large, seamless) → Unity or Unreal; Godot is not production-proven for this
- 3D photorealistic / AAA-quality → Unreal
- Mobile-first → Unity strongly preferred; Raylib has Android/iOS support but significant extra work
- Console-first → Unity or Unreal; C++ libraries require extensive porting
- Web → Babylon.js is the native web engine; Godot; Raylib via Emscripten works for simple games
- Horror / narrative / walking sim → any engine; match to art style and team experience; Babylon.js strong for web-delivered narrative games
- Action RPG / Soulslike → Unity or Unreal for 3D; community support and assets matter here; Babylon.js viable for web-based 3D action with good browser performance
- Platformer 2D → Godot; SFML3 and Raylib both excellent for 2D with full control; Babylon.js via GUI-based 2D for web
- Strategy / top-down / RTS → Godot or Unity depending on 2D vs 3D; SFML3 excellent for 2D strategy; Babylon.js strong for browser-based strategy games
- Game jam / prototype → Raylib for speed; Godot if you want an editor; Babylon.js for browser-accessible web prototypes
- Racing / vehicle simulation → Unity or Babylon.js (Havok Physics V2 has excellent vehicle constraints); Unreal for photorealistic racing

**Recommendation format:**
1. Show a comparison table with the user's specific factors as rows
2. Give a primary recommendation with honest reasoning
3. Name the best alternative and when to choose it instead
4. Explicitly state: "This is a starting point, not a verdict — you can always migrate engines, and many developers switch between projects."
5. Use `question` to confirm: "Does this recommendation feel right, or would you like to explore a different engine?"
   - Options: `[Primary engine] (Recommended)` / `[Alternative engine]` / `[Third engine]` / `Explore further` / `Type something`

**If the user picks "Explore further":**
Use `question` with concept-specific deep-dive topics. Always generate these options from the user's actual concept — do not use generic options. Always include at minimum:
- The primary engine's specific limitations for this concept (e.g., "How far can Godot 3D actually go for [genre]?")
- The alternative engine's specific tradeoffs for this concept
- Language choice impact on this concept's technical challenges
- Any concept-specific technical concern (e.g., adaptive audio, open-world streaming, multiplayer netcode)

The user can select multiple topics. Answer each selected topic in depth before returning to the engine confirmation question.

---

## 3. Look Up Current Version

Once the engine is chosen:

- If version was provided, use it
- If no version provided, use webfetch to find the latest stable release:
  - Search: `"[engine] latest stable version [current year]"`
  - Confirm with the user: "The latest stable [engine] is [version]. Use this?"

---

## 4. Update AGENTS.md Technology Stack

### Language Selection (Godot only)

If Godot was chosen, ask the user which language to use **before** showing the proposed Technology Stack:

> "Godot supports two primary languages:
>
>   **A) GDScript** — Python-like, Godot-native, fastest iteration. Best for beginners, solo devs, and teams coming from Python or Lua.
>   **B) C#** — .NET 8+, familiar to Unity developers, stronger IDE tooling (Rider / Visual Studio), slight performance advantage on heavy logic.
>   **C) Both** — GDScript for gameplay/UI scripting, C# for performance-critical systems. Advanced setup — requires .NET SDK alongside Godot.
>
> Which will this project primarily use?"

Record the choice. It determines the AGENTS.md template, naming conventions, specialist routing, and which agent is spawned for code files throughout the project.

---

Read `AGENTS.md` (or `CLAUDE.md` for Claude Code projects) and show the user the proposed Technology Stack changes.
Ask: "May I write these engine settings to `AGENTS.md`?"

Wait for confirmation before making any edits.

Update the Technology Stack section, replacing the `[CHOOSE]` placeholders with the actual values:

**For Godot** — use the template matching the language chosen above. See **Appendix A** at the bottom of this skill for all three variants (GDScript, C#, Both).

**For Unity:**
```markdown
- **Engine**: Unity [version]
- **Language**: C#
- **Build System**: Unity Build Pipeline
- **Asset Pipeline**: Unity Asset Import Pipeline + Addressables
```

**For Unreal:**
```markdown
- **Engine**: Unreal Engine [version]
- **Language**: C++ (primary), Blueprint (gameplay prototyping)
- **Build System**: Unreal Build Tool (UBT)
- **Asset Pipeline**: Unreal Content Pipeline
```

**For SFML 3:**
```markdown
- **Engine**: SFML 3 (Simple and Fast Multimedia Library)
- **Language**: C++17
- **Build System**: CMake
- **Asset Pipeline**: Custom (file-based loading via sf::Texture::loadFromFile, sf::SoundBuffer, etc.)
```

**For Raylib:**
```markdown
- **Engine**: Raylib
- **Language**: C (primary) or C++ (via raylib-cpp headers)
- **Build System**: CMake
- **Asset Pipeline**: Custom (file-based loading via LoadTexture, LoadSound, etc.)
```

**For Babylon.js:**
```markdown
- **Engine**: Babylon.js [version]
- **Language**: TypeScript
- **Build System**: Vite
- **Asset Pipeline**: .glb/.glTF file loading via SceneLoader (or assetManager)
```

---

## 4.5. Scaffold Build System (SFML 3 / Raylib / Babylon.js)

If SFML 3 or Raylib was chosen, ask the user about scaffolding the build system:

> "I can create a skeleton CMakeLists.txt and a minimal src/main.cpp to get you started.
> May I scaffold these files?"

Wait for confirmation before proceeding.

### For SFML 3

Create `CMakeLists.txt` in the project root:

```cmake
cmake_minimum_required(VERSION 3.20)
project(GameProject)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(SFML 3 REQUIRED COMPONENTS graphics window audio network system)

add_executable(${PROJECT_NAME}
    src/main.cpp
)

target_link_libraries(${PROJECT_NAME} PRIVATE
    sfml-graphics
    sfml-window
    sfml-audio
    sfml-network
    sfml-system
)

target_include_directories(${PROJECT_NAME} PRIVATE src)
```

Create `src/main.cpp`:

```cpp
#include <SFML/Graphics.hpp>

int main() {
    auto window = sf::RenderWindow(sf::VideoMode({800, 600}), "Game");
    window.setFramerateLimit(60);

    while (window.isOpen()) {
        while (const auto event = window.pollEvent()) {
            if (event->is<sf::Event::Closed>())
                window.close();
        }

        window.clear(sf::Color::Black);

        // Game logic and rendering here

        window.display();
    }

    return 0;
}
```

### For Raylib

Create `CMakeLists.txt` in the project root:

```cmake
cmake_minimum_required(VERSION 3.20)
project(GameProject)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Try system-installed raylib first, fall back to FetchContent
find_package(raylib QUIET)
if(NOT raylib_FOUND)
    include(FetchContent)
    FetchContent_Declare(raylib
        GIT_REPOSITORY https://github.com/raysan5/raylib.git
        GIT_TAG 5.5
    )
    FetchContent_MakeAvailable(raylib)
endif()

add_executable(${PROJECT_NAME}
    src/main.cpp
)

target_link_libraries(${PROJECT_NAME} PRIVATE raylib)

target_include_directories(${PROJECT_NAME} PRIVATE src)
```

Create `src/main.cpp`:

```cpp
#include "raylib.h"

int main() {
    const int screenWidth = 800;
    const int screenHeight = 600;

    InitWindow(screenWidth, screenHeight, "Game");
    SetTargetFPS(60);

    while (!WindowShouldClose()) {
        BeginDrawing();
        ClearBackground(BLACK);

        // Game logic and drawing here

        EndDrawing();
    }

    CloseWindow();
    return 0;
}
```

Also ensure `src/` and `assets/` directories exist (create them if missing).

Add a `.gitignore` entry for the build directory if one does not exist:

```
build/
```

### For Babylon.js

If Babylon.js was chosen, ask the user about scaffolding the project:

> "I can scaffold a Vite + TypeScript project with Babylon.js, featuring WebGPU-first
> rendering (fallback to WebGL2), Havok physics, GUI, and rendering pipeline.
> May I scaffold these files?"

Wait for confirmation before proceeding.

Follow the scaffolding reference at `docs/engine-reference/babylonjs/scaffolding.md`.
It describes every file to generate, why side-effect imports are needed, which
dependency versions to pin, and how the pieces fit together.

**Scaffolded structure** (from the reference):
```
<project-root>/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── app.ts
│   ├── vite-env.d.ts
│   ├── config/
│   │   └── template-config.ts
│   ├── css/
│   │   └── main.css
│   └── playground/
│       ├── main-scene.ts
│       └── gui.ts
```

Also ensure `src/` and `assets/` directories exist. Add a `.gitignore`:

---

## 5. Populate Technical Preferences

After updating AGENTS.md, create or update `.opencode/docs/technical-preferences.md` with
engine-appropriate defaults. Read the existing template first, then fill in:

### Engine & Language Section
- Fill from the engine choice made in step 4

### Language Selection (SFML 3, Raylib)

If SFML 3 or Raylib was chosen, ask the user about language:

> "SFML 3 / Raylib supports C++ (both) or C (Raylib only). Which will this project primarily use?
>
>   **A) C++** — RAII patterns, classes, STL, stronger type safety. Recommended for larger projects.
>   **B) C (Raylib only)** — Plain C API, simpler compilation, C11 standard. Best for small projects or learning.
>
> Which will this project primarily use?"

For SFML 3: only C++ is practical (SFML is a C++ library).
For Raylib: both C and C++ are viable. Record the choice.

### Language Selection (Babylon.js)

Babylon.js uses TypeScript. No language selection is needed — TypeScript is the standard and recommended language. Record `TypeScript` as the language.

### Naming Conventions (engine defaults)

**For Godot** — see **Appendix A** for GDScript, C#, and Both variants.

**For Unity (C#):**
- Classes: PascalCase (e.g., `PlayerController`)
- Public fields/properties: PascalCase (e.g., `MoveSpeed`)
- Private fields: _camelCase (e.g., `_moveSpeed`)
- Methods: PascalCase (e.g., `TakeDamage()`)
- Files: PascalCase matching class (e.g., `PlayerController.cs`)
- Constants: PascalCase or UPPER_SNAKE_CASE

**For Unreal (C++):**
- Classes: Prefixed PascalCase (`A` for Actor, `U` for UObject, `F` for struct)
- Variables: PascalCase (e.g., `MoveSpeed`)
- Functions: PascalCase (e.g., `TakeDamage()`)
- Booleans: `b` prefix (e.g., `bIsAlive`)
- Files: Match class without prefix (e.g., `PlayerController.h`)

**For SFML 3 (C++):**
- Classes: PascalCase (e.g., `PlayerController`, `ResourceManager`)
- Variables: snake_case (e.g., `move_speed`, `current_health`)
- Functions: PascalCase or snake_case — project preference, be consistent
- SFML API methods: camelCase (e.g., `loadFromFile`, `setPosition`)
- Namespaces: snake_case (e.g., `game::core`, `game::audio`)
- Files: PascalCase for classes, snake_case for modules (e.g., `PlayerController.cpp`, `audio_manager.cpp`)
- Headers: `.hpp` or `.h` — project preference, be consistent
- Constants: UPPER_SNAKE_CASE (e.g., `MAX_PLAYER_SPEED`)
- Member variables: `m_` prefix (e.g., `m_health`, `m_position`) — standard C++ practice

**For Raylib (C):**
- Functions: PascalCase matching raylib API style (e.g., `InitGame`, `UpdatePlayer`)
- Variables: snake_case (e.g., `player_speed`, `current_score`)
- Types: PascalCase (e.g., `Player`, `GameState`)
- Macros: UPPER_SNAKE_CASE (e.g., `MAX_BULLETS`, `SCREEN_WIDTH`)
- Files: snake_case (e.g., `player.cpp`, `game_state.h`)
- Headers: `.h` for C, `.hpp` for C++ wrappers
- Enums: UPPER_SNAKE_CASE with prefix (e.g., `GAME_STATE_MENU`, `GAME_STATE_PLAYING`)

**For Raylib (C++):**
- Classes: PascalCase (e.g., `Player`, `ResourceManager`)
- Variables: snake_case (e.g., `player_speed`)
- Functions: PascalCase matching raylib API style (e.g., `UpdatePlayer`, `DrawGame`)
- Files: PascalCase or snake_case — project preference, be consistent

**For Babylon.js (TypeScript):**
- Classes: PascalCase (e.g., `PlayerController`, `SceneManager`)
- Variables/functions: camelCase (e.g., `moveSpeed`, `takeDamage()`) — matching Babylon.js API style
- Interfaces: PascalCase with `I` prefix (e.g., `IPlayerState`, `IVehicleConfig`)
- Types: PascalCase (e.g., `PlayerState`, `GamePhase`)
- Enums: PascalCase (e.g., `GameState`, `PlayerAction`)
- Files: camelCase or kebab-case (e.g., `playerController.ts`, `scene-manager.ts`)
- Constants: UPPER_SNAKE_CASE (e.g., `MAX_PLAYER_SPEED`, `GRAVITY`)
- Private members: `_` prefix (e.g., `_health`, `_updatePosition()`)
- React components (if using React): PascalCase (e.g., `HudOverlay.tsx`)
- Test files: co-located `*.test.ts` or `*.spec.ts`

### Input & Platform Section

Populate `## Input & Platform` using the answers gathered in Section 2 (or extracted
from the game concept). Derive the values using this mapping:

| Platform target | Gamepad Support | Touch Support |
|-----------------|-----------------|---------------|
| PC only | Partial (recommended) | None |
| Console | Full | None |
| Mobile | None | Full |
| PC + Console | Full | None |
| PC + Mobile | Partial | Full |
| Web | Partial | Partial |

For **Primary Input**, use the dominant input for the game genre:
- Action/RPG/platformer targeting console → Gamepad
- Strategy/point-and-click/RTS → Keyboard/Mouse
- Mobile game → Touch
- Cross-platform → ask the user

Present the derived values and ask the user to confirm or adjust before writing.

Example filled section:
```markdown
## Input & Platform
- **Target Platforms**: PC, Console
- **Input Methods**: Keyboard/Mouse, Gamepad
- **Primary Input**: Gamepad
- **Gamepad Support**: Full
- **Touch Support**: None
- **Platform Notes**: All UI must support d-pad navigation. No hover-only interactions.
```

### Remaining Sections
- **Performance Budgets**: Use `question`:
  - Prompt: "Should I set default performance budgets now, or leave them for later?"
  - Options: `[A] Set defaults now (60fps, 16.6ms frame budget, engine-appropriate draw call limit)` / `[B] Leave as [TO BE CONFIGURED] — I'll set these when I know my target hardware`
  - If [A]: populate with the suggested defaults. If [B]: leave as placeholder.
- **Testing**: Suggest engine-appropriate framework (GUT for Godot, NUnit for Unity, etc.) — ask before adding.
- **Forbidden Patterns**: Leave as placeholder — do NOT pre-populate.
- **Allowed Libraries**: Leave as placeholder — do NOT pre-populate dependencies the project does not currently need. Only add a library here when it is actively being integrated, not speculatively.

> **Guardrail**: Never add speculative dependencies to Allowed Libraries. For example, do NOT add GodotSteam unless Steam integration is actively beginning in this session. Post-launch integrations should be added to Allowed Libraries when that work begins, not during engine setup.

### Engine Specialists Routing

Also populate the `## Engine Specialists` section in `technical-preferences.md` with the correct routing for the chosen engine:

**For Godot** — see **Appendix A** for the routing table matching the language chosen.

**For Unity:**
```markdown
## Engine Specialists
- **Primary**: unity-specialist
- **Language/Code Specialist**: unity-specialist (C# review — primary covers it)
- **Shader Specialist**: unity-shader-specialist (Shader Graph, HLSL, URP/HDRP materials)
- **UI Specialist**: unity-ui-specialist (UI Toolkit UXML/USS, UGUI Canvas, runtime UI)
- **Additional Specialists**: unity-dots-specialist (ECS, Jobs system, Burst compiler), unity-addressables-specialist (asset loading, memory management, content catalogs)
- **Routing Notes**: Invoke primary for architecture and general C# code review. Invoke DOTS specialist for any ECS/Jobs/Burst code. Invoke shader specialist for rendering and visual effects. Invoke UI specialist for all interface implementation. Invoke Addressables specialist for asset management systems.

### File Extension Routing

| File Extension / Type | Specialist to Spawn |
|-----------------------|---------------------|
| Game code (.cs files) | unity-specialist |
| Shader / material files (.shader, .shadergraph, .mat) | unity-shader-specialist |
| UI / screen files (.uxml, .uss, Canvas prefabs) | unity-ui-specialist |
| Scene / prefab / level files (.unity, .prefab) | unity-specialist |
| Native extension / plugin files (.dll, native plugins) | unity-specialist |
| General architecture review | unity-specialist |
```

**For Unreal:**
```markdown
## Engine Specialists
- **Primary**: unreal-specialist
- **Language/Code Specialist**: ue-blueprint-specialist (Blueprint graphs) or unreal-specialist (C++)
- **Shader Specialist**: unreal-specialist (no dedicated shader specialist — primary covers materials)
- **UI Specialist**: ue-umg-specialist (UMG widgets, CommonUI, input routing, widget styling)
- **Additional Specialists**: ue-gas-specialist (Gameplay Ability System, attributes, gameplay effects), ue-replication-specialist (property replication, RPCs, client prediction, netcode)
- **Routing Notes**: Invoke primary for C++ architecture and broad engine decisions. Invoke Blueprint specialist for Blueprint graph architecture and BP/C++ boundary design. Invoke GAS specialist for all ability and attribute code. Invoke replication specialist for any multiplayer or networked systems. Invoke UMG specialist for all UI implementation.

### File Extension Routing

| File Extension / Type | Specialist to Spawn |
|-----------------------|---------------------|
| Game code (.cpp, .h files) | unreal-specialist |
| Shader / material files (.usf, .ush, Material assets) | unreal-specialist |
| UI / screen files (.umg, UMG Widget Blueprints) | ue-umg-specialist |
| Scene / prefab / level files (.umap, .uasset) | unreal-specialist |
| Native extension / plugin files (Plugin .uplugin, modules) | unreal-specialist |
| Blueprint graphs (.uasset BP classes) | ue-blueprint-specialist |
| General architecture review | unreal-specialist |
```

**For SFML 3:**
```markdown
## Engine Specialists
- **Primary**: sfml-specialist
- **Language/Code Specialist**: sfml-specialist (C++ — single specialist covers all code)
- **Shader Specialist**: sfml-specialist (sf::Shader, GLSL integration)
- **UI Specialist**: sfml-specialist (no dedicated UI specialist — build UI with sf::Drawable or integrate Dear ImGui)
- **Additional Specialists**: None
- **Routing Notes**: Invoke primary for all SFML-related code, build system, and architecture decisions. The single specialist covers graphics, audio, network, window, and system modules.

### File Extension Routing

| File Extension / Type | Specialist to Spawn |
|-----------------------|---------------------|
| Game code (.cpp, .hpp, .h files) | sfml-specialist |
| Shader files (.glsl, .vert, .frag) | sfml-specialist |
| CMake build files (CMakeLists.txt) | sfml-specialist |
| General architecture review | sfml-specialist |
```

**For Raylib:**
```markdown
## Engine Specialists
- **Primary**: raylib-specialist
- **Language/Code Specialist**: raylib-specialist (C/C++ — single specialist covers all code)
- **Shader Specialist**: raylib-specialist (LoadShader, GLSL integration, rlgl raw OpenGL)
- **UI Specialist**: raylib-specialist (raygui header — immediate-mode GUI)
- **Additional Specialists**: None
- **Routing Notes**: Invoke primary for all raylib-related code, build system, and architecture decisions. The single specialist covers core, rlgl, raudio, raymath, and extras.

### File Extension Routing

| File Extension / Type | Specialist to Spawn |
|-----------------------|---------------------|
| Game code (.c, .cpp, .h, .hpp files) | raylib-specialist |
| Shader files (.glsl, .vs, .fs) | raylib-specialist |
| CMake build files (CMakeLists.txt) | raylib-specialist |
| General architecture review | raylib-specialist |
```

**For Babylon.js:**
```markdown
## Engine Specialists
- **Primary**: babylonjs-specialist
- **Language/Code Specialist**: babylonjs-specialist (TypeScript — primary covers it)
- **Shader Specialist**: babylonjs-perf-specialist (ShaderMaterial, Effect, node material, GLSL)
- **UI Specialist**: babylonjs-gui-specialist (AdvancedDynamicTexture, controls, HUD, input handling)
- **Additional Specialists**: babylonjs-physics-specialist (Havok Physics V2, vehicle physics, constraints, collisions), babylonjs-network-specialist (Colyseus SDK, WebSockets, room management, state sync)
- **Routing Notes**: Invoke primary for scene setup, rendering pipeline, and general TypeScript code review. Invoke physics specialist for any Havok physics, vehicle simulation, or collision handling. Invoke network specialist for multiplayer sessions, room management, and state synchronization. Invoke GUI specialist for all UI/HUD/menu implementation. Invoke performance specialist for draw call optimization, LOD, instancing, shader tuning, and frame budget management.

### File Extension Routing

| File Extension / Type | Specialist to Spawn |
|-----------------------|---------------------|
| Game code (.ts files) | babylonjs-specialist |
| Scene/level files (.ts scene setup) | babylonjs-specialist |
| Shader files (.fx, custom shader code) | babylonjs-perf-specialist |
| UI / screen files (.ts ADT setup) | babylonjs-gui-specialist |
| Physics / vehicle files (.ts physics) | babylonjs-physics-specialist |
| Network / multiplayer files (.ts network) | babylonjs-network-specialist |
| Configuration / data (.json) | babylonjs-specialist |
| General architecture review | babylonjs-specialist |
```

### Collaborative Step
Present the filled-in preferences to the user. For Godot, include the chosen language and note where the full naming conventions and routing tables live:
> "Here are the default technical preferences for [engine] ([language if Godot]). The naming conventions and specialist routing are in Appendix A of this skill — I'll apply the [GDScript/C#/Both] variant. Want to customize any of these, or shall I save the defaults?"

For all other engines, present the defaults directly without referencing the appendix.

Wait for approval before writing the file.

---

## 6. Determine Knowledge Gap

Check whether the engine version is likely beyond the LLM's training data.

**Known approximate coverage** (update this as models change):
- LLM knowledge cutoff: **May 2025**
- Godot: training data likely covers up to ~4.3
- Unity: training data likely covers up to ~2023.x / early 6000.x
- Unreal: training data likely covers up to ~5.3 / early 5.4
- SFML 3: training data likely covers up to ~3.0.x (SFML 3.0 released early 2025)
- Raylib: training data likely covers up to ~5.5
- Babylon.js: training data likely covers up to ~7.x (Babylon.js 9.x introduces breaking changes — HIGH RISK for post-cutoff APIs)

Compare the user's chosen version against these baselines:

- **Within training data** → `LOW RISK` — reference docs optional but recommended
- **Near the edge** → `MEDIUM RISK` — reference docs recommended
- **Beyond training data** → `HIGH RISK` — reference docs required

Inform the user which category they're in and why.

---

## 7. Populate Engine Reference Docs

### If WITHIN training data (LOW RISK):

Create a minimal `docs/engine-reference/<engine>/VERSION.md`:

```markdown
# [Engine] — Version Reference

| Field | Value |
|-------|-------|
| **Engine Version** | [version] |
| **Project Pinned** | [today's date] |
| **LLM Knowledge Cutoff** | May 2025 |
| **Risk Level** | LOW — version is within LLM training data |

## Note

This engine version is within the LLM's training data. Engine reference
docs are optional but can be added later if agents suggest incorrect APIs.

Run `/setup-engine refresh` to populate full reference docs at any time.
```

Do NOT create breaking-changes.md, deprecated-apis.md, etc. — they would
add context cost with minimal value.

### If BEYOND training data (MEDIUM or HIGH RISK):

Create the full reference doc set by searching the web:

1. **Search for the official migration/upgrade guide**:
   - `"[engine] [old version] to [new version] migration guide"`
   - `"[engine] [version] breaking changes"`
   - `"[engine] [version] changelog"`
   - `"[engine] [version] deprecated API"`

2. **Fetch and extract** from official documentation:
   - Breaking changes between each version from the training cutoff to current
   - Deprecated APIs with replacements
   - New features and best practices

Ask: "May I create the engine reference docs under `docs/engine-reference/<engine>/`?"

Wait for confirmation before writing any files.

3. **Create the full reference directory**:
   ```
   docs/engine-reference/<engine>/
   ├── VERSION.md              # Version pin + knowledge gap analysis
   ├── breaking-changes.md     # Version-by-version breaking changes
   ├── deprecated-apis.md      # "Don't use X → Use Y" tables
   ├── current-best-practices.md  # New practices since training cutoff
   └── modules/                # Per-subsystem references (create as needed)
   ```

4. **Populate each file** using real data from the web searches, following
   the format established in existing reference docs. Every file must have
   a "Last verified: [date]" header.

5. **For module files**: Only create modules for subsystems where significant
   changes occurred. Don't create empty or minimal module files.

### 7.3. Configure godot-mcp (Optional — Godot Only)

If Godot was chosen as the engine, the AI can work more effectively with the
[godot-mcp](https://github.com/Coding-Solo/godot-mcp) server, which provides
runtime tools for interacting with the Godot editor and running project:

**Available MCP tools:**
- `launch_editor` — launch the Godot editor
- `run_project` — run the current project
- `get_debug_output` — capture live debug output from the running project
- `stop_project` — stop the running project
- `get_godot_version` — check the installed Godot version
- `list_projects` — list all Godot projects
- `get_project_info` — get metadata about the project
- `create_scene` — create a new scene file
- `add_node` — add nodes to a scene
- `load_sprite` — load a sprite resource
- `save_scene` — save a scene file
- `export_mesh_library` — export a mesh library
- `get_uid` — get a resource UID
- `update_project_uids` — update project resource UIDs

**Installation:**
```bash
# Install via npx (no global install needed)
# Pin to a specific version in production (e.g., @coding-solo/godot-mcp@1.0.0)
npx @coding-solo/godot-mcp@latest
```

**OpenCode MCP configuration:**
Add to `opencode.json` or the appropriate MCP config file:
```json
{
  "mcpServers": {
    "godot": {
      "command": "npx",
      "args": ["@coding-solo/godot-mcp"],
      "env": {
        "DEBUG": "true"
      }
    }
  }
}
```

> **Note:** `DEBUG=true` enables verbose logging of all MCP communication (requests, responses, and debug info). Use it when troubleshooting MCP tool issues or during initial setup. Disable (`"DEBUG": "false"` or remove the variable) in normal use to reduce log noise.

**Environment setup:**
Optionally set `GODOT_PATH` if the Godot binary is not in PATH:
```json
"env": {
  "GODOT_PATH": "/path/to/godot",
  "DEBUG": "true"
}
```

### 7.4. Configure unity-mcp (Optional — Unity Only)

> **What it is:** A bridge between AI agents and Unity Editor via MCP, exposing ~50+ tools for scene, script, and asset management. Maintained by CoplayDev, MIT licensed. See [github.com/CoplayDev/unity-mcp](https://github.com/CoplayDev/unity-mcp).

#### Prerequisites (must be installed first)

- **Unity 2021.3 LTS or newer** — [Download Unity](https://unity.com/download)
- **Python 3.10+** with `uv` — install `uv` via `pip install uv` (or `winget install astral-sh.uv` on Windows)
- **MCP for Unity package** installed in your Unity project (see below)

#### Install steps

In your Unity project, open **Window → Package Manager**, click the **`+`** button, choose **Add package from git URL...**, and paste:

```
https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#main
```

> Use `#beta` instead of `#main` for the latest beta features. `#main` is recommended for stability and currently tracks the v9.7.0 release.

After the package imports, MCP for Unity opens a **setup wizard** automatically:

1. Confirm Python and `uv` are installed — the wizard guides you through both if missing.
2. Click **Done**. Once dependencies are green, a list of detected MCP clients appears.
3. Pick the clients you want to configure and click **Configure Selected**.

> **Note:** The wizard's per-client list (Claude Desktop, Cursor, Claude Code, VS Code, Windsurf, Cline, etc.) does not explicitly mention OpenCode. The wizard MAY auto-configure OpenCode's `opencode.json` (verify by checking the file after); if it does not, use the manual config below.

#### Manual opencode.json config (reliable fallback)

Add this block to the `mcp` object in your project's `opencode.json`:

```json
"unity": {
  "type": "local",
  "url": "http://localhost:8080/mcp",
  "enabled": false
}
```

`enabled: false` is the default. Flip to `true` once Unity Editor is running and you want OCGS agents to use unity-mcp tools.

> ⚠ **Unity Editor must be running** before OCGS agents can use unity-mcp tools. If the Editor is closed, MCP calls will fail with a connection error. Open your project in Unity, then continue.

#### Verify

In a session where `enabled: true`, call any unity-mcp tool (e.g. `list_scenes`) via OCGS. Expect a list of scenes from your open Unity project.

#### Troubleshooting

- **Bridge not connecting** — Open **Window → MCP for Unity** and check the status panel. Restart Unity if needed.
- **Server not starting** — Verify `uv --version` works in your terminal. Check the MCP for Unity log for errors.
- **Client not connecting** — Confirm the HTTP server is running on `localhost:8080` and the URL in your client config matches.
- **Port 8080 conflict** — Open Unity's MCP for Unity window and change the port; update the `url` in `opencode.json` to match.

### 7.5. Build & Run Setup (SFML 3 / Raylib — No MCP Available)

SFML 3 and Raylib do not have MCP servers. Instead, configure a build-and-run workflow:

**Recommended CMake structure:**
```
project-root/
├── CMakeLists.txt          # cmake_minimum_required, project(), add_executable, target_link_libraries
├── src/                    # Game source code
├── assets/                 # Textures, sounds, fonts, shaders
└── build/                  # Build output (gitignored)
```

**Minimal CMakeLists.txt for SFML 3:**
```cmake
cmake_minimum_required(VERSION 3.20)
project(my_game)

set(CMAKE_CXX_STANDARD 17)
find_package(SFML 3 REQUIRED COMPONENTS graphics window audio network system)

add_executable(my_game src/main.cpp)
target_link_libraries(my_game PRIVATE sfml-graphics sfml-window sfml-audio sfml-network sfml-system)
```

**Minimal CMakeLists.txt for Raylib:**
```cmake
cmake_minimum_required(VERSION 3.20)
project(my_game)

set(CMAKE_C_STANDARD 11)      # For C projects
set(CMAKE_CXX_STANDARD 17)    # For C++ projects

# Option A: find_package
find_package(raylib REQUIRED)

# Option B: FetchContent (vendors raylib automatically)
include(FetchContent)
FetchContent_Declare(raylib GIT_REPOSITORY https://github.com/raysan5/raylib.git GIT_TAG 5.5)
FetchContent_MakeAvailable(raylib)

add_executable(my_game src/main.cpp)
target_link_libraries(my_game PRIVATE raylib)
```

**Build & run commands:**
```bash
cmake -B build -S .
cmake --build build
./build/my_game           # Linux/macOS
.\build\Release\my_game.exe  # Windows
```

**For web targets (Raylib only):**
```bash
cmake -B build-web -S . -DPLATFORM=Web -DCMAKE_TOOLCHAIN_FILE=/path/to/emscripten/cmake/Modules/Platform/Emscripten.cmake
cmake --build build-web
```

---

## 8. Update AGENTS.md Import

Ask: "May I update the `@` import in `AGENTS.md` to point to the new engine reference?"

Wait for confirmation, then update the `@` import under "Engine Version Reference" to point to the
correct engine:

```markdown
## Engine Version Reference

@docs/engine-reference/<engine>/VERSION.md
```

If the previous import pointed to a different engine (e.g., switching from
Godot to Unity), update it.

---

## 9. Update Agent Instructions

Ask: "May I add a Version Awareness section to the engine specialist agent files?" before making any edits.

For the chosen engine's specialist agents, verify they have a
"Version Awareness" section. If not, add one following the pattern in
the existing Godot specialist agents.

The section should instruct the agent to:
1. Read `docs/engine-reference/<engine>/VERSION.md`
2. Check deprecated APIs before suggesting code
3. Check breaking changes for relevant version transitions
4. Use webfetch to verify uncertain APIs

---

## 10. Refresh Subcommand

If invoked as `/setup-engine refresh`:

1. Read the existing `docs/engine-reference/<engine>/VERSION.md` to get
   the current engine and version
2. Use webfetch to check for:
   - New engine releases since last verification
   - Updated migration guides
   - Newly deprecated APIs
3. Update all reference docs with new findings
4. Update "Last verified" dates on all modified files
5. Report what changed

---

## 11. Upgrade Subcommand

If invoked as `/setup-engine upgrade [old-version] [new-version]`:

### Step 1 — Read Current Version State

Read `docs/engine-reference/<engine>/VERSION.md` to confirm the current pinned
version, risk level, and any migration note URLs already recorded. If
`old-version` was not provided as an argument, use the pinned version from this
file.

### Step 2 — Fetch Migration Guide

Use webfetch and WebFetch to locate the official migration guide between
`old-version` and `new-version`:

- Search: `"[engine] [old-version] to [new-version] migration guide"`
- Search: `"[engine] [new-version] breaking changes changelog"`
- Fetch the migration guide URL from VERSION.md if one is already recorded,
  or use the URL found via search.

Extract: renamed APIs, removed APIs, changed defaults, behavior changes, and
any "must migrate" items.

### Step 3 — Pre-Upgrade Audit

Scan `src/` for code that uses APIs known to be deprecated or changed in the
target version:

- Use Grep to search for deprecated API names extracted from the migration
  guide (e.g., old function names, removed node types, changed property names)
- List each file that matches, with the specific API reference found

Present the audit results as a table:

```
Pre-Upgrade Audit: [engine] [old-version] → [new-version]
==========================================================

Files requiring changes:
  File                              | Deprecated API Found       | Effort
  --------------------------------- | -------------------------- | ------
  src/gameplay/player_movement.gd   | old_api_name               | Low
  src/ui/hud.gd                     | removed_node_type          | Medium

Breaking changes to watch for:
  - [change description from migration guide]
  - [change description from migration guide]

Recommended migration order (dependency-sorted):
  1. [system/layer with fewest dependencies first]
  2. [next system]
  ...
```

If no deprecated APIs are found in `src/`, report: "No deprecated API usage
found in src/ — upgrade may be low-risk."

### Step 4 — Confirm Before Updating

Ask the user before making any changes:

> "Pre-upgrade audit complete. Found [N] files using deprecated APIs.
> Proceed with upgrading VERSION.md to [new-version]?
> (This will update the pinned version and add migration notes — it does NOT
> change any source files. Source migration is done manually or via stories.)"

Wait for explicit confirmation before continuing.

### Step 5 — Update VERSION.md

After confirmation:

1. Update `docs/engine-reference/<engine>/VERSION.md`:
   - `Engine Version` → `[new-version]`
   - `Project Pinned` → today's date
   - `Last Docs Verified` → today's date
   - Re-evaluate and update the `Risk Level` and `Post-Cutoff Version Timeline`
     table if the new version falls beyond the LLM knowledge cutoff
   - Add a `## Migration Notes — [old-version] → [new-version]` section
     containing: migration guide URL, key breaking changes, deprecated APIs
     found in this project, and recommended migration order from the audit

2. If `breaking-changes.md` or `deprecated-apis.md` exist in the engine
   reference directory, append the new version's changes to those files.

### Step 6 — Post-Upgrade Reminder

After updating VERSION.md, output:

```
VERSION.md updated: [engine] [old-version] → [new-version]

Next steps:
1. Migrate deprecated API usages in the [N] files listed above
2. Run /setup-engine refresh after upgrading the actual engine binary to
   verify no new deprecations were missed
3. Run /architecture-review — the engine upgrade may invalidate ADRs that
   reference specific APIs or engine capabilities
4. If any ADRs are invalidated, run /propagate-design-change to update
   downstream stories
```

---

## 12. Output Summary

After setup is complete, output:

```
Engine Setup Complete
=====================
Engine:          [name] [version]
Language:        [GDScript | C# | GDScript + C# | C# | C++ + Blueprint | C++17 | C (primary) or C++ | C11]
Knowledge Risk:  [LOW/MEDIUM/HIGH]
Reference Docs:  [created/skipped]
AGENTS.md:       [updated]
Tech Prefs:      [created/updated]
Agent Config:    [verified]

Next Steps:
1. Review docs/engine-reference/<engine>/VERSION.md
2. [If from /brainstorm] Run /map-systems to decompose your concept into individual systems
3. [If from /brainstorm] Run /design-system to author per-system GDDs (guided, section-by-section)
4. [If from /brainstorm] Run /prototype [core-mechanic] to test the core loop
5. [If fresh start] Run /brainstorm to discover your game concept
6. Create your first milestone: /sprint-plan new
```

---

Verdict: **COMPLETE** — engine configured and reference docs populated.

## Guardrails

- NEVER guess an engine version — always verify via webfetch or user confirmation
- NEVER overwrite existing reference docs without asking — append or update
- If reference docs already exist for a different engine, ask before replacing
- Always show the user what you're about to change before making AGENTS.md edits
- If webfetch returns ambiguous results, show the user and let them decide
- When the user chose **GDScript**: copy the GDScript AGENTS.md template from Appendix A1 exactly. NEVER add "C++ via GDExtension" to the Language field. GDScript projects may use GDExtension, but it is not a primary project language. The `godot-gdextension-specialist` in the routing table is available for when native extensions are needed — it does not make C++ a project language.

---

## Appendix A — Godot Language Configuration

All Godot-specific variants for language-dependent configuration. Referenced from Sections 4 and 5 — only relevant when Godot is the chosen engine. Use the subsection matching the language chosen in Section 4.

---

### A1. AGENTS.md Technology Stack Templates

**GDScript:**
```markdown
- **Engine**: Godot [version]
- **Language**: GDScript
- **Build System**: SCons (engine), Godot Export Templates
- **Asset Pipeline**: Godot Import System + custom resource pipeline
```

> **Guardrail**: When using this GDScript template, write the Language field as exactly "`GDScript`" — no additions. Do NOT append "C++ via GDExtension" or any other language. The C# template below includes GDExtension because C# projects commonly wrap native code; GDScript projects do not.

**C#:**
```markdown
- **Engine**: Godot [version]
- **Language**: C# (.NET 8+, primary), C++ via GDExtension (native plugins only)
- **Build System**: .NET SDK + Godot Export Templates
- **Asset Pipeline**: Godot Import System + custom resource pipeline
```

**Both — GDScript + C#:**
```markdown
- **Engine**: Godot [version]
- **Language**: GDScript (gameplay/UI scripting), C# (performance-critical systems), C++ via GDExtension (native only)
- **Build System**: .NET SDK + Godot Export Templates
- **Asset Pipeline**: Godot Import System + custom resource pipeline
```

---

### A2. Naming Conventions

**GDScript:**
- Classes: PascalCase (e.g., `PlayerController`)
- Variables/functions: snake_case (e.g., `move_speed`)
- Signals: snake_case past tense (e.g., `health_changed`)
- Files: snake_case matching class (e.g., `player_controller.gd`)
- Scenes: PascalCase matching root node (e.g., `PlayerController.tscn`)
- Constants: UPPER_SNAKE_CASE (e.g., `MAX_HEALTH`)

**C#:**
- Classes: PascalCase (`PlayerController`) — must also be `partial`
- Public properties/fields: PascalCase (`MoveSpeed`, `JumpVelocity`)
- Private fields: `_camelCase` (`_currentHealth`, `_isGrounded`)
- Methods: PascalCase (`TakeDamage()`, `GetCurrentHealth()`)
- Signal delegates: PascalCase + `EventHandler` suffix (`HealthChangedEventHandler`)
- Files: PascalCase matching class (`PlayerController.cs`)
- Scenes: PascalCase matching root node (`PlayerController.tscn`)
- Constants: PascalCase (`MaxHealth`, `DefaultMoveSpeed`)

**Both — GDScript + C#:**
Use GDScript conventions for `.gd` files and C# conventions for `.cs` files. Mixed-language files do not exist — the boundary is per-file. When in doubt about which language a new system should use, ask the user and record the decision in `technical-preferences.md`.

---

### A3. Engine Specialists Routing

**GDScript:**
```markdown
## Engine Specialists
- **Primary**: godot-specialist
- **Language/Code Specialist**: godot-gdscript-specialist (all .gd files)
- **Shader Specialist**: godot-shader-specialist (.gdshader files, VisualShader resources)
- **UI Specialist**: godot-specialist (no dedicated UI specialist — primary covers all UI)
- **Additional Specialists**: godot-gdextension-specialist (GDExtension / native C++ bindings only)
- **Routing Notes**: Invoke primary for architecture decisions, ADR validation, and cross-cutting code review. Invoke GDScript specialist for code quality, signal architecture, static typing enforcement, and GDScript idioms. Invoke shader specialist for material design and shader code. Invoke GDExtension specialist only when native extensions are involved.

### File Extension Routing

| File Extension / Type | Specialist to Spawn |
|-----------------------|---------------------|
| Game code (.gd files) | godot-gdscript-specialist |
| Shader / material files (.gdshader, VisualShader) | godot-shader-specialist |
| UI / screen files (Control nodes, CanvasLayer) | godot-specialist |
| Scene / prefab / level files (.tscn, .tres) | godot-specialist |
| Native extension / plugin files (.gdextension, C++) | godot-gdextension-specialist |
| General architecture review | godot-specialist |
```

**C#:**
```markdown
## Engine Specialists
- **Primary**: godot-specialist
- **Language/Code Specialist**: godot-csharp-specialist (all .cs files)
- **Shader Specialist**: godot-shader-specialist (.gdshader files, VisualShader resources)
- **UI Specialist**: godot-specialist (no dedicated UI specialist — primary covers all UI)
- **Additional Specialists**: godot-gdextension-specialist (GDExtension / native C++ bindings only)
- **Routing Notes**: Invoke primary for architecture decisions, ADR validation, and cross-cutting code review. Invoke C# specialist for code quality, [Signal] delegate patterns, [Export] attributes, .csproj management, and C#-specific Godot idioms. Invoke shader specialist for material design and shader code. Invoke GDExtension specialist only when native C++ plugins are involved.

### File Extension Routing

| File Extension / Type | Specialist to Spawn |
|-----------------------|---------------------|
| Game code (.cs files) | godot-csharp-specialist |
| Shader / material files (.gdshader, VisualShader) | godot-shader-specialist |
| UI / screen files (Control nodes, CanvasLayer) | godot-specialist |
| Scene / prefab / level files (.tscn, .tres) | godot-specialist |
| Project config (.csproj, NuGet) | godot-csharp-specialist |
| Native extension / plugin files (.gdextension, C++) | godot-gdextension-specialist |
| General architecture review | godot-specialist |
```

**Both — GDScript + C#:**
```markdown
## Engine Specialists
- **Primary**: godot-specialist
- **GDScript Specialist**: godot-gdscript-specialist (.gd files — gameplay/UI scripts)
- **C# Specialist**: godot-csharp-specialist (.cs files — performance-critical systems)
- **Shader Specialist**: godot-shader-specialist (.gdshader files, VisualShader resources)
- **UI Specialist**: godot-specialist (no dedicated UI specialist — primary covers all UI)
- **Additional Specialists**: godot-gdextension-specialist (GDExtension / native C++ bindings only)
- **Routing Notes**: Invoke primary for cross-language architecture decisions and which systems belong in which language. Invoke GDScript specialist for .gd files. Invoke C# specialist for .cs files and .csproj management. Prefer signals over direct cross-language method calls at the boundary.

### File Extension Routing

| File Extension / Type | Specialist to Spawn |
|-----------------------|---------------------|
| Game code (.gd files) | godot-gdscript-specialist |
| Game code (.cs files) | godot-csharp-specialist |
| Cross-language boundary decisions | godot-specialist |
| Shader / material files (.gdshader, VisualShader) | godot-shader-specialist |
| UI / screen files (Control nodes, CanvasLayer) | godot-specialist |
| Scene / prefab / level files (.tscn, .tres) | godot-specialist |
| Project config (.csproj, NuGet) | godot-csharp-specialist |
| Native extension / plugin files (.gdextension, C++) | godot-gdextension-specialist |
| General architecture review | godot-specialist |
```
