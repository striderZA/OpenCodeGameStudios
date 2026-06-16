# Babylon.js Performance — Quick Reference

Last verified: 2026-06-14 | Engine: Babylon.js 9.10.1

## What Changed Since LLM Cutoff (~May 2025)

### v9.x Changes
- Tree-shaking pure barrel for smaller bundles (v9.8)
- WebGPU: async render pipeline pre-warming API (v9.1)
- WebGPU: vertex pulling support for Standard/PBR/OpenPBR (v9.1)
- CPU particle support in WebGPU FAST snapshot rendering (v9.7)
- KTX noMipmap flip fix for compressed sRGB mipmaps (v9.12)
- SSAO2 world-space normals support (v9.12)
- HALF_FLOAT vertex buffer type support (v9.12)

## Current API Patterns

### Draw Call Optimization

```typescript
import { Mesh } from "@babylonjs/core/Meshes/mesh";

// Merge static geometry into single draw call
const mergedMesh = await Mesh.MergeMeshesAsync(
  staticMeshesArray,
  undefined,
  undefined,
  undefined,
  true,  // allow32BitsIndices
  false,
  true   // disposeSource
);

// Freeze non-moving meshes
mesh.freeze(); // Freezes world matrix (saves CPU)

// Freeze all active meshes in scene
scene.freezeActiveMeshes();

// Disable pointer picking when not needed
scene.skipPointerMovePicking = true;
```

### Instancing Strategies

**Thin Instances** (max performance, large counts):
```typescript
const mesh = MeshBuilder.CreateSphere("sphere", { diameter: 1 }, scene);
mesh.setEnabled(false); // Hide root mesh

// Add many instances
const count = 10000;
const matrices = new Float32Array(count * 16); // 16 floats per matrix

for (let i = 0; i < count; i++) {
  const matrix = Matrix.Translation(
    Math.random() * 100,
    Math.random() * 20,
    Math.random() * 100
  );
  matrix.copyToArray(matrices, i * 16);
}

mesh.thinInstanceSetBuffer("matrix", matrices, 16);

// Per-instance colors
const colors = new Float32Array(count * 4);
for (let i = 0; i < count; i++) {
  colors.set([Math.random(), Math.random(), Math.random(), 1], i * 4);
}
mesh.thinInstanceSetBuffer("color", colors, 4);

// For updateable buffers, pass static = false:
mesh.thinInstanceSetBuffer("matrix", matrices, 16, false);
```

**Regular Instances** (individual control, smaller counts):
```typescript
const root = MeshBuilder.CreateBox("root", { size: 1 }, scene);
root.setEnabled(false); // Hide root

for (let i = 0; i < 100; i++) {
  const instance = root.createInstance(`instance_${i}`);
  instance.position = new Vector3(Math.random() * 50, 0, Math.random() * 50);
  instance.scaling = new Vector3(0.5, 1, 0.5);
}
```

**Solid Particle System (SPS)** (dynamic particle-like objects):
```typescript
import { SolidParticleSystem } from "@babylonjs/core/Particles/solidParticleSystem";

const sps = new SolidParticleSystem("sps", scene);
sps.addShape(sphereMesh, 500); // 500 particles from sphere shape
sps.buildMesh();

sps.initParticles = () => {
  for (let p = 0; p < sps.nbParticles; p++) {
    const particle = sps.particles[p];
    particle.position = new Vector3(Math.random() * 100, 0, Math.random() * 100);
    particle.color = new Color4(1, 0, 0, 1);
  }
};

sps.updateParticle = (particle) => {
  particle.position.y += 1; // Move up (example)
  return particle;
};

sps.setParticles(); // Call after each batch of updates
```

### Level of Detail (LOD)

