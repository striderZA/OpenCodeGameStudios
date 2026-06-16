# Babylon.js Deprecated APIs

> Last verified: 2026-06-15

APIs that are deprecated in Babylon.js 9.x. Prefer the replacements listed.

---

## Audio

| Deprecated | Replacement | Since | Notes |
|------------|-------------|-------|-------|
| Legacy `Engine` audio (default pre-7.52) | Audio Engine V2 (`@babylonjs/core/Audio/audioEngineV2`) | 7.52 | Legacy engine no longer created by default. Set `{ audioEngine: true }` in Engine constructor to force legacy. |
| `Sound` class (legacy) | `AudioEngineV2` node-based API | 8.0 | Legacy Sound class still works but no longer updated. V2 supports spatial audio, ambient soundscapes, interactive effects. |

---

## CSG / Geometry

| Deprecated | Replacement | Since | Notes |
|------------|-------------|-------|-------|
| `CSG` class | `CSG2` (Manifold-based) | 7.31 | `CSG2` is async — call `InitializeCSG2Async()` before use. `Inverse` is removed. `toMesh` signature changed. |

---

## SceneLoader

| Deprecated | Replacement | Since | Notes |
|------------|-------------|-------|-------|
| `SceneLoader.Load` (sync, returns plugin) | `SceneLoader.LoadAsync` | 7.34 | Sync version returns void now. Use async version for plugin detection via `OnPluginActivatedObservable`. |
| `SceneLoader.Append` (sync) | `SceneLoader.AppendAsync` | 7.34 | Same pattern |
| `SceneLoader.ImportMesh` (sync, returns plugin) | `SceneLoader.ImportMeshAsync` | 7.34 | Same pattern |

---

## Materials

| Deprecated | Replacement | Since | Notes |
|------------|-------------|-------|-------|
| `mesh.overrideMaterialSideOrientation` | `mesh.sideOrientation` | 7.11 | New name. `material.sideOrientation` takes precedence when set. |

---

## WebVR

| Deprecated | Replacement | Since | Notes |
|------------|-------------|-------|-------|
| WebVR API | WebXR | 7.0 | Full removal. VR experience helper falls back to WebXR. |

---

## Engine

| Deprecated | Replacement | Since | Notes |
|------------|-------------|-------|-------|
| `ThinEngine` (direct reference) | `AbstractEngine` | 7.2.2 | `getEngine()` returns `AbstractEngine`. Use `AbstractEngine` for type annotations. |

---

## Tools / Build

| Deprecated | Replacement | Since | Notes |
|------------|-------------|-------|-------|
| Webpack builds | Vite | 9.5.0 | Babylon.js migrated its own build system from webpack to Vite. Project builds should use Vite (see scaffolding). |
| Jest | Vitest | 8.56.2 | Babylon.js migrated test infrastructure from Jest to Vitest. New projects should use Vitest. |
| ts-patch | TypeScript 6.0 native | 9.1.0 | TypeScript 6.0 removed the need for ts-patch. Use `typescript@^6.0`. |

---

## Particle Systems

| Deprecated | Replacement | Since | Notes |
|------------|-------------|-------|-------|
| NPE Texture block `.texture` (direct set) | Updated `.texture` property | 8.54.2 | Breaking change in how texture blocks update in Node Particle Editor. Use the updated API. |

---

## WebGPU

| Deprecated | Replacement | Since | Notes |
|------------|-------------|-------|-------|
| GLSL shader compilation via TintWASM | Native WGSL shaders | 7.19 | Main materials generate WGSL directly. Use `{ useGLSL: true }` in material constructor only if injecting custom GLSL via MaterialPlugin. |

---

## How to Check for Deprecation Usage

Deprecated APIs are marked with `@deprecated` JSDoc in the Babylon.js source.
TypeScript will show strikethrough for deprecated symbols. In the Playground,
JS also shows strikethrough since Babylon.js 9.0 (PR #18010).

Run in your project:
```bash
# Check TypeScript compilation for deprecated usage
npx tsc --noEmit 2>&1 | grep -i deprecated
```
