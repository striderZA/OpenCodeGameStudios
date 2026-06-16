# Babylon.js Scaffolding Reference

> **Purpose:** Reference for agents running `/setup-engine babylonjs`. Describes
> what files to generate, which dependency versions to pin, why side-effect
> imports exist, and how the pieces fit together.

---

## Generated Project Structure

```
<project-root>/
├── index.html                 # HTML shell: mounts <canvas id="renderCanvas">
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript config (ESNext, strict)
├── vite.config.ts             # Vite config with resolve alias
├── src/
│   ├── app.ts                 # Entry: bootstrap, WebGPU-first engine, Havok physics
│   ├── vite-env.d.ts          # Vite type declarations
│   ├── config/
│   │   └── template-config.ts # Feature flags
│   ├── css/
│   │   └── main.css           # Canvas sizing, resets
│   └── playground/
│       ├── main-scene.ts      # Camera, lights, DefaultRenderingPipeline, physics bodies
│       └── gui.ts             # HUD example (AdvancedDynamicTexture)
```

---

## `package.json`

### Dependencies (required)

```jsonc
{
  "name": "your-game",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "typecheck": "tsc --noEmit",
    "build": "npm run typecheck && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@babylonjs/core": "^9.12.0",
    "@babylonjs/gui": "^9.12.0",
    "@babylonjs/havok": "^1.3.12",
    "@babylonjs/loaders": "^9.12.0"
  },
  "devDependencies": {
    "@types/node": "^25.9.3",
    "typescript": "^6.0.3",
    "vite": "^8.0.16",
    "vite-plugin-glsl": "^1.6.0"
  }
}
```

### Version rules

| Package               | Pinned to   | Why                                                                    |
| --------------------- | ----------- | ---------------------------------------------------------------------- |
| `@babylonjs/core`     | `^9.12.0`   | Current stable                                                         |
| `@babylonjs/havok`    | `^1.3.12`   | **Independent versioning** — not `9.x`. Using `^9.x` breaks install. |
| `@babylonjs/gui`      | `^9.12.0`   | Matches core                                                           |
| `@babylonjs/loaders`  | `^9.12.0`   | GLB/GLTF loader + env texture loader                                   |
| `vite`                | `^8.0.16`   | ESM-only builds                                                        |
| `typescript`          | `^6.0.3`    | ESNext target, strict mode                                             |

### Optional additions

- `vite-plugin-compression` (`^0.5.1`) — generates `.gz` files at build time for
  smaller production bundles. Not needed during development.
- `vite-plugin-html` (`^3.2.2`) — HTML template variable injection
  (`<title>`, `<meta>`, etc.) via `import.meta.env`. Optional convenience.

---

## Havok Physics Initialization

`@babylonjs/havok` exports a factory function as the default export.
**It must be called to initialize the WASM.** Passing the function reference
(without `()`) to `HavokPlugin` produces "Havok is not ready" errors.

### In `src/app.ts` — engine-scoped

The App bootstraps physics once, before the scene is populated:

```typescript
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";

async _setPhysics(): Promise<void> {
  const { default: HavokPhysics } = await import("@babylonjs/havok");
  const hk = await HavokPhysics();          // ← invoke factory
  const plugin = new HavokPlugin(true, hk);
  this.scene.enablePhysics(new Vector3(0, -9.81, 0), plugin);
}
```

### In `main-scene.ts` — meshes with PhysicsAggregate

`PhysicsAggregate` works on any mesh after physics is enabled. Do NOT create a
second mesh for physics — the visual mesh is also the physics body:

```typescript
const ground = MeshBuilder.CreateGround("ground", { width: 10, height: 10 }, scene);
const groundMat = new StandardMaterial("groundMat", scene);
groundMat.diffuseColor = new Color3(0.22, 0.24, 0.3);
ground.material = groundMat;

new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0 }, scene);
```

---

## WebGPU-First Engine Creation

The scaffold tries WebGPU first, falling back to WebGL2. The engine is created
asynchronously in `app.ts`, before the scene and physics are initialized.

```typescript
import { Engine } from "@babylonjs/core/Engines/engine";
import { WebGPUEngine } from "@babylonjs/core/Engines/webgpuEngine";

async _createEngine(): Promise<Engine | WebGPUEngine> {
  if (templateConfig.rendering.webgpuFirst && "gpu" in navigator) {
    try {
      const webgpu = new WebGPUEngine(this.canvas, {
        adaptToDeviceRatio: templateConfig.rendering.engine.adaptToDeviceRatio,
        antialias: templateConfig.rendering.engine.antialias,
      });
      await webgpu.initAsync();
      return webgpu;
    } catch (error) {
      console.warn("WebGPU failed, falling back to WebGL2.", error);
    }
  }
  return new Engine(this.canvas, true, {
    stencil: templateConfig.rendering.engine.stencil,
    disableWebGL2Support: templateConfig.rendering.engine.disableWebGL2Support,
    adaptToDeviceRatio: templateConfig.rendering.engine.adaptToDeviceRatio,
  });
}
```

