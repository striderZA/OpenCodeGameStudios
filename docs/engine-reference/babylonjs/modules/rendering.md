# Babylon.js Rendering — Quick Reference

Last verified: 2026-06-14 | Engine: Babylon.js 9.10.1

## What Changed Since LLM Cutoff (~May 2025)

### v9.x Changes
- Tree-shaking pure barrel (`@babylonjs/core/pure`) — see best-practices.md
- Scene optimization API refinements
- Inspector v2 with improved debugging UI
- WebGPU: async render pipeline pre-warming API (v9.1)
- WebGPU: vertex pulling support for Standard, PBR, and OpenPBR materials (v9.1)
- OpenPBR: surface tinting support from glTF (v9.7)

### v8.x Changes
- Right-handed camera rotation fix (8.10.1)
- PBR translucency calculation corrections (8.2.0)

## Current API Patterns

### Engine Setup

```typescript
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Color4, Vector3 } from "@babylonjs/core/Maths/math";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";

const engine = new Engine(canvas, true, { antialias: true, alpha: false });
const scene = new Scene(engine);
scene.clearColor = new Color4(0.1, 0.1, 0.2, 1.0);
```

### Cameras

| Camera | Use Case | Key Features |
|---|---|---|
| `ArcRotateCamera` | Orbit/Debug camera | Alpha/beta/radius, pinch-to-zoom, `lowerRadiusLimit`/`upperRadiusLimit` |
| `FollowCamera` | Chase cam (racing, third-person) | Follows target mesh, configurable height/offset/distance |
| `UniversalCamera` | FPS/Free camera | WASD controls, mouse look, gamepad support |
| `FreeCamera` | Simple camera base | Basic movement, attach to mesh |

```typescript
const camera = new ArcRotateCamera("Camera", -Math.PI / 2, Math.PI / 2, 10, Vector3.Zero(), scene);
camera.attachControl(canvas, true);
camera.lowerRadiusLimit = 5;
camera.upperRadiusLimit = 50;
camera.panningSensibility = 0; // Disable pan for game cameras
```

### Lights

| Light | Shadows | Performance |
|---|---|---|
| `HemisphericLight` | No | Fastest |
| `DirectionalLight` | Yes (good for sun) | Medium |
| `PointLight` | Yes (small area) | Medium |
| `SpotLight` | Yes (cone) | Heavier |

```typescript
const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
hemi.intensity = 0.7;

const sun = new DirectionalLight("sun", new Vector3(-1, -2, -1), scene);
sun.position = new Vector3(50, 100, 50);

const shadowGenerator = new ShadowGenerator(1024, sun);
shadowGenerator.useBlurExponentialShadowMap = true;
shadowGenerator.setDarkness(0.3);
```

### Meshes

```typescript
// MeshBuilder (preferred)
const sphere = MeshBuilder.CreateSphere("sphere", { diameter: 1, segments: 16 }, scene);
const box = MeshBuilder.CreateBox("box", { size: 1 }, scene);
const ground = MeshBuilder.CreateGround("ground", { width: 100, height: 100, subdivisions: 4 }, scene);

// Transforms
sphere.position = new Vector3(10, 0, 5);
sphere.rotation = new Vector3(0, Math.PI / 4, 0);
sphere.scaling = new Vector3(2, 2, 1);

// Freeze static meshes (saves CPU)
ground.freeze();

// Disposal (MANDATORY when removing)
mesh.dispose();
```

### Materials

```typescript
// PBR Material (preferred for new projects)
const pbr = new PBRMaterial("carPaint", scene);
pbr.metallic = 0.3;
pbr.roughness = 0.7;
pbr.albedoColor = new Color3(0.9, 0.1, 0.1);
pbr.environmentIntensity = 1.0;

// Standard Material (legacy, still functional)
const stdMat = new StandardMaterial("std", scene);
stdMat.diffuseColor = new Color3(0.5, 0.5, 0.5);
stdMat.specularColor = new Color3(0.2, 0.2, 0.2);
```

### Textures

```typescript
// Texture from file
const texture = new Texture("textures/grass.png", scene);
texture.uScale = 4;
texture.vScale = 4;

// HDR Environment
const envTexture = CubeTexture.CreateFromPrefilteredData("environment.env", scene);
scene.environmentTexture = envTexture;

// DynamicTexture (runtime-generated)
const dt = new DynamicTexture("dynamic", { width: 512, height: 512 }, scene, false);
const ctx = dt.getContext();
ctx.fillStyle = "red";
ctx.fillRect(0, 0, 512, 512);
dt.update();
```

### Scene Management

```typescript
// Switch scenes
scene.dispose(); // Clean up old scene
const newScene = new Scene(engine); // Create new scene

// Activate/deactivate
scene.activeCamera = camera;
scene.getEngine().runRenderLoop(() => scene.render());
```

## Important Notes

- Always dispose meshes, materials, and textures when no longer needed
- `scene.freezeActiveMeshes()` + individual `mesh.freeze()` for static levels
- Use `scene.onBeforeRenderObservable` / `scene.onAfterRenderObservable` for per-frame logic
- Call `engine.resize()` on window resize
- Enable `engine.setHardwareScalingLevel(1)` for 1:1 pixel mapping
