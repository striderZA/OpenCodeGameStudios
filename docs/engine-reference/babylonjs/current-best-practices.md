# Babylon.js 9.x — Current Best Practices

> Last verified: 2026-06-15

Practices that changed or emerged since the LLM training cutoff (May 2025).
Use these over older patterns.

---

## 1. Tree-Shakeable Imports

Babylon.js 9.x is fully tree-shakeable. Import only what you need:

```typescript
// ✅ Correct — tree-shakeable (recommended)
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";

// ❌ Wrong — imports the entire engine
import * as BABYLON from "@babylonjs/core";
```

`@babylonjs/core` no longer exports a barrel — you must import from the
individual module paths.

---

## 2. Frame Graph (v1)

Frame Graph is stable in 9.0. Use it for full control over the rendering
pipeline. Previously an alpha feature in 8.x.

```typescript
import { FrameGraph } from "@babylonjs/core/FrameGraph/frameGraph";
import { FrameGraphTask } from "@babylonjs/core/FrameGraph/Tasks/frameGraphTask";
// ... build tasks and connect them as a DAG
```

**Benefits**: 40%+ GPU memory savings, explicit resource management, custom
render pipeline composition. Use the Node Render Graph Editor for visual
authoring, or the class API programmatically.

---

## 3. Clustered Lighting

New in 9.0. Groups lights into screen-space tiles and depth slices. Pixels
only calculate lighting from lights that actually affect them.

```typescript
// Enable clustered lighting on the scene
scene.clusteredLightingEnabled = true;
```

Supports both WebGPU and WebGL 2. Works with hundreds to thousands of lights
at smooth framerates.

---

## 4. Audio Engine V2

Modern node-based audio system. Prefer over the legacy `Sound` class.

```typescript
import { AudioEngineV2 } from "@babylonjs/core/Audio/audioEngineV2";

const audioEngine = new AudioEngineV2();
const musicNode = audioEngine.createSound("music", "assets/music.mp3");
musicNode.play();
```

Supports spatial audio, ambient soundscapes, interactive effects, and waveform
analysis (9.11.0+).

---

## 5. Inspector v2

Ground-up rebuild. Service-oriented architecture with React UI components.

```typescript
scene.debugLayer.show({
  embedMode: true,      // inline overlay mode
  useInspectorV2: true, // explicitly opt into v2 (default for 9.x)
});
```

Features: extensible panes, toolbar items, property editors, dark/light themes,
overlay and inline modes. New texture preview, clustered lights visualization.

---

## 6. Vitest over Jest

Babylon.js migrated from Jest to Vitest (8.56.2). New Babylon.js projects
should use Vitest:

```bash
npm install -D vitest happy-dom
```

```json
// package.json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

---

## 7. Vite over Webpack

Babylon.js removed webpack builds in 9.5.0 ("So long webpack, and thanks for
all the fish"). Use Vite for new projects:

```bash
npm install -D vite
```

```typescript
// vite.config.ts
import { defineConfig } from "vite";

export default defineConfig({
  build: { target: "esnext" },
  optimizeDeps: {
    exclude: ["@babylonjs/havok"], // Havok is WASM — must not be pre-bundled
  },
});
```

---

## 8. Havok Physics — ES Module Import

Havok Physics V2 must be imported as an ES module, not bundled:

```typescript
import HavokPhysics from "@babylonjs/havok";

const havokInstance = await HavokPhysics();
const hk = new BABYLON.HavokPlugin(true, havokInstance);
scene.enablePhysics(new Vector3(0, -9.81, 0), hk);
```

The `optimizeDeps.exclude: ["@babylonjs/havok"]` in `vite.config.ts` is
critical — if Vite pre-bundles the WASM module, it will fail at runtime.

---

## 9. OpenPBR Materials

New material model supporting the OpenPBR standard (Academy Software
Foundation). Maps parameter groups (Base, Specular, Coat, Thin-film) to the
existing PBR system:

```typescript
// OpenPBR-compatible PBR material
const material = new PBRMaterial("car", scene);
// Use standard PBR properties — they map to OpenPBR parameters
material.metallic = 0.8;
material.roughness = 0.2;
// Coat layer
material.clearCoat = 0.5;
material.clearCoatRoughness = 0.1;
```

---

## 10. Dynamic IBL Shadows

Environment shadows that respond to lighting changes in real-time:

```typescript
// Enable IBL shadows on the scene
scene.environmentShadowEnabled = true;
// Updates animate with lighting changes
```

---

## 11. SDF Text Rendering

Resolution-independent text in 3D:

```typescript
import { SDFText } from "@babylonjs/core";

