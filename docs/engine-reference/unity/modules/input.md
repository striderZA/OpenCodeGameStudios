# Unity 6.3 — Input Module Reference

**Last verified:** 2026-02-13
**Knowledge Gap:** Unity 6 uses new Input System (legacy Input deprecated)

---

## Overview

Unity 6 input systems:
- **Input System Package** (RECOMMENDED): Cross-platform, rebindable, modern
- **Legacy Input Manager**: Deprecated, avoid for new projects

---

## Key Changes from 2022 LTS

### Legacy Input Deprecated in Unity 6

```csharp
// ❌ DEPRECATED: Input class
if (Input.GetKeyDown(KeyCode.Space)) { }

// ✅ NEW: Input System package
using UnityEngine.InputSystem;
if (Keyboard.current.spaceKey.wasPressedThisFrame) { }
```

**Migration Required:** Install `com.unity.inputsystem` package.

---

## Input System Package Setup

### Installation
1. `Window > Package Manager`
2. Search "Input System"
3. Install package
4. Restart Unity when prompted

### Enable New Input System
`Edit > Project Settings > Player > Active Input Handling`:
- **Input System Package (New)** ✅ Recommended
- **Both** (for migration period)

---

## Input Actions (Recommended Pattern)

### Create Input Actions Asset

1. `Assets > Create > Input Actions`
2. Name it (e.g., "PlayerControls")
3. Open asset, define actions:

```
Action Maps:
  Gameplay
    Actions:
      - Move (Value, Vector2)
      - Jump (Button)
      - Fire (Button)
      - Look (Value, Vector2)
```

4. **Generate C# Class**: Check "Generate C# Class" in Inspector
5. Click "Apply"

### Use Generated Input Class

```csharp
using UnityEngine;
using UnityEngine.InputSystem;

public class PlayerController : MonoBehaviour {
    private PlayerControls controls;

    void Awake() {
        controls = new PlayerControls();

        // Subscribe to actions
        controls.Gameplay.Jump.performed += ctx => Jump();
        controls.Gameplay.Fire.performed += ctx => Fire();
    }

    void OnEnable() => controls.Enable();
    void OnDisable() => controls.Disable();

    void Update() {
        // Read continuous input
        Vector2 move = controls.Gameplay.Move.ReadValue<Vector2>();
        transform.Translate(new Vector3(move.x, 0, move.y) * Time.deltaTime);

        Vector2 look = controls.Gameplay.Look.ReadValue<Vector2>();
        // Apply camera rotation
    }

    void Jump() {
        Debug.Log("Jump!");
    }

    void Fire() {
        Debug.Log("Fire!");
    }
}
```

---

## Direct Device Access (Quick & Dirty)

### Keyboard

```csharp
using UnityEngine.InputSystem;

void Update() {
    // Current state
    if (Keyboard.current.spaceKey.isPressed) { }

    // Just pressed this frame
    if (Keyboard.current.spaceKey.wasPressedThisFrame) { }

    // Just released this frame
    if (Keyboard.current.spaceKey.wasReleasedThisFrame) { }
}
```

### Mouse

```csharp
using UnityEngine.InputSystem;

void Update() {
    // Mouse position
    Vector2 mousePos = Mouse.current.position.ReadValue();

    // Mouse delta (movement)
    Vector2 mouseDelta = Mouse.current.delta.ReadValue();

    // Mouse buttons
    if (Mouse.current.leftButton.wasPressedThisFrame) { }
    if (Mouse.current.rightButton.isPressed) { }

    // Scroll wheel
    Vector2 scroll = Mouse.current.scroll.ReadValue();
}
```

### Gamepad

```csharp
using UnityEngine.InputSystem;

void Update() {
    Gamepad gamepad = Gamepad.current;
    if (gamepad == null) return; // No gamepad connected

    // Buttons
    if (gamepad.buttonSouth.wasPressedThisFrame) { } // A/Cross
    if (gamepad.buttonWest.wasPressedThisFrame) { }  // X/Square

    // Sticks
    Vector2 leftStick = gamepad.leftStick.ReadValue();
    Vector2 rightStick = gamepad.rightStick.ReadValue();

    // Triggers
    float leftTrigger = gamepad.leftTrigger.ReadValue();
    float rightTrigger = gamepad.rightTrigger.ReadValue();

    // D-Pad
    Vector2 dpad = gamepad.dpad.ReadValue();
}
```

