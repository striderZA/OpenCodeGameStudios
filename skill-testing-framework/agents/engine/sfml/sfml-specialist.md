# Agent Test Spec: sfml-specialist

## Agent Summary
Domain: SFML 3-specific patterns — System, Window, Graphics, Audio, Network modules. Guides C++ architecture, build integration (CMake), and SFML 3 idioms.
Does NOT own: game logic design or engine selection (delegates to lead-programmer).
Model tier: Qwen3.6-plus (medium tier).
No gate IDs assigned.

---

## Static Assertions (Structural)

- [ ] `description:` field is present and domain-specific (references SFML 3, modules, C++ architecture)
- [ ] `allowed-tools:` list includes Read, Write, Edit, Bash, Glob, Grep
- [ ] Model tier is Qwen3.6-plus (medium tier for engine specialists)
- [ ] Agent definition references `docs/engine-reference/sfml3/VERSION.md` as the authoritative API source

---

## Test Cases

### Case 1: In-domain request — appropriate output
**Input:** "How do I set up a game window and main loop in SFML 3?"
**Expected behavior:**
- Creates an `sf::RenderWindow` with `sf::VideoMode` and window title
- Implements the main loop structure: `while (window.isOpen())` → poll events → update → clear → draw → display
- Uses `sf::Event` for event polling
- Sets a target framerate or delta time
- Ensures proper cleanup (no resource leaks)

### Case 2: Wrong-engine redirect
**Input:** "Write a Unity MonoBehaviour that moves a player with WASD."
**Expected behavior:**
- Does NOT produce Unity C# code
- Clearly identifies this is a Unity pattern
- Provides the SFML equivalent: keyboard input via `sf::Keyboard::isKeyPressed()` in the main loop
- Notes that SFML is a library, not an engine — no components or serialization
- Redirects to the correct approach for SFML's architecture

### Case 3: Module routing
**Input:** "I need to play an audio file and send data over TCP."
**Expected behavior:**
- Routes audio work to the Audio module: `sf::SoundBuffer` + `sf::Sound` or `sf::Music`
- Routes network work to the Network module: `sf::TcpSocket` or `sf::Http`
- Confirms SFML covers both within its Graphics→Audio→Network module structure
- Does NOT attempt to implement both in a single monolithic response

### Case 4: Build integration
**Input:** "How do I integrate SFML 3 with my CMake project?"
**Expected behavior:**
- References CMake's `find_package(SFML 3 COMPONENTS ...)` or FetchContent approach
- Lists required components based on the project's needs
- Notes C++17 requirement and compiler-specific flags
- Points to `docs/engine-reference/sfml3/VERSION.md` for version-specific setup notes

---

## Template Assertions

- [x] Contains at least 3 test cases
- [x] Test cases cover primary specialist responsibility
- [x] Wrong-engine redirect tested
- [x] Static assertions check frontmatter compliance
