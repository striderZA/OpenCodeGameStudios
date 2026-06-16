# Babylon.js Physics — Quick Reference

Last verified: 2026-06-14 | Engine: Babylon.js 9.10.1 | Physics: Havok Physics V2

## What Changed Since LLM Cutoff (~May 2025)

### v9.x Changes
- Physics Character Controller: added `maxStepHeight` property (v9.7)
- `PhysicsAggregate` no longer mutates caller's options object (bug fix, v9.12)
- `disablePreStep` behavior important for repositioning physics bodies

### v8.x / General
- Havok Physics V2 is the only supported physics engine — Cannon.js / Oimo are removed
- Physics V1 API (`PhysicsImpostor`, `PhysicsEngine`) deprecated
- `@babylonjs/havok` package provides the WASM runtime

## Current API Patterns

### Havok Plugin Setup

```bash
npm install @babylonjs/havok
```

```typescript
import { HavokPlugin } from "@babylonjs/core/Physics/Plugins/havokPlugin";
import { PhysicsAggregate } from "@babylonjs/core/Physics/v2/physicsAggregate";
import { PhysicsShapeType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import HavokPhysics from "@babylonjs/havok";

async function setupPhysics(scene: Scene): Promise<HavokPlugin> {
  const havokInstance = await HavokPhysics();
  const havokPlugin = new HavokPlugin(true, havokInstance);
  scene.enablePhysics(new Vector3(0, -9.81, 0), havokPlugin);
  return havokPlugin;
}
```

### Physics Aggregates (Quick Setup)

```typescript
// Simple box (static — ground)
const groundAgg = new PhysicsAggregate(
  ground,
  PhysicsShapeType.BOX,
  { mass: 0, restitution: 0.5 },
  scene
);

// Simple sphere (dynamic — ball)
const ballAgg = new PhysicsAggregate(
  sphere,
  PhysicsShapeType.SPHERE,
  { mass: 1, restitution: 0.8 },
  scene
);
```

### Advanced Physics Body Setup

```typescript
import { PhysicsBody } from "@babylonjs/core/Physics/v2/physicsBody";
import { PhysicsShapeBox } from "@babylonjs/core/Physics/v2/physicsShape";

// Create a body from scratch
const shape = new PhysicsShapeBox(
  new Vector3(0, 0, 0),
  Quaternion.Identity(),
  new Vector3(2, 1, 1),
  scene
);
shape.material = { friction: 0.5, restitution: 0.3 };

const body = new PhysicsBody(
  mesh,
  PhysicsBodyType.DYNAMIC,
  false, // false = start awake
  scene
);
body.shape = shape;
body.setMassProperties({ mass: 10 });
body.setLinearDamping(0.1);
body.setAngularDamping(0.5);
body.disablePreStep = false; // Allow direct position changes
```

### Physics Shape Types

| Shape | Use Case |
|---|---|
| `PhysicsShapeType.BOX` | Simple collisions, crates, walls |
| `PhysicsShapeType.SPHERE` | Balls, projectiles |
| `PhysicsShapeType.CAPSULE` | Player characters |
| `PhysicsShapeType.CONVEX_HULL` | Complex 3D models (car bodies) |
| `PhysicsShapeType.MESH` | Static environment (track, buildings — STATIC only) |
| `PhysicsShapeType.CYLINDER` | Pillars, pipes |
| `PhysicsShapeType.PLANE` | Infinite ground planes |

### Body Types

| Type | Description | Performance |
|---|---|---|
| `PhysicsBodyType.STATIC` | Immovable (level geometry) | Zero cost when idle |
| `PhysicsBodyType.DYNAMIC` | Movable (vehicles, props) | Full simulation |

### Vehicle Physics (Car Simulation)

Based on the Babylon.js Playground car simulation (#ANV5OM) and community examples.

**Structure:**
```
chassis (root)
├── suspension_FL (6DoF spring) → wheel hub FL → wheel body FL
├── suspension_FR (6DoF spring) → wheel hub FR → wheel body FR
├── suspension_RL (6DoF spring) → wheel hub RL → wheel body RL
└── suspension_RR (6DoF spring) → wheel hub RR → wheel body RR
```

**Key patterns:**
- Chassis: Box impostor, mass 500–1500
- Wheels: Sphere impostors, mass 20–50 each
- Suspension: `SixDofJoint` with spring stiffness (5000–20000) and damping (500–2000)
- Powered wheels: `HingeJoint` with motor enabled
- Steering: `HingeJoint` with angle limits on front wheels
- Braking: Apply negative angular velocity on motorized joints

```typescript
// Example: Motorized hinge joint for a driven wheel
import { MotorEnabledJoint } from "@babylonjs/core/Physics/v2/Joints/motorEnabledJoint";

// Create a hinge joint with motor
const joint = new MotorEnabledJoint(
  PhysicsJoint.HingeJoint,
  {
    nativeParams: {
      motorEnabled: true,
      motorTargetVelocity: 50,   // rad/s (forward)
      motorMaxForce: 1000,
    },
  },
  {
    // Pivot in local space of body A (chassis)
    position: new Vector3(-1, -0.5, 2),
    rotation: new Quaternion.Identity(),
  },
  {
    // Pivot in local space of body B (wheel)
    position: Vector3.Zero(),
    rotation: Quaternion.Identity(),
  }
);
```

### Raycasting

```typescript
// Screen-space ray (pointer interaction)
const ray = scene.createPickingRay(
  pointerEvent.offsetX,
  pointerEvent.offsetY,
  Matrix.Identity(),
  camera
);
const hit = scene.pickWithRay(ray, (mesh) => mesh.isPickable);

// Ground detection for vehicles (cast from wheel position downward)
const wheelPos = wheel.getAbsolutePosition();
const rayOrigin = wheelPos.add(new Vector3(0, 0.5, 0));
const ray = new Ray(rayOrigin, new Vector3(0, -1, 0), 2.0);
const pick = scene.pickWithRay(ray, (mesh) => mesh.isPickable);
```

### Collision Groups/Masks

```typescript
// Define groups
const GROUP_PLAYER = 1;
const GROUP_ENEMY = 2;
const GROUP_ENVIRONMENT = 4;

body.setCollisionGroup(GROUP_PLAYER);
body.setCollisionMask(GROUP_ENEMY | GROUP_ENVIRONMENT); // Collides with enemy + environment
```

### Performance Considerations

- Limit dynamic body count — prefer STATIC for environment
- Use `physicsBody.setActivationControl()` to control sleep behavior
- Monitor physics time via `SceneInstrumentation.physicsTimeCounter`
- Avoid per-frame shape changes on static bodies
- Compound shapes are faster than single complex mesh shapes

## Key URLs

- Havok Physics V2 docs: https://doc.babylonjs.com/features/featuresDeepDive/physics/v2/usingHavok
- Car simulation playground: https://www.babylonjs-playground.com/#ANV5OM
- @babylonjs/havok: https://github.com/BabylonJS/havok
- Forum car template: https://forum.babylonjs.com/t/physicsv2-car-simulation-template/53801
