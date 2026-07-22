# Raylib Engine — Version Reference

| Field | Value |
|-------|-------|
| **Engine Version** | Raylib 5.5 |
| **Release Date** | 2025 |
| **Project Pinned** | 2026-07-22 |
| **Last Docs Verified** | 2026-07-22 |
| **LLM Knowledge Cutoff** | May 2025 |

## Knowledge Gap Warning

Raylib 5.5 is within the LLM's training data cutoff (May 2025). The model
should have good knowledge of Raylib 5.x APIs. Risk level is LOW.

Raylib is stable and generally backwards-compatible between minor versions.
Major API changes are rare and well-documented.

## Risk Level: LOW

This engine version is within the LLM's training data. Engine reference
docs are maintained for accuracy but most API knowledge should be current.

## Version History

| Version | Release | Risk Level | Key Theme |
|---------|---------|------------|-----------|
| 4.x | 2022-2023 | LOW | Stable API, widely documented |
| 5.0 | 2024 | LOW | Minor improvements, backwards compatible |
| 5.5 | 2025 | LOW | Within training data, stable |

## Raylib Characteristics

- **C library** with PascalCase function names (InitWindow, LoadTexture, etc.)
- **Header-only modules**: raymath, raygui (optional)
- **Platform support**: Windows, macOS, Linux, Web (Emscripten), Android, Raspberry Pi
- **No editor** — code-only development
- **Simple API** designed for learning and prototyping
- **zlib/libpng license** — completely free with no restrictions
- **No built-in physics, scene graph, or UI system** — bring your own

## Key Modules

| Module | Purpose | Header |
|--------|---------|--------|
| core | Window, input, timing, file I/O | `raylib.h` |
| rlgl | Raw OpenGL abstraction | `raylib.h` (advanced) |
| raudio | Audio device, sound, music | `raylib.h` |
| raymath | Vector/Matrix math | `raymath.h` |
| raygui | Immediate-mode UI | `raygui.h` |

## Verified Sources

- Official website: https://www.raylib.com/
- GitHub repository: https://github.com/raysan5/raylib
- Wiki: https://github.com/raysan5/raylib/wiki
- Cheatsheet: https://www.raylib.com/cheatsheet/cheatsheet.html
- Examples: https://github.com/raysan5/raylib/tree/master/examples