### Touch (Mobile)

```csharp
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.EnhancedTouch;

void OnEnable() {
    EnhancedTouchSupport.Enable();
}

void Update() {
    foreach (var touch in UnityEngine.InputSystem.EnhancedTouch.Touch.activeTouches) {
        Debug.Log($"Touch at {touch.screenPosition}");
    }
}
```

---

## Input Action Callbacks

### Action Callbacks (Event-Driven)

```csharp
// started: Input began (e.g., trigger pressed slightly)
controls.Gameplay.Fire.started += ctx => Debug.Log("Fire started");

// performed: Input action triggered (e.g., button fully pressed)
controls.Gameplay.Fire.performed += ctx => Debug.Log("Fire performed");

// canceled: Input released or interrupted
controls.Gameplay.Fire.canceled += ctx => Debug.Log("Fire canceled");
```

### Context Data

```csharp
controls.Gameplay.Move.performed += ctx => {
    Vector2 value = ctx.ReadValue<Vector2>();
    float duration = ctx.duration; // How long input held
    InputControl control = ctx.control; // Which device/control triggered it
};
```

---

## Control Schemes & Device Switching

### Define Control Schemes in Input Actions Asset

```
Control Schemes:
  - Keyboard&Mouse (Keyboard, Mouse)
  - Gamepad (Gamepad)
  - Touch (Touchscreen)
```

### Auto-Switch on Device Change

```csharp
controls.Gameplay.Move.performed += ctx => {
    if (ctx.control.device is Keyboard) {
        Debug.Log("Using keyboard");
    } else if (ctx.control.device is Gamepad) {
        Debug.Log("Using gamepad");
    }
};
```

---

## Rebinding (Runtime Key Mapping)

### Interactive Rebind

```csharp
using UnityEngine.InputSystem;

public void RebindJumpKey() {
    var rebindOperation = controls.Gameplay.Jump.PerformInteractiveRebinding()
        .WithControlsExcluding("Mouse") // Exclude mouse bindings
        .OnComplete(operation => {
            Debug.Log("Rebind complete");
            operation.Dispose();
        })
        .Start();
}
```

### Save/Load Bindings

```csharp
// Save
string rebinds = controls.SaveBindingOverridesAsJson();
PlayerPrefs.SetString("InputBindings", rebinds);

// Load
string rebinds = PlayerPrefs.GetString("InputBindings");
controls.LoadBindingOverridesFromJson(rebinds);
```

---

## Action Types

### Button (Press/Release)
- Single press/release
- Example: Jump, Fire

### Value (Continuous)
- Continuous value (float, Vector2)
- Example: Move, Look, Aim

### Pass-Through (Immediate)
- No processing, immediate value
- Example: Mouse position

---

## Processors (Input Modifiers)

### Scale

```csharp
// In Input Actions asset: Action > Properties > Processors > Add > Scale
// Multiply input by value (e.g., invert Y-axis)
```

### Invert

```csharp
// In Input Actions asset: Action > Properties > Processors > Add > Invert
// Flip input sign
```

### Dead Zone

```csharp
// In Input Actions asset: Action > Properties > Processors > Add > Stick Deadzone
// Ignore small stick movements
```

---

## PlayerInput Component (Simplified Setup)

### Automatic Input Setup

```csharp
// Add Component: Player Input
// Assign Input Actions asset
// Behavior: Send Messages / Invoke Unity Events / Invoke C# Events

// Send Messages example:
public class Player : MonoBehaviour {
    public void OnMove(InputValue value) {
        Vector2 move = value.Get<Vector2>();
        // Handle movement
    }

    public void OnJump(InputValue value) {
        if (value.isPressed) {
            Jump();
        }
    }
}
```

---

## Debugging

### Input Debugger
- `Window > Analysis > Input Debugger`
- See active devices, input values, action states

---

## Sources
- https://docs.unity3d.com/Packages/com.unity.inputsystem@1.11/manual/index.html
- https://docs.unity3d.com/Packages/com.unity.inputsystem@1.11/manual/QuickStartGuide.html
