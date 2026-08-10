# Bevy Testing — Quick Reference

**Last verified:** 2026-08-09

## Core Concepts
- **Headless test apps** — `App::new()` works without a window; run one or more ticks with `app.update()` and assert on the `World` via `app.world()` / `app.world_mut()`.
- **MinimalPlugins** — for logic-only tests use `App::new().add_plugins(MinimalPlugins)` instead of `DefaultPlugins` (no renderer/window/audio).
- **System-isolation** — drive a single system with `World::run_system_once` (returns `Result<Out, RunSystemError>`), or hold params with `SystemState`.
- **`cargo test`** — standard Rust test harness; Bevy adds no special runner.

## Headless App Test
```rust
#[test]
fn movement_system_moves_entities() {
    let mut app = App::new();
    app.add_systems(Update, movement);

    let entity = app
        .world_mut()
        .spawn((
            Position { x: 0.0, y: 0.0 },
            Velocity { x: 1.0, y: 0.0 },
        ))
        .id();

    app.update(); // run one tick

    let position = app.world().entity(entity).get::<Position>().unwrap();
    assert!(position.x > 0.0);
}
```
`App::update()` runs the default schedules of all sub-apps once. Never call `App::run()` in a test — it blocks (returns `AppExit` only when the app exits).

## Single-System Tests
```rust
#[test]
fn run_one_system() {
    let mut world = World::new();
    world.spawn(Player);

    // run_system_once applies deferred params (Commands) and returns Result:
    let out = world.run_system_once(my_system).unwrap();
}
```
`World::run_system_once` comes from the `RunSystemOnce` trait and returns `Result<Out, RunSystemError>` since 0.17. For systems with input, use `run_system_once_with(input)`.

## SystemState (repeatable params)
```rust
let mut system_state: SystemState<(
    MessageWriter<MyMessage>,
    Option<ResMut<MyResource>>,
    Query<&MyComponent>,
)> = SystemState::new(&mut world);

let (message_writer, maybe_resource, query) = system_state.get_mut(&mut world).unwrap();
// ... use params ...
system_state.apply(&mut world); // apply deferred commands
```
`SystemState::get` / `get_mut` return `Result<_, SystemParamValidationError>` in 0.19 — unwrap them. Cache and reuse the `SystemState` (required for `Added`/`Changed` filters, `Local` params, and `MessageReader`).

## Assertions & Conventions
- Query the world after updates: `world.entity(e).get::<T>()`, or iterate with `world.query::<&T>().iter(&world)` (`World::iter_entities` is deprecated since 0.17).
- Assert emitted messages by reading `MessageReader<M>` in a test system (messages are buffered for two update calls).
- Keep tests deterministic: drive `FixedUpdate`/`Time` resources explicitly, no wall-clock sleeps, seed randomness.

## Common Pitfalls
- **`App::run()` blocks** (and returns `AppExit`) — use `app.update()` in tests.
- `SystemState::get` / `get_mut` / `run_system_once` return `Result` — unwrap or `?` (0.17/0.19 validation changes).
- Tests that spawn render/UI/audio entities need `DefaultPlugins` (or the matching feature); pure-logic tests use `MinimalPlugins`.
- `World::run_system_once` applies deferred commands — no manual flush step needed (0.18 removed `Entities::flush`).

## Sources
- https://docs.rs/bevy/0.19.0/bevy/app/struct.App.html
- https://docs.rs/bevy/0.19.0/bevy/ecs/world/struct.World.html
- https://docs.rs/bevy/0.19.0/bevy/ecs/system/struct.SystemState.html
- https://bevy.org/learn/migration-guides/0-16-to-0-17/#system-run-returns-result
- https://bevy.org/learn/migration-guides/0-16-to-0-17/#deprecate-iter-entities-and-iter-entities-mut
- https://bevy.org/learn/migration-guides/0-18-to-0-19/#systemparam-validation-is-now-done-when-fetching-the-data