```typescript
import { LODLevel } from "@babylonjs/core/Meshes/lodLevel";

// Create simplified versions of a mesh (or use external LOD models)
const highDetail = MeshBuilder.CreateSphere("high", { diameter: 1, segments: 32 }, scene);
const midDetail = MeshBuilder.CreateSphere("mid", { diameter: 1, segments: 16 }, scene);
const lowDetail = MeshBuilder.CreateSphere("low", { diameter: 1, segments: 8 }, scene);

// Register LOD levels (distance in world units)
highDetail.addLODLevel(50, midDetail);   // At > 50 units → mid detail
highDetail.addLODLevel(100, lowDetail);  // At > 100 units → low detail
highDetail.addLODLevel(200, null);       // At > 200 units → invisible

// Global LOD control
scene.lodAutoApply = true; // Default
```

### Texture Optimization

```typescript
// KTX2 with Basis Universal (GPU-native compression)
const texture = new Texture("textures/grass.ktx2", scene);

// Texture atlas reduces draw calls + texture binds
// (Create atlas in asset pipeline, load as single texture)

// Reduce texture resolution
texture.rescale(512, 512);

// Clamp sampling for pixel art
texture.updateSamplingMode(Texture.NEAREST_NEAREST);
```

### Profiling

```typescript
// Inspector (visual debugging)
scene.debugLayer.show({
  embedMode: true,
});

// Programmatic profiling
import { SceneInstrumentation } from "@babylonjs/core/Instrumentation/sceneInstrumentation";

const inst = new SceneInstrumentation(scene);
inst.captureActiveMeshesEvaluationTime = true;
inst.captureRenderTargetsRenderTime = true;
inst.captureFrameTime = true;
inst.captureRenderTime = true;
inst.captureParticlesRenderTime = true;
inst.capturePhysicsTime = true;

// Access counters
scene.onAfterRenderObservable.add(() => {
  const drawCalls = inst.drawCallsCounter.current;
  const frameTime = inst.frameTimeCounter.current; // ms
  const physicsTime = inst.physicsTimeCounter.current;

  // Log if over budget
  if (frameTime > 16.67) { console.warn("Frame time > 60fps budget"); }
  if (drawCalls > 2000) { console.warn("Too many draw calls"); }
});
```

### Engine Configuration

```typescript
// HiDPI support
engine.setHardwareScalingLevel(1 / Math.min(2, window.devicePixelRatio));

// Shadow map resolution
shadowGenerator.setShadowMap(1024); // Or 512 for mobile

// Disable auto-clear for full-screen passes (skybox)
scene.autoClear = false;

// Limit frame rate on battery
engine.setRenderLoop(-1, () => {
  // Only render when needed (e.g., scene has changed)
});
```

### Asset Loading

```typescript
import { AssetsManager } from "@babylonjs/core/Misc/assetsManager";

const assetsManager = new AssetsManager(scene);

// Mesh task
const meshTask = assetsManager.addMeshTask("car", "", "models/", "car.glb");
meshTask.onSuccess = (task) => {
  // Configure loaded meshes
  task.loadedMeshes.forEach((m) => m.freeze());
};

// Texture task
const texTask = assetsManager.addTextureTask("tex", "textures/env.ktx2");
texTask.onSuccess = (task) => {
  scene.environmentTexture = task.texture;
};

// Progress
assetsManager.onProgress = (remaining, total, task) => {
  console.log(`Loading: ${(total - remaining) / total * 100}%`);
};

assetsManager.load();
```

## Performance Budgets (Targets)

| Metric | Desktop Target | Mobile Target |
|---|---|---|
| Frame time | <16.67ms (60fps) | <33.33ms (30fps) |
| Draw calls | <2000 | <500 |
| Dynamic physics bodies | <100 | <50 |
| Shadow map resolution | 2048×2048 | 512×512 |
| Texture memory | <512MB | <128MB |
| SPS particles | <50000 | <5000 |
| Thin instances | <100000 | <10000 |

## Important Notes

- Profile before optimizing — `SceneInstrumentation` gives you hard numbers
- Freeze static meshes immediately after positioning
- Prefer thin instances over regular instances for large counts (>500)
- KTX2 with Basis Universal reduces GPU memory and download size
- Use `engine.setHardwareScalingLevel()` to cap rendering resolution on mobile
- Merge static geometry at build time, not runtime
- Browser DevTools (Performance tab) are your best friend for CPU profiling