Because the engine and scene are created in `bootstrap()` (async) rather than in the
constructor, the class properties must use the **definite assignment assertion**
(`!`) or TypeScript strict mode will fail:

```typescript
public engine!: Engine | WebGPUEngine;
public scene!: Scene;
```

---

## GUI Setup (Async + WebGPU Compatibility)

The GUI function must be `async` because WebGPU needs an additional
DynamicTexture extension loaded before `CreateFullscreenUI` is called. Without
it, `Button.contains` crashes with `Cannot set properties of undefined
(setting '_shouldBlockPointer')`.

```typescript
export const CreateSceneGUI = async (scene: Scene): Promise<void> => {
  if (scene.getEngine().name === "WebGPU") {
    await import("@babylonjs/core/Engines/WebGPU/Extensions/engine.dynamicTexture");
  }

  const adt = AdvancedDynamicTexture.CreateFullscreenUI("ui");
  adt.rootContainer.scaleX = window.devicePixelRatio;
  adt.rootContainer.scaleY = window.devicePixelRatio;

  const title = new TextBlock("title", "Babylon.js Starter");
  title.color = "white";
  title.fontSize = 24;
  title.top = "-40%";
  title.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  adt.addControl(title);

  const fpsText = new TextBlock("fps", "");
  fpsText.color = "lime";
  fpsText.fontSize = 14;
  fpsText.top = "-45%";
  fpsText.left = "45%";
  fpsText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
  adt.addControl(fpsText);

  scene.getEngine().onEndFrameObservable.add(() => {
    fpsText.text = `FPS: ${scene.getEngine().getFps().toFixed(0)}`;
  });

  const panel = new StackPanel("panel");
  panel.top = "20%";
  adt.addControl(panel);

  const btn = Button.CreateSimpleButton("actionBtn", "Click Me");
  btn.width = "120px";
  btn.height = "40px";
  btn.color = "white";
  btn.background = "green";
  btn.onPointerUpObservable.add(() => {
    title.text = "Button Clicked!";
    title.color = "yellow";
    setTimeout(() => {
      title.text = "Babylon.js Starter";
      title.color = "white";
    }, 1500);
  });
  panel.addControl(btn);
};
```

The `window.devicePixelRatio` adjustment ensures crisp text on high-DPI
displays (Retina, etc.).

---

## Side-Effect Imports

Babylon.js 9.x uses a **modular `.pure.js` architecture** to support tree-shaking.
Each feature is split:

- `*.pure.js` — tree-shakeable code, no side effects
- `*.js` (no `.pure`) — re-exports the pure version and **registers runtime
  methods** on Babylon.js core classes (`Scene`, `Engine`, `Mesh`, etc.)

Importing a `.pure.js` path keeps the bundle lean but **methods like
`Scene.enablePhysics()` and `CubeTexture.CreateFromPrefilteredData()` are not
registered.** The non-pure module must be imported as a side-effect to trigger
registration.

### Required imports

| Import path                                                   | Registers                               | Needed when                             |
| ------------------------------------------------------------- | --------------------------------------- | --------------------------------------- |
| `@babylonjs/core/Physics/joinedPhysicsEngineComponent`          | `Scene.enablePhysics()`                   | Using Havok, Cannon, or any V2 physics |
| `@babylonjs/core/Materials/Textures/cubeTexture`                | `CubeTexture.CreateFromPrefilteredData()` | Using `createDefaultEnvironment` or `.env` skybox |
| `@babylonjs/core/Materials/Textures/Loaders/envTextureLoader`  | `.env` texture loading                   | Loading `.env` environment textures     |
| `@babylonjs/loaders`                                            | GLB/GLTF file loading                    | Loading `.glb` / `.gltf` models         |

### Application in `src/app.ts`

```typescript
import "@babylonjs/core/Physics/joinedPhysicsEngineComponent";
import "@babylonjs/core/Materials/Textures/cubeTexture";
import "@babylonjs/core/Materials/Textures/Loaders/envTextureLoader";
```

---

## `template-config.ts` — Feature Flags

Central config file toggling scaffold features. Generate with sensible defaults:

```typescript
export const templateConfig = {
  features: {
    physics: true,                // Havok physics
    axesViewer: import.meta.env.DEV,    // Axes in dev only
    pipeline: true,               // Default rendering pipeline
    gui: true,                    // AdvancedDynamicTexture HUD
  },
  rendering: {
    webgpuFirst: true,            // Try WebGPU, fall back to WebGL2
    engine: {
      adaptToDeviceRatio: true,
      antialias: true,
      powerPreference: "high-performance",
      stencil: true,
      disableWebGL2Support: false,
    },
  },
  debug: {
    showFps: true,
  },
} as const;
```

**Do not add `inspectorInDevOnly: true`.** The Babylon.js Inspector
(`@babylonjs/inspector`) is a React/FluentUI single-page application that adds
30+ MB of transitive dependencies. AI agents debug via console logs,
screenshots, and the programmatic API (`engine.getFps()`, `scene.meshes.length`)
— the visual inspector provides no value for AI-driven development.

---

## Assets and Demo Models

