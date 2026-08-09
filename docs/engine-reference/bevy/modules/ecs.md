# Bevy ECS — Quick Reference

**Last verified:** 2026-08-09

## Core Concepts
- **World** — container for all entities, components, and resources; `World::default()` / `World::new()`.
- **Entity** — lightweight unique ID correlating to zero or more components; `world.spawn(bundle).id()`.
- **Component** — a plain Rust struct deriving `Component`; stored in tables (default) or sparse sets (`#[component(storage = "SparseSet")]`).
- **Resource** — singleton data identified by type, accessed via `Res<T>` / `ResMut<T>`. Since 0.19 resources are components on dedicated entities: derive `Resource` only (not `Component` + `Resource` together).
- **System** — a plain function whose params (`Query`, `Res`, `Commands`, ...) declare its data access; systems with non-conflicting access run in parallel.
- **Schedule** — runs a set of systems in dependency order; the main schedules run each tick of `App::update()`.
- **Bundle** — a named group of components spawned together: `#[derive(Bundle)]` or a tuple `(A, B)`.
- **Message** — buffered cross-system communication (0.17+; formerly `Event`). See Events.
- **State** — app-wide finite-state machine (`#[derive(States)]`). See States.

## Systems & Schedules
```rust
fn hello_world_system() {
    println!("hello world");
}

fn main() {
    App::new()
        .add_systems(Update, hello_world_system)
        .run();
}
```
Main-schedule labels, in `MainScheduleOrder` order: `First`, `PreStartup`, `Startup`, `PostStartup`, `PreUpdate`, `Update`, `PostUpdate`, `Last`. `Startup` runs once at app start; `Update` runs once per render frame. Fixed-timestep schedules inside `FixedMain`: `FixedPreUpdate`, `FixedUpdate`, `FixedPostUpdate`.

## Queries
```rust
#[derive(Component)]
struct Position { x: f32, y: f32 }
#[derive(Component)]
struct Velocity { x: f32, y: f32 }

fn movement(mut query: Query<(&mut Position, &Velocity)>) {
    for (mut position, velocity) in &mut query {
        position.x += velocity.x;
        position.y += velocity.y;
    }
}
```
- Iterate with `&query` / `&mut query` (or `iter()` / `iter_mut()`); access one entity with `get(entity)` (O(1)) or `single()` (exactly one match, else `QuerySingleError`).
- Filters: `With<T>`, `Without<T>`, `Changed<T>`, `Added<T>`, `Or`, `AnyOf<T>` — e.g. `Query<&Position, (With<Player>, Without<Alive>)>`.
- 0.19 note: the documented `Query` page is `bevy::prelude::Query` (the `bevy::ecs::query::Query` path 404s).

## Bundles / Spawning
```rust
#[derive(Component)]
struct ComponentA(u32);
#[derive(Component)]
struct ComponentB(u32);

fn example_system(mut commands: Commands) {
    // Single component, tuple bundle, or any bundle:
    commands.spawn(ComponentA(1));
    commands.spawn((ComponentA(2), ComponentB(1)));
    commands.spawn(Transform::from_xyz(0.0, 1.0, 0.0));
}
```
`Commands::spawn` returns `EntityCommands` (add/remove components, `with_children`, `observe`); `Commands::entity(e)` re-borrows an existing entity. `Commands` itself exposes `insert_resource` / `remove_resource` — bare `insert`/`remove` live on `EntityCommands`. Component changes via `Commands` are deferred and applied between systems.

## Events
0.17+ split the old `Event` system: buffered events are **messages** (`MessageWriter` / `MessageReader`); `Event` is reserved for observers.
```rust
#[derive(Message)]
struct Message(String);

fn writer(mut writer: MessageWriter<Message>) {
    writer.write(Message("Hello!".to_string()));
}

fn reader(mut reader: MessageReader<Message>) {
    for Message(message) in reader.read() {
        println!("{message}");
    }
}
```
`Commands::write_message(m)` sends a message without a writer param; `App::add_message::<M>()` registers a queue. Observers use `On<E>`: `commands.add_observer(|event: On<MyEvent>| { ... })`, fired via `world.trigger(...)`.

## States
```rust
#[derive(Clone, Copy, PartialEq, Eq, Hash, Debug, Default, States)]
enum GameState {
    #[default]
    MainMenu,
    SettingsMenu,
    InGame,
}

app.init_state::<GameState>();
app.add_systems(Update, handle_escape_pressed.run_if(in_state(GameState::MainMenu)));
app.add_systems(OnEnter(GameState::SettingsMenu), open_settings_menu);
```
Current value in the `State<S>` resource; queued value in `NextState<S>` (`set` / `set_if_neq`). Transition schedules: `OnEnter<S>`, `OnExit<S>`, `OnTransition<S>`; lifetime markers `DespawnOnEnter<S>` / `DespawnOnExit<S>`. Requires `StatesPlugin` (part of `DefaultPlugins`).

## Common Pitfalls
- **0.19: resources are components.** Do not derive both `Component` and `Resource` on one type; broad queries (`Query<EntityMut>`) include resource entities — filter with `Without<IsResource>` or they conflict with `Res<T>` / `NonSend<T>` params.
- **Same-state transitions:** `NextState::set` runs `OnEnter`/`OnExit` even when the state is unchanged — use `set_if_neq` to preserve the old behavior.
- **0.17: `EventWriter`/`EventReader` for buffered events are deprecated** — use `MessageWriter`/`MessageReader` with `#[derive(Message)]`.
- `System::run` and `SystemState::get` return `Result` — unwrap or use `?` instead of destructuring directly.
- Non-send resources: `insert_non_send_resource` is deprecated (0.19) — use `insert_non_send`.

## Sources
- https://docs.rs/bevy/0.19.0/bevy/ecs/index.html
- https://docs.rs/bevy/0.19.0/bevy/app/index.html
- https://docs.rs/bevy/0.19.0/bevy/app/struct.App.html
- https://docs.rs/bevy/0.19.0/bevy/ecs/system/struct.Commands.html
- https://docs.rs/bevy/0.19.0/bevy/ecs/message/index.html
- https://docs.rs/bevy/0.19.0/bevy/state/state/trait.States.html
- https://bevy.org/learn/migration-guides/0-16-to-0-17/#event-trait-split-rename
- https://bevy.org/learn/migration-guides/0-17-to-0-18/#same-state-transitions
- https://bevy.org/learn/migration-guides/0-18-to-0-19/#resources-as-components
