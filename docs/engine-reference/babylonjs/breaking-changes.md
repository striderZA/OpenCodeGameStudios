# Babylon.js Breaking Changes

> Last verified: 2026-06-15

This file documents breaking changes across Babylon.js versions relevant to
this project (8.x → 9.12.0).

Source: https://doc.babylonjs.com/breaking-changes/

---

## 9.0.0

### Core
- `EquiRectangularCubeTexture.delayLoad` — removed redundant state assignment.
  No functional impact on correct usage.
- Splat shader materials no longer have culling enabled by default. If you
  previously worked around splat culling issues, remove the workaround.

### Viewer
- Environment and IBL irradiance direction bug fixed. Scenes using IBL shadows
  may render slightly differently (now correct).

---

## 8.54.2

### Core — NPE Texture Block

`NPE Texture block .texture` updates — breaking change for Node Particle Editor
users who manipulate texture blocks programmatically. If you use the Node
Particle Editor programmatically, review PR #18058.

---

## 8.10.1

### Camera Orientation (Right-Handed Scenes)

Setting/getting `rotation` or `rotationQuaternion` on `TargetCamera`,
`FreeCamera`, or `ArcRotateCamera` in right-handed scenes was 180° rotated on
the Y-axis. This is now fixed.

**Impact**: Any code that previously set camera rotation in right-handed scenes
will now be wrong. Left-handed scenes unaffected. Default camera orientation
still faces +Z for backwards compatibility.

**Fix**: If upgrading from ≤8.10.0, negate the Y rotation of affected camera
code when using right-handed scenes.

---

## 8.2.0

### PBR Translucency — Legacy Flag

Previous PRs (#16337, #16214) corrected translucency/transmission calculations.
A flag was added to restore old behavior:

```typescript
material.subSurface.legacyTranslucency = true; // per-material
// Or globally:
PBRSubSurfaceConfiguration.DEFAULT_LEGACY_TRANSLUCENCY = true;
```

Default is `false` (new behavior). Only set this if your scene renders
differently after upgrading and you need the old look.

---

## 7.54.0

### PBR Subsurface — Albedo Application Order

Bug fix: albedo color was incorrectly applied when outputting subsurface block.
Old behavior can be restored:

```typescript
material.subSurface.applyAlbedoAfterSubSurface = true;
// Or globally (8.0.2+):
PBRSubSurfaceConfiguration.DEFAULT_APPLY_ALBEDO_AFTERSUBSURFACE = true;
```

---

## 7.52.0

### Legacy Audio Engine Deprecated

The old audio engine is no longer created by default. To force legacy audio:

```typescript
const engine = new Engine(canvas, true, { audioEngine: true }, true);
```

Use Audio Engine V2 instead for new projects.

---

## 7.47.3

### Alpha Transparency Mode

`transparencyMode` is now always respected when set to a non-null value,
regardless of `mesh.visibility` or `material.alpha`. Previously the behavior
was inconsistent.

**Fix**: If upgrading and alpha rendering breaks, explicitly set
`material.transparencyMode` to the desired value:
- `Material.MATERIAL_OPAQUE`
- `Material.MATERIAL_ALPHATEST`
- `Material.MATERIAL_ALPHABLEND`
- `Material.MATERIAL_ALPHATESTANDBLEND`

---

## 7.46.0

### Custom Loading Screens

Internal data structure changed. If you implemented a custom loading screen:

1. Set `this._isLoading = true` in `displayLoadingUI()` and `false` in
   `hideLoadingUI()`
2. Use `this._loadingDivToRenderingCanvasMap` instead of `this._loadingDiv`

---

## 7.45.0

### PBR Rough Metals Rendering

PBR rough metals now look closer to ray-traced results. Art may need
adjustment. Restore old behavior:

```typescript
PBRBRDFConfiguration.DEFAULT_MIX_IBL_RADIANCE_WITH_IRRADIANCE = false;
```

---

## 7.34.0

### SceneLoader Return Values

`SceneLoader.Load`, `SceneLoader.Append`, `SceneLoader.ImportMesh` no longer
return the plugin used for loading. They now return `void`.

**Fix**: Register to `SceneLoader.OnPluginActivatedObservable` to detect
which plugin was used.

---

## 7.31.0

### Instance Parenting

Instances now inherit the parent of the source mesh. Previously instances were
parentless. Fix: if your code assumed instances had no parent, update it.

### CSG → CSG2 Migration

The old `CSG` class is deprecated in favor of `CSG2` (uses Manifold library).

```typescript
await BABYLON.InitializeCSG2Async();
const sphereCSG = BABYLON.CSG2.FromMesh(sphere);
const result = boxCSG.subtract(sphereCSG).toMesh("result");
```

Note: `Inverse` is removed. `toMesh` now takes 3 parameters: `name, scene, options`.

---

## 7.19.0

### WebGPU WGSL Shaders

Main materials (`StandardMaterial`, `PBRMaterial`, `BackgroundMaterial`)
generate pure WGSL for WebGPU instead of compiling GLSL with TintWASM. Force
GLSL path if you inject custom code with MaterialPlugin:

```typescript
new PBRMaterial("name", scene, { useGLSL: true });
```

---

## 7.11.0

### mesh.overrideMaterialSideOrientation → mesh.sideOrientation

Renamed property. `mesh.sideOrientation` is used UNLESS
`material.sideOrientation` is not null.

---

## 7.6.0

### XR Canvas Compatibility

Canvas is no longer marked `xrCompatible` by default. It is made compatible
when entering XR. Should not affect XR users.

---

## 7.2.2

### AbstractEngine Decoupling

`WebGPUEngine` decoupled from `Engine`. Common functions moved from
`ThinEngine` to `AbstractEngine`. TypeScript impact: `getEngine()` returns
`AbstractEngine` instead of `ThinEngine` in some contexts.

---

## 7.0.0

### Thin Instances
`staticBuffer` parameter default changed to `true`. Set to `false` if you
need Angle to rearrange buffers (OpenGL performance fix).

### WebVR Removed
Full removal. Falls back to WebXR via VR experience helper.

### glTF Serializer — Right-Handed Scale
Exporter no longer bakes coordinate conversion into mesh data. Instead
negates one axis of the asset's root node. Assets may appear with negative
scale on import.

### Material Cloning — Textures
`cloneTexturesOnlyOnce` defaults to `true`. Set to `false` to duplicate
textures per channel on clone (old behavior).

### ShaderPath Typed
`ShaderPath` parameter typed from `any` — TypeScript projects may need
to update their type signatures.
