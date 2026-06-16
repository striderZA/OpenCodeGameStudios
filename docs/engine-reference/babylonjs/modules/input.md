# Babylon.js Input — Quick Reference

Last verified: 2026-06-14 | Engine: Babylon.js 9.10.1

## What Changed Since LLM Cutoff (~May 2025)

### v9.x Changes
- Camera input mapping system with backward-compatible legacy flag (v9.8)
- Flow Graph keyboard event blocks: KeyDown, KeyUp, IsKeyPressed (v9.7)
- DSM now detects modern Xbox controllers on Linux as Generic (v9.11)
- Pointer selection controller switching during session (v9.1)

## Current API Patterns

### Keyboard Input

```typescript
import { KeyboardEventTypes } from "@babylonjs/core/Events/keyboardEvents";

// Option A: Scene Observable (preferred)
scene.onKeyboardObservable.add((kbInfo) => {
  switch (kbInfo.type) {
    case KeyboardEventTypes.KEYDOWN:
      if (kbInfo.event.key === "w") { moveForward(); }
      if (kbInfo.event.code === "Space") { jump(); }
      break;
    case KeyboardEventTypes.KEYUP:
      if (kbInfo.event.key === "w") { stopMoving(); }
      break;
  }
});

// Option B: ActionManager (mesh-specific)
import { ActionManager } from "@babylonjs/core/Actions/actionManager";
import { ExecuteCodeAction } from "@babylonjs/core/Actions/directActions";

scene.actionManager = new ActionManager(scene);
scene.actionManager.registerAction(
  new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, (evt) => {
    if (evt.sourceEvent.key === "r") { resetCar(); }
  })
);
```

### Mouse / Pointer Input

```typescript
import { PointerEventTypes } from "@babylonjs/core/Events/pointerEvents";
import { Ray } from "@babylonjs/core/Culling/ray";

// Scene-level pointer events
scene.onPointerObservable.add((pointerInfo) => {
  switch (pointerInfo.type) {
    case PointerEventTypes.POINTERDOWN:
      // Click detected
      const pickResult = scene.pick(pointerInfo.event.offsetX, pointerInfo.event.offsetY);
      if (pickResult?.pickedMesh) {
        // handle click on mesh
      }
      break;
    case PointerEventTypes.POINTERMOVE:
      // Mouse move (disable if not needed: scene.skipPointerMovePicking = true)
      break;
    case PointerEventTypes.POINTERUP:
      // Release
      break;
    case PointerEventTypes.POINTERWHEEL:
      // Scroll (zoom, etc.)
      break;
  }
});

// Mesh-specific interaction
mesh.actionManager = new ActionManager(scene);
mesh.actionManager.registerAction(
  new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
    console.log("Mesh clicked!");
  })
);
```

### Touch Input

Touch events are handled through the same `scene.onPointerObservable` system.
Babylon.js automatically translates touch events into pointer events.

```typescript
// Multi-touch support (raw access)
import { DeviceSourceManager } from "@babylonjs/core/DeviceInput/deviceSourceManager";
import { DeviceType } from "@babylonjs/core/DeviceInput/deviceTypes";

const deviceSourceManager = new DeviceSourceManager(engine);
const touchSources = deviceSourceManager.getDeviceSources(DeviceType.Touch);

// Or use the pointer observable with touch-specific properties
scene.onPointerObservable.add((pi) => {
  if (pi.event instanceof PointerEvent && pi.event.pointerType === "touch") {
    // Handle touch-specific behavior
  }
});
```

### Gamepad Input

```typescript
import { GamepadManager } from "@babylonjs/core/Gamepads/gamepadManager";

const gamepadManager = new GamepadManager();

gamepadManager.onGamepadConnectedObservable.add((gamepad) => {
  console.log("Gamepad connected:", gamepad.id);

  gamepad.onButtonDownObservable.add((button) => {
    if (button === 0) { accelerate(); }      // A / Cross
    if (button === 2) { brake(); }            // X / Square
  });

  // Per-frame poll (in render loop)
  scene.onBeforeRenderObservable.add(() => {
    const leftStickX = gamepad.leftStick.x;   // -1 to 1
    const leftStickY = gamepad.leftStick.y;
    const rightTrigger = gamepad.rightTrigger; // 0 to 1
    if (Math.abs(leftStickX) > 0.2) { steer(leftStickX); }
  });
});

gamepadManager.onGamepadDisconnectedObservable.add((gamepad) => {
  console.log("Gamepad disconnected:", gamepad.id);
});
```

### Device Source Manager (Unified Input API — v7+)

The `DeviceSourceManager` provides a unified API for all input devices:

```typescript
import { DeviceSourceManager } from "@babylonjs/core/DeviceInput/deviceSourceManager";
import { DeviceType } from "@babylonjs/core/DeviceInput/deviceTypes";
import { PointerInput } from "@babylonjs/core/DeviceInput/pointerInput";

const dsm = new DeviceSourceManager(engine);

// Keyboard
const keyboard = dsm.getDeviceSource(DeviceType.Keyboard);
keyboard?.onInputChangedObservable.add((eventData) => {
  // eventData.inputIndex = key code
  // eventData.type = INPUT / CHANGED
});

// Mouse
const mouse = dsm.getDeviceSource(DeviceType.Mouse);
mouse?.onInputChangedObservable.add((eventData) => {
  if (eventData.inputIndex === PointerInput.Horizontal) { /* mouse X */ }
  if (eventData.inputIndex === PointerInput.Vertical) { /* mouse Y */ }
});
```

### Input Optimization

- Set `scene.skipPointerMovePicking = true` when pointer move hits are not needed
- Use `scene.skipPointerUpPicking = true` when pointer up hits are not needed
- Use `scene.skipPointerDownPicking = true` when pointer down hits are not needed
- Disable `scene.pointerDownPredicate` and `scene.pointerUpPredicate` for performance
- For game cameras, set `camera.panningSensibility = 0` to disable panning
- Use `deviceSourceManager` for minimal-overhead device polling

## Important Notes

- For racing games: use `DeviceSourceManager` + keyboard for binary inputs
  (brake, accelerate) and gamepad for analog inputs (steering, throttle)
- Disable pointer move picking during gameplay when only click/down matters
- Gamepad `onButtonDownObservable` fires once per press — use `onInputChangedObservable`
  for continuous polling via `DeviceSourceManager`
