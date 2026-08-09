# Bevy Input — Quick Reference

**Last verified:** 2026-08-09

## Core Concepts
- **ButtonInput<T>** — resource holding press state for button-like input: `pressed()`, `just_pressed()`, `just_released()`, `any_pressed()`, `release()`, `clear()`.
- **Keyboard** — `Res<ButtonInput<KeyCode>>` (physical key) and `Res<ButtonInput<Key>>` (logical, layout-aware key). In 0.19 `KeyCode` IS the physical key — there is no separate `PhysicalKey` type.
- **Mouse** — `Res<ButtonInput<MouseButton>>` plus motion/scroll messages (`MouseMotion`, `AccumulatedMouseMotion`, `AccumulatedMouseScroll`, `MouseWheel`).
- **Gamepad** — gamepads are entities with a `Gamepad` component (`Query<&Gamepad>`), not a resource. Buttons/axes via `gamepad.just_pressed(...)` / `gamepad.get(...)`.
- **Touch** — `Touches` resource + `TouchInput`/`TouchPhase`/`Touch` messages (there is no `TouchEvents`/`TouchPress` in 0.19).
- **Features** — input sources are behind cargo features (`keyboard`, `mouse`, `gamepad`, `touch`, `gestures`) when `default-features = false`.
- **Pointer events** — `Pointer<Press>` / `Pointer<Release>` messages (0.17 rename from `Pressed`/`Released`) for picking-based input.

## Keyboard & Mouse
```rust
fn keyboard_input(keyboard: Res<ButtonInput<KeyCode>>, mouse: Res<ButtonInput<MouseButton>>) {
    if keyboard.pressed(KeyCode::Space) {
        // held this frame
    }
    if keyboard.just_pressed(KeyCode::KeyW) {
        // pressed this frame
    }
    if mouse.just_pressed(MouseButton::Left) {
        // left click
    }
}
```

## Gamepad
```rust
fn gamepad_system(gamepads: Query<&Gamepad>) {
    for gamepad in &gamepads {
        if gamepad.just_pressed(GamepadButton::South) {
            info!("A button pressed");
        }
        if let Some(x) = gamepad.get(GamepadAxis::LeftStickX) {
            // analog value clamped to [-1.0, 1.0]
        }
    }
}
```
`Gamepad` methods: `pressed` / `just_pressed` / `just_released` / `any_pressed` / `all_pressed` (take `GamepadButton`), `get` / `get_unclamped` (analog, `impl Into<GamepadInput>`), `left_stick()` / `right_stick()` / `dpad()` → `Vec2`.

## Touch
```rust
fn touch_system(touches: Res<Touches>) {
    for touch in touches.iter_just_pressed() {
        info!("pressed touch {} at {}", touch.id(), touch.position());
    }
    for touch in touches.iter() {
        // all currently pressed touches
    }
}
```
`Touches` resource methods: `iter()`, `iter_just_pressed()`, `iter_just_released()`, `iter_just_canceled()` (US spelling), `just_pressed(id)`, `just_released(id)`, `just_canceled(id)`, `any_just_pressed()`, `get_pressed(id)`, `get_released(id)`.

## Common Pitfalls
- **0.19: gamepad is a component, not `ButtonInput<GamepadButton>`** — query `Query<&Gamepad>`; analog via `gamepad.get(...)`; there is no `Axis<GamepadAxis>` resource.
- **No `PhysicalKey` in 0.19** — `KeyCode` is the physical key; `Key` is the logical (layout-aware) key.
- **No `TouchEvents`/`TouchPress`/`TouchMove`/`TouchRelease` in 0.19** — use the `Touches` resource + `TouchInput` messages.
- With `default-features = false`, enable input-source features explicitly (`mouse`, `keyboard`, `gamepad`, `touch`, `gestures`).
- `Pointer<Pressed>` / `Pointer<Released>` renamed to `Pointer<Press>` / `Pointer<Release>` (0.17); `Pressed` is now a marker component meaning "held down".

## Sources
- https://docs.rs/bevy/0.19.0/bevy/input/index.html
- https://docs.rs/bevy/0.19.0/bevy/input/struct.ButtonInput.html
- https://docs.rs/bevy/0.19.0/bevy/input/keyboard/index.html
- https://docs.rs/bevy/0.19.0/bevy/input/mouse/index.html
- https://docs.rs/bevy/0.19.0/bevy/input/gamepad/struct.Gamepad.html
- https://docs.rs/bevy/0.19.0/bevy/input/touch/struct.Touches.html
- https://bevy.org/learn/migration-guides/0-17-to-0-18/#put-input-sources-for-bevy-input-under-features
- https://bevy.org/learn/migration-guides/0-16-to-0-17/#rename-pointer-pressed-and-pointer-released-to-pointer-press-and-pointer-release