**The generated scaffold should not commit large binary files.** With `public/`
excluded from the scaffold, the playground uses Babylon.js primitives (ground,
sphere, materials) for the demo scene. This proves the full stack works
(engine, physics, GUI) without external assets.

When the developer is ready to use custom models:

1. Add `.glb` files to `public/model/`
2. Create an asset manifest (`src/assets.ts`) referencing them
3. Optionally use the `model-loader.ts` pattern (see playground) for loading
   with animations

For initial validation, the developer can optionally download the Xbot demo
model used in Babylon.js samples (~2.8 MB):

```bash
mkdir -p public/model
curl -o public/model/Xbot.glb \
  https://raw.githubusercontent.com/eldinor/bp900/main/public/model/Xbot.glb
```

---

## Starting Fresh — Removing Playground Code

When development begins on the actual game:

1. Delete `src/playground/` entirely
2. In `src/app.ts`, remove the demo scene import and instantiation
3. In `template-config.ts`, disable flags not yet needed
4. Create your own scene code in `src/scenes/`

After cleanup, `src/app.ts` is minimal:

```typescript
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import "@babylonjs/core/Physics/joinedPhysicsEngineComponent";

class App {
  public engine: Engine;
  public scene: Scene;

  constructor() {
    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    this.engine = new Engine(canvas, true);
    this.scene = new Scene(this.engine);
    this._render();
  }

  _render(): void {
    this.engine.runRenderLoop(() => this.scene.render());
    window.addEventListener("resize", () => this.engine.resize());
  }
}

new App();
```

---

## MCP Servers

Babylon.js ships 7 MCP servers in the `@babylonjs/mcp-servers` npm package, giving
AI agents direct access to the engine's visual editors. The `setup-engine` skill
configures the **two essential** servers by default:

| Server                    | Dispatcher    | Tool count | Purpose                                   |
| ------------------------- | ------------- | ---------- | ----------------------------------------- |
| **Node Material Editor**  | `nme`         | ~20        | Visual shader/material editing            |
| **GUI Editor**            | `gui`         | ~25        | HUD, menus, screens                       |

Configured in `opencode.json` under the `mcp` key, both default to `enabled: false`.
Set to `true` when actively editing materials or GUI.

### All 7 Available MCP Servers

The full set covers every Babylon.js visual editor. Enable them on demand in
`opencode.json` by adding entries following the same `type` / `command` pattern:

| Server                    | Dispatcher      | Direct binary                              | Purpose                                           |
| ------------------------- | --------------- | ------------------------------------------ | ------------------------------------------------- |
| Node Material Editor      | `nme`           | `babylonjs-nme-mcp-server`                 | PBR materials, visual shaders                     |
| Node Geometry Editor      | `nge`           | `babylonjs-nge-mcp-server`                 | Procedural geometry creation/modification         |
| Node Render Graph Editor  | `nrge`          | `babylonjs-nrge-mcp-server`                | Custom render pipeline / render graph             |
| Node Particle Editor      | `npe`           | `babylonjs-npe-mcp-server`                 | Particle system visual editing                    |
| GUI Editor                | `gui`           | `babylonjs-gui-mcp-server`                 | HUD, menu layout, controls                        |
| Flow Graph Editor         | `flow-graph`    | `babylonjs-flow-graph-mcp-server`          | Visual event scripting and logic                  |
| Smart Filters Editor      | `smart-filters` | `babylonjs-smart-filters-mcp-server`       | Image processing / post-processing                |

> **Docs:** https://doc.babylonjs.com/toolsAndResources/mcpServers/

---

## Troubleshooting

| Symptom                                                    | Cause                                              | Fix |
| ---------------------------------------------------------- | -------------------------------------------------- | --- |
| `enablePhysics is not a function` / "No Physics Engine"      | Missing `joinedPhysicsEngineComponent` side-effect   | Add import in `app.ts` |
| `CubeTexture.CreateFromPrefilteredData is not a function`  | Missing `cubeTexture` side-effect                    | Add `import "...Materials/Textures/cubeTexture"` |
| Fallback to WebGL1 instead of WebGL2                      | WebGL2 disabled in browser                          | Check `chrome://flags` or remove `--disable-webgl2` flag |
| `Cannot set properties of undefined (setting '_shouldBlockPointer')` (GUI) | WebGPU DynamicTexture extension not loaded | Add `await import("...WebGPU/Extensions/engine.dynamicTexture")` before `CreateFullscreenUI` |
| Model does not appear (`State machine agent animation`)    | Path mismatch in asset manifest                     | Verify URL relative to `import.meta.env.BASE_URL` |
| Colors washed out / no PBR reflections                     | `createDefaultEnvironment` failed (env texture)    | Add `cubeTexture` + `envTextureLoader` side-effects |

---

## References

- [VERSION.md](./VERSION.md) — pinned version rationale
- [breaking-changes.md](./breaking-changes.md) — 9.x module restructuring
- [current-best-practices.md](./current-best-practices.md) — recommended patterns
- [deprecated-apis.md](./deprecated-apis.md) — what to avoid
