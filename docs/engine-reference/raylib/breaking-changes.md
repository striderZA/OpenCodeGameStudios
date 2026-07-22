# Raylib — Breaking Changes

Last verified: 2026-07-22

Changes between Raylib versions. Raylib is generally stable and backwards-compatible.
Major breaking changes are rare.

## 5.0 → 5.5 (2025 — LOW RISK)

| Subsystem | Change | Details |
|-----------|--------|---------|
| Core | Minor bug fixes | Various platform-specific fixes |
| Audio | Audio improvements | Better device detection and handling |
| Platform | Android updates | Improved Android build support |
| Platform | Web updates | Emscripten compatibility improvements |

## 4.x → 5.0 (2024 — LOW RISK)

| Subsystem | Change | Details |
|-----------|--------|---------|
| Core | Function signature updates | Some functions have updated parameters — verify usage |
| Core | Deprecated function removal | Functions deprecated in 4.x may be removed |
| Models | 3D model loading improvements | Better glTF support |
| Shaders | Shader uniform naming | Verify uniform location queries |
| Build | CMake improvements | Better find_package support |

## 3.x → 4.0 (2022 — MEDIUM RISK)

| Subsystem | Change | Details |
|-----------|--------|---------|
| Core | `GetMousePosition()` returns Vector2 | Was separate float returns |
| Core | File I/O functions renamed | `LoadFileData` → `LoadFileData` (verify) |
| Textures | `LoadImageFromTexture` | New function for texture → image conversion |
| Textures | Image format handling | Improved format conversion |
| Models | Mesh data structure changes | Verify mesh attribute access |
| Audio | `InitAudioDevice()` required | Must call before audio functions |
| Math | raymath functions updated | Some function signatures changed |

## 2.x → 3.0 (2020 — HIGH RISK — Historical)

| Subsystem | Change | Details |
|-----------|--------|---------|
| Core | Major API reorganization | Many functions renamed for consistency |
| Core | `InitWindow()` required | Window must be initialized before most functions |
| Colors | `Color` struct changed | Now uses unsigned char (0-255) for all channels |
| Textures | Texture2D renamed | `Texture2D` → `Texture` (typedef) |
| Models | Model loading API | `LoadModel()` and `LoadModelAnimations()` updated |
| Shaders | Shader system overhaul | `LoadShader()` and `LoadShaderCode()` updated |
| Math | Quaternion functions | Added/renamed quaternion operations |

## Common Migration Checklist (Any Version)

1. Check the [official changelog](https://github.com/raysan5/raylib/releases) for your specific version transition
2. Update raylib.h and linked libraries
3. Rebuild project — most changes will cause compile errors
4. Verify resource loading patterns (Load*/Unload* pairs)
5. Test on all target platforms
6. Check shader compatibility if using custom shaders

## Notes

- Raylib maintains excellent backwards compatibility between minor versions
- Breaking changes are concentrated in major version bumps (3.0, 4.0)
- The [raylib cheatsheet](https://www.raylib.com/cheatsheet/cheatsheet.html) is updated with each release
- Most API changes are renames for consistency, not fundamental behavior changes
- When in doubt, check the specific release notes on GitHub
