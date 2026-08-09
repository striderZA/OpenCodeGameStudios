# Bevy Assets — Quick Reference

**Last verified:** 2026-08-09

## Core Concepts
- **AssetServer** — resource that loads assets by path (`asset_server.load::<T>("path") -> Handle<T>`) and tracks load state.
- **Assets<A>** — typed storage for loaded assets (`Res<Assets<MyAsset>>`); `get(handle)`, `get_mut`, `insert`, `add`.
- **Handle<A>** — strong, ref-counted id of an asset (`Handle::clone` shares the strong handle).
- **AssetPlugin** — configures asset loading: `file_path` root, file watching (hot reload), asset-processor mode.
- **Hot reload** — watch asset files and rebuild on change; gated behind cargo features (`watch` / `file_watcher`), toggled at runtime via `AssetPlugin::watch_for_changes_override`.
- **Load-state tracking** — `AssetServer::load_state` / `get_load_state` / `is_loaded_with_dependencies` consult the `LoadState` enum.
- **AssetEvent<A>** — read via `MessageReader` (0.17+ rename) to react to `Added` / `Modified` / `Removed` / `Unused` / `LoadedWithDependencies`.

## Loading Assets
```rust
fn setup(mut commands: Commands, asset_server: Res<AssetServer>) {
    commands.spawn(Sprite::from_image(asset_server.load("branding/icon.png")));
}
```
- `asset_server.load(path)` — typed load returning a strong `Handle<T>`; the asset loads asynchronously.
- `asset_server.load_builder()` — 0.19's builder for advanced loads (untyped loads, custom settings, guards). The old variants (`load_with_settings`, `load_untyped`, `load_acquire`, ...) are deprecated in favor of it.

## Accessing Loaded Assets
```rust
fn use_assets(
    asset_server: Res<AssetServer>,
    mut meshes: ResMut<Assets<Mesh>>,
) {
    let mesh_handle = asset_server.load::<Mesh>("models/foo.gltf#Mesh0");
    if let Some(mesh) = meshes.get(&mesh_handle) {
        // read-only access
    }
    // 0.19: get_mut returns Option<AssetMut<A>>; Modified fires only on real mutation
    if let Some(mut mesh) = meshes.get_mut(&mesh_handle) {
        // *mesh is &mut Mesh
    }
}
```
`Assets::insert` / `get_or_insert_with` return `Result` since 0.17 — handle or unwrap: `assets.insert(handle, my_asset).unwrap();`.

## Load-State Tracking
```rust
fn check_loaded(asset_server: Res<AssetServer>, handle: Handle<MyAsset>) {
    match asset_server.get_load_state(&handle) {
        Some(LoadState::Loaded) => { /* ready */ }
        Some(LoadState::Failed(err)) => { /* error: {err} */ }
        Some(LoadState::Loading) | None => { /* still loading / not requested */ }
    }
}
```
`LoadState` variants: `NotLoaded`, `Loading`, `Loaded`, `Failed(Arc<AssetLoadError>)`.

## Hot Reload
```toml
# Cargo feature required for dev-time file watching:
bevy = { version = "0.19", features = ["watch"] }
```
```rust
app.add_plugins(DefaultPlugins.set(AssetPlugin {
    watch_for_changes_override: Some(true),
    ..default()
}));
```
On file change the asset reloads and `AssetEvent::Modified` fires; systems reading the asset re-run. Leave `watch_for_changes_override` as `None` and enable the `watch`/`file_watcher` feature for dev scenarios.

## Common Pitfalls
- **0.19: advanced load variants are deprecated** — `load_with_settings(...)` → `asset_server.load_builder().with_settings(...).load(path)`.
- **`Assets::get_mut` returns `Option<AssetMut<A>>`** (0.19), not `&mut A` — deref to mutate; `Modified` fires only on actual mutation.
- **0.17: `Assets::insert`/`get_or_insert_with` return `Result`** — handle the error instead of panicking on `?`-less code.
- Load-state enum is **`LoadState`** (not `AssetLoadState`).
- Asset events are messages: `MessageReader<AssetEvent<A>>` (0.17+), not `EventReader`.
- `AssetPath::resolve` takes `&AssetPath` (0.19); use `resolve_str` for string paths.

## Sources
- https://docs.rs/bevy/0.19.0/bevy/asset/index.html
- https://docs.rs/bevy/0.19.0/bevy/asset/struct.AssetServer.html
- https://docs.rs/bevy/0.19.0/bevy/asset/struct.AssetPlugin.html
- https://docs.rs/bevy/0.19.0/bevy/asset/struct.Assets.html
- https://docs.rs/bevy/0.19.0/bevy/asset/enum.LoadState.html
- https://bevy.org/learn/migration-guides/0-16-to-0-17/#assets-insert-and-assets-get-or-insert-with-now-return-result
- https://bevy.org/learn/migration-guides/0-18-to-0-19/#advanced-assetserver-load-variants-are-now-exposed-through-a-builder-pattern
- https://bevy.org/learn/migration-guides/0-18-to-0-19/#avoiding-unnecessary-assetevent-modified-events-that-lead-to-rendering-performance-costs
