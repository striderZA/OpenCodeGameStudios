# Babylon.js Animation — Quick Reference

Last verified: 2026-06-14 | Engine: Babylon.js 9.10.1

## What Changed Since LLM Cutoff (~May 2025)

### v9.x Changes
- Fix AnimatorAvatar.retargetAnimationGroup clobbering active animations (v9.7)
- Animation system continues to use AnimationGroup, skeletal animation, and
  keyframe animation as the primary APIs

## Current API Patterns

### Keyframe Animation (Property)

```typescript
import { Animation } from "@babylonjs/core/Animations/animation";

// Create a keyframe animation
const anim = new Animation(
  "carMove",           // name
  "position.x",        // target property
  60,                  // frames per second
  Animation.ANIMATIONTYPE_FLOAT,
  Animation.ANIMATIONLOOPMODE_RELATIVE
);

// Define keyframes
const keys = [
  { frame: 0,   value: 0 },
  { frame: 60,  value: 10 },
  { frame: 120, value: 0 },
];
anim.setKeys(keys);

// Apply to mesh
mesh.animations = [];
mesh.animations.push(anim);

// Play
scene.beginAnimation(mesh, 0, 120, true); // true = loop

// Or use AnimationGroup (preferred for multiple animations)
```

### AnimationGroup (Preferred for Complex Animations)

```typescript
import { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";

const animGroup = new AnimationGroup("carAnimations", scene);

// Add animations to the group
const moveAnim = new Animation("move", "position.x", 60, Animation.ANIMATIONTYPE_FLOAT);
moveAnim.setKeys([
  { frame: 0, value: 0 },
  { frame: 60, value: 10 },
]);
animGroup.addTargetedAnimation(moveAnim, mesh);

const scaleAnim = new Animation("scale", "scaling.x", 60, Animation.ANIMATIONTYPE_FLOAT);
scaleAnim.setKeys([
  { frame: 0, value: 1 },
  { frame: 60, value: 1.2 },
]);
animGroup.addTargetedAnimation(scaleAnim, mesh);

// Control
animGroup.play();
animGroup.pause();
animGroup.stop();
animGroup.goToFrame(30);
animGroup.dispose();

// Events
animGroup.onAnimationEndObservable.add((anim) => {
  console.log("Animation ended:", anim.name);
});
```

### Skeletal / glTF Animation

glTF models loaded via `SceneLoader` automatically include their animations:

```typescript
const result = await SceneLoader.ImportMeshAsync("", "models/", "character.glb", scene);

// Available animations from glTF
console.log(result.animationGroups);

// Play a specific animation
const walkAnim = result.animationGroups.find((ag) => ag.name === "walk");
if (walkAnim) {
  walkAnim.play(true); // loop
}

// Blend between animations (crossfade)
result.meshes[0].skeleton?.beginAnimation("walk", true);
```

### Create Animation for Custom Properties

```typescript
// Animate any numeric property
const anim = new Animation("transparency", "visibility", 30, Animation.ANIMATIONTYPE_FLOAT);
anim.setKeys([
  { frame: 0,  value: 1 },
  { frame: 30, value: 0 },
]);
mesh.animations.push(anim);
scene.beginAnimation(mesh, 0, 30, false, 1, () => {
  mesh.dispose(); // callback on complete
});
```

### Animation Types

| Constant | Description |
|---|---|
| `ANIMATIONTYPE_FLOAT` | Single float value |
| `ANIMATIONTYPE_VECTOR3` | Vector3 (position, rotation) |
| `ANIMATIONTYPE_QUATERNION` | Quaternion (rotation) |
| `ANIMATIONTYPE_COLOR3` | Color3 (light/material colors) |
| `ANIMATIONTYPE_MATRIX` | Matrix (advanced) |

### Loop Modes

| Constant | Behavior |
|---|---|
| `ANIMATIONLOOPMODE_RELATIVE` | Resets to initial value each loop |
| `ANIMATIONLOOPMODE_CYCLE` | Back-and-forth (ping-pong) |
| `ANIMATIONLOOPMODE_CONSTANT` | Holds last frame value |

### Easing Functions

```typescript
import { CubicEase, EasingFunction } from "@babylonjs/core/Animations/easing";

anim.setEasingFunction(new CubicEase());
anim.easingFunction.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);

// Available easing functions:
// PowerEase, QuadraticEase, CubicEase, QuarticEase, QuinticEase,
// SineEase, BounceEase, ElasticEase, CircleEase, BackEase, ExponentialEase
```

### Interpolation for Smooth Movement (Runtime)

```typescript
import { Scalar } from "@babylonjs/core/Maths/math";

// In render loop:
scene.onBeforeRenderObservable.add(() => {
  const delta = engine.getDeltaTime() / 1000;

  // Linear interpolation
  currentPosition = Vector3.Lerp(currentPosition, targetPosition, 5 * delta);

  // Smooth step
  const t = Scalar.Clamp(5 * delta, 0, 1);
  currentPosition = new Vector3(
    Scalar.Lerp(currentPosition.x, targetPosition.x, t),
    Scalar.Lerp(currentPosition.y, targetPosition.y, t),
    Scalar.Lerp(currentPosition.z, targetPosition.z, t)
  );
});
```

## Important Notes

- Prefer `AnimationGroup` over `scene.beginAnimation` for managing multiple
  animations on the same object
- glTF animations load automatically — check `result.animationGroups` after import
- Use `engine.getDeltaTime()` for frame-independent animation speed
- For UI animations (fade, slide), use `scene.onBeforeRenderObservable` with
  `Scalar.Lerp` — lighter than Animation objects for simple transitions
- Dispose animation groups with `animGroup.dispose()` when no longer needed