const text = new SDFText("label", scene);
text.text = "HELLO WORLD";
text.fontSize = 48;
text.position = new Vector3(0, 2, 0);
```

Use for in-world UI, labels, signage, HUD. Sharp at any size.

---

## 12. Geospatial Camera

For planet-scale scenes:

```typescript
import { GeospatialCamera } from "@babylonjs/core/Cameras/geospatialCamera";

const camera = new GeospatialCamera("geoCam", new Vector3(0, 0, 0), scene);
camera.radius = 6371000; // Earth radius in meters
```

Includes globe-anchored drag, scroll-to-zoom, animated flights via
`flyToAsync`, collision detection, auto clip plane adjustment.

---

## 13. Large World Rendering

For scenes with large coordinate ranges (prevents floating-point precision
issues):

```typescript
scene.useLargeWorldRendering = true;
```

Use alongside GeospatialCamera for planet-scale experiences.

---

## 14. Volumetric Lighting

Realistic light scattering with configurable extinction and phase parameters:

```typescript
const volLight = new VolumetricLighting("fog", scene);
volLight.extinction = 0.1;
volLight.phase = 0.5;
```

Supports directional light sources, WebGPU compute shaders, WebGL 2 fallback.

---

## 15. Animation Retargeting

Reuse animations across different skeletons:

```typescript
import { AnimationRetargeting } from "@babylonjs/core";

const retarget = new AnimationRetargeting(sourceSkeleton, targetSkeleton);
const clip = retarget.retargetAnimation(sourceAnimation);
```

Fixed in 8.53.1 for root node processing.

---

## 16. TypeScript 6.0

Babylon.js 9.1.0 upgraded to TypeScript 6.0. Your project should use
`typescript@^6.0`:

```json
{
  "devDependencies": {
    "typescript": "^6.0.0"
  }
}
```

Key differences from TS 5.x: removed `ts-patch` (no longer needed), improved
ESM support, new `using` declarations.

---

## 17. MCP Servers

Babylon.js now provides MCP servers for AI-assisted development (9.11.0+):

- **nme** — Node Material Editor (shader graph)
- **gui** — GUI Editor
- **flowgraph** — Flow Graph Editor

Configure in `opencode.json`:

```json
{
  "mcp": {
    "babylonjs-nme": {
      "type": "local",
      "command": ["npx", "@babylonjs/mcp-servers", "nme"],
      "enabled": true
    }
  }
}
```

---

## 18. Performance Optimization

### Frame Budget Monitoring
```typescript
const instrumentation = new EngineInstrumentation(engine);
instrumentation.gpuFrameTimeCounter?.onActivate(); // GPU timing
```

### Performance Priority Modes
```typescript
scene.performancePriority = ScenePerformancePriority.Intermediate;
```

### Aggressive Mode (for simple scenes)
```typescript
scene.performancePriority = ScenePerformancePriority.Aggressive;
```
Enables: `skipFrustumClipping`, `doNotSyncBoundingInfo`,
`maintainStateBetweenFrames`. Not backwards compatible — test thoroughly.

### Draw Call Budget
Target ~500 draw calls for web. Use instancing for repeated geometry:

```typescript
const instanceCount = 100;
const instanceBuffer = new VertexBuffer(
  engine,
  instanceData,
  VertexBuffer.InstancePositionKind,
  { instanceDataStep: 1 }
);
mesh.setVerticesBuffer(instanceBuffer);
```
