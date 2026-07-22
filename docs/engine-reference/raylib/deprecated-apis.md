# Raylib — Deprecated APIs

Last verified: 2026-07-22

Raylib maintains strong backwards compatibility. Deprecated functions are
rarely removed, but should be replaced for future-proofing.

## Core Functions

| Deprecated | Use Instead | Since | Notes |
|------------|-------------|-------|-------|
| `GetMouseX()` / `GetMouseY()` | `GetMousePosition().x` / `.y` | 4.0 | Use Vector2 for consistency |
| `GetMouseCursor()` | `GetMouseCursor()` | — | Still valid, but verify usage |
| `SetMouseCursor()` | `SetMouseCursor()` | — | Still valid |
| Old file I/O naming | `LoadFileData()` / `SaveFileData()` | 4.0 | Verify current naming |

## Texture & Image Functions

| Deprecated | Use Instead | Since | Notes |
|------------|-------------|-------|-------|
| `Texture2D` type name | `Texture` | 3.0 | Texture2D is typedef, use Texture |
| `LoadTexture()` with invalid path | Check return value | — | Returns empty texture on failure |
| Manual image format conversion | `ImageFormat()` | 3.0 | Use built-in conversion |

## Model Functions

| Deprecated | Use Instead | Since | Notes |
|------------|-------------|-------|-------|
| Old model loading | `LoadModel()` / `LoadModelFromMesh()` | — | Verify current API |
| Manual mesh upload | `UploadMesh()` | 4.0 | Explicit GPU upload |

## Math Functions (raymath)

| Deprecated | Use Instead | Since | Notes |
|------------|-------------|-------|-------|
| Manual vector ops | `Vector2Add()`, `Vector2Scale()` | — | Use raymath functions |
| Manual matrix ops | `MatrixMultiply()`, `MatrixTranslate()` | — | Use raymath functions |
| Manual quaternion ops | `QuaternionIdentity()`, `QuaternionMultiply()` | — | Use raymath functions |

## Audio Functions

| Deprecated | Use Instead | Since | Notes |
|------------|-------------|-------|-------|
| Audio without init | `InitAudioDevice()` first | 4.0 | Must init before audio calls |
| Old sound loading | `LoadSound()` / `LoadSoundFromWave()` | — | Verify current API |

## Text Functions

| Deprecated | Use Instead | Since | Notes |
|------------|-------------|-------|-------|
| `DrawText()` with no font | `DrawTextEx()` for custom fonts | — | Use DrawTextEx for font control |
| Manual text measurement | `MeasureText()` / `MeasureTextEx()` | — | Use MeasureTextEx for accuracy |

## Patterns (Not Just APIs)

| Deprecated Pattern | Use Instead | Why |
|--------------------|-------------|-----|
| Not calling `InitWindow()` | Always call first | Required before most functions |
| Not calling `InitAudioDevice()` | Always call before audio | Required for audio functions |
| Not unloading resources | Always `Unload*()` matching `Load*()` | Memory leak prevention |
| Loading textures every frame | Load once, reuse | Performance: texture loading is expensive |
| Using global variables for game state | Structured state management | Better code organization |
| Not checking resource validity | Check `texture.id != 0` etc. | Handle load failures gracefully |

## Notes

- Raylib is conservative about removing deprecated APIs
- Most "deprecated" functions still work but have better alternatives
- When upgrading versions, check release notes for specific deprecations
- The [raylib wiki](https://github.com/raysan5/raylib/wiki) tracks API changes
- Compile errors after upgrade usually indicate renamed functions — search release notes
