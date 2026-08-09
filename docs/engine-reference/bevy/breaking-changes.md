# Bevy Breaking Changes (0.16 → 0.19)

**Last verified:** 2026-08-09

Changes are organized by risk level. Source for each entry: the official
Migration Guides (https://bevyengine.org/learn/migration-guides/).

## High Risk (compile-breaking, widespread)

### 0.19 — Resources are now components
- **Old**:
  ```rust
  #[derive(Component, Resource)]
  struct MyData(f32);
  ```
- **New**:
  ```rust
  #[derive(Component)]
  struct MyDataComp(f32);

  #[derive(Resource)]
  struct MyDataRes(f32);
  ```
- **Migration**: `Resource` is a subtrait of `Component` in 0.19 and `#[derive(Resource)]` implements both, so it is no longer possible to derive both traits on one type. Types can no longer meaningfully be used as both resources and components; split them into distinct types. Broad queries (`Query<EntityMut>`, `Query<()>`, etc.) now include resource entities and can conflict with `Res<T>`/`NonSend<T>` params — filter them out with `Without<IsResource>` / `Without<MyNonSend>`. `ResMut` and the `*_mut` resource accessors now require `Resource<Mutability = Mutable>` in generic code.
- **Source**: https://bevy.org/learn/migration-guides/0-18-to-0-19/#resources-as-components

### 0.19 — Render graph replaced by systems
- **Old**:
  ```rust
  impl ViewNode for MyNode { /* ... */ }
  render_app
      .add_render_graph_node::<ViewNodeRunner<MyNode>>(Core3d, MyLabel)
      .add_render_graph_edges(Core3d, (Node3d::Foo, MyLabel, Node3d::Bar));
  ```
- **New**:
  ```rust
  pub fn my_render_pass(
      world: &World,
      view: ViewQuery<(&ExtractedCamera, &ViewTarget)>,
      mut ctx: RenderContext,
  ) {
      let (camera, target) = view.into_inner();
      // ...
  }

  render_app.add_systems(
      Core3d,
      my_render_pass
          .after(foo_pass)
          .before(bar_pass)
          .in_set(Core3dSystems::MainPass),
  );
  ```
- **Migration**: The `RenderGraph` API has been removed. Render passes are now systems that run in the `Core3d`/`Core2d` schedules; `ViewNode` is replaced by a regular system using the `ViewQuery` parameter and `RenderContext` is now a system parameter. Order passes with `.before()`/`.after()` on the actual system functions. Coarse ordering sets: `Core3dSystems::Prepass`, `MainPass`, `PostProcess` (and `EarlyPostProcess` in 2D/3D).
- **Source**: https://bevy.org/learn/migration-guides/0-18-to-0-19/#render-graph-as-systems

### 0.19 — `bevy_scene` renamed to `bevy_world_serialization`
- **Old**:
  ```rust
  commands.spawn(SceneRoot(asset_server.load("scene.gltf#Scene0")));
  ```
- **New**:
  ```rust
  commands.spawn(WorldAssetRoot(asset_server.load("scene.gltf#Scene0")));
  ```
- **Migration**: The old scene system is renamed: `bevy_scene::*` → `bevy_world_serialization::*` (and `bevy::scene::*` → `bevy::world_serialization::*`). Key renames: `Scene` → `WorldAsset`, `SceneRoot` → `WorldAssetRoot`, `DynamicScene` → `DynamicWorld`, `SceneSpawner` → `WorldInstanceSpawner`, `SceneLoader` → `WorldAssetLoader`, `ScenePlugin` → `WorldSerializationPlugin`. The new next-gen scene system (BSN) lives in `bevy_scene`; GLTF scene spawning is the most likely source of breakage.
- **Source**: https://bevy.org/learn/migration-guides/0-18-to-0-19/#the-old-bevy-scene-is-now-bevy-world-serialization

### 0.19 — Text moved from `cosmic-text` to `parley`; `TextFont` fields changed
- **Old**:
  ```rust
  TextFont {
      font: asset_server.load("FiraMono-medium.ttf"),
      font_size: 35.,
      ..default()
  }
  ```
- **New**:
  ```rust
  TextFont {
      font: asset_server.load("FiraMono-medium.ttf").into(),
      font_size: FontSize::Px(35.),
      ..default()
  }
  ```
- **Migration**: `bevy_text` now uses `parley` for layout. `TextFont::font` changed from `Handle<Font>` to `FontSource` (variants `Handle` and `Family`; `From<Handle<Font>>` is implemented so `.into()` suffices) and `font_size` from `f32` to `FontSize::Px(...)`. `TextRoot`/`TextSpanAccess`/`TextSpanComponent` are consolidated into `TextSection`. `Font::try_from_bytes` is now `Font::from_bytes` (no longer returns `Result`). System font discovery requires the `bevy/system_font_discovery` feature.
- **Source**: https://bevy.org/learn/migration-guides/0-18-to-0-19/#bevy-text-migration-from-cosmic-text-to-parley

### 0.19 — Cargo feature collection changes: `audio` and `ui` no longer implied
- **Old** (0.18):
  ```toml
  bevy = { version = "0.18", default-features = false, features = ["3d"] }
  ```
- **New** (0.19):
  ```toml
  bevy = { version = "0.19", default-features = false, features = ["3d", "audio"] }
  ```
- **Migration**: In 0.19 `audio` is no longer implied by the `3d`/`2d`/`ui` features (it is in `default` features instead), and `ui` is no longer implied by `3d`/`2d`. If you disable default features, opt into `audio` and/or `ui` explicitly when you need them. If you used all default features, nothing changes.
- **Source**: https://bevy.org/learn/migration-guides/0-18-to-0-19/#audio-feature-is-now-no-longer-implied-by-the-3d-2d-or-ui-features and https://bevy.org/learn/migration-guides/0-18-to-0-19/#ui-feature-is-now-no-longer-implied-by-the-3d-or-2d-features

### 0.18 — `RenderTarget` is now a component
- **Old**:
  ```rust
  commands.spawn((
      Camera3d::default(),
      Camera {
          target: RenderTarget::Image(image_handle.into()),
          ..default()
      },
  ));
  ```
- **New**:
  ```rust
  commands.spawn((
      Camera3d::default(),
      RenderTarget::Image(image_handle.into()),
  ));
  ```
- **Migration**: `RenderTarget` has been moved from a field on `Camera` to a separate required component. Spawn it as a component instead of setting `camera.target`.
- **Source**: https://bevy.org/learn/migration-guides/0-17-to-0-18/#rendertarget-is-now-a-component

### 0.18 — Entities rework (flush removed, new allocator/index types)
- **Old**: `Entities::flush`, `reserve_entity`, `total_count`, `EntityDoesNotExistError`, `Entity::row` / `Entity::from_raw`...
- **New**: `EntitiesAllocator` (via `World::entities_allocator`), `Entities::len`/`count_spawned`, `EntityNotSpawnedError`, `Entity::index` / `Entity::from_index`.
- **Migration**: Reservation and flushing were removed: use `EntitiesAllocator::alloc` + `World::spawn_at` instead of reserve+flush. Error types were reworked (`EntityDoesNotExistError` → `InvalidEntityError`/`EntityNotSpawnedError`), `EntityRow` terminology became `EntityIndex`, and several `Entities` methods (`alloc`, `free`, `get`, `contains`) changed shape. This is a large migration — see the full guide section and the new `entity` module docs.
- **Source**: https://bevy.org/learn/migration-guides/0-17-to-0-18/#entities-apis

### 0.18 — Cargo feature cleanup and feature collections
- **Old**: `bevy = { version = "0.17", features = ["animation", "bevy_mesh_picking_backend"] }`
- **New**: features renamed (`animation` → `gltf_animation`, `bevy_mesh_picking_backend` → `mesh_picking`, `bevy_ui_picking_backend` → `ui_picking`, `bevy_sprite_picking_backend` → `sprite_picking`) and high-level feature collections (`2d`, `3d`, `ui`, plus `*_api` / `default_app` / `default_platform`) introduced.
- **Migration**: Rename the four features above, and prefer high-level feature collections over hand-picking individual cargo features. `bevy_input` input sources (mouse/keyboard/gamepad/touch/gestures) are now gated behind features — enable the ones you use when `default-features = false`.
- **Source**: https://bevy.org/learn/migration-guides/0-17-to-0-18/#feature-cleanup and https://bevy.org/learn/migration-guides/0-17-to-0-18/#cargo-feature-collections

### 0.17 — `Event` trait split into `Message` and `Event`
- **Old**:
  ```rust
  #[derive(Event)]
  struct MyEvent;

  fn system(mut events: EventReader<MyEvent>) { /* ... */ }
  ```
- **New**:
  ```rust
  #[derive(Message)]
  struct MyMessage;

  fn system(mut messages: MessageReader<MyMessage>) { /* ... */ }
  ```
- **Migration**: "Buffered events" are now "messages": derive `Message` instead of `Event` for anything sent/read with writers/readers, and use `MessageWriter`/`MessageReader`/`Messages<M>` (renamed from `EventWriter`/`EventReader`/`Events<E>`). The `Event` trait is now exclusively for observer events. A type can derive both `Message` and `Event` if used in both contexts, but most types use one.
- **Source**: https://bevy.org/learn/migration-guides/0-16-to-0-17/#event-trait-split-rename

### 0.17 — `bevy_render` reorganization into new crates
- **Old**: `use bevy::render::mesh::Mesh;` / `use bevy::core_pipeline::core_3d::Camera3d;` (0.16 paths)
- **New**: `use bevy::mesh::Mesh;` / `use bevy::camera::Camera3d;`
- **Migration**: Many rendering types moved to new crates: camera types → `bevy_camera` (`bevy::camera`), shader types → `bevy_shader` (`bevy::shader`), light types → `bevy_light` (`bevy::light`), mesh types → `bevy_mesh` (`bevy::mesh`), image types → `bevy_image` (`bevy::image`); post-process effects → `bevy_post_process` (`bevy::post_process`), AA → `bevy_anti_alias` (`bevy::anti_alias`); sprite/UI render types → `bevy_sprite_render` / `bevy_ui_render`. In 0.18 the remaining `bevy_render` re-exports for mesh/image were removed — import from the new crates.
- **Source**: https://bevy.org/learn/migration-guides/0-16-to-0-17/#bevy-render-reorganization and https://bevy.org/learn/migration-guides/0-17-to-0-18/#bevy-render-reorganization

### 0.17 — System sets standardized on `*Systems` naming
- **Old**: `RenderSet`, `TransformSystem`, `UiSystem`, `InputSystem`, `PickSet`
- **New**: `RenderSystems`, `TransformSystems`, `UiSystems`, `InputSystems`, `PickingSystems`
- **Migration**: System sets now consistently use a `Systems` suffix (e.g. `AccessibilitySystem` → `AccessibilitySystems`, `Animation` → `AnimationSystems`, `TimeSystem` → `TimeSystems`). Rename all references; ecosystem crates are encouraged to adopt the convention.
- **Source**: https://bevy.org/learn/migration-guides/0-16-to-0-17/#consistent-systems-naming-convention-for-system-sets

### 0.17 — Reflection auto-registration
- **Old**: `app.register_type::<MyType>();` required for every reflected type.
- **New**: types implementing `Reflect` are automatically registered when the `reflect_auto_register` feature (a Bevy default) is enabled; `register_type` calls can be removed for non-generic types.
- **Migration**: Enable `reflect_auto_register` in application code (it is part of Bevy's default features; libraries should not enable it). Generic types must still be registered manually.
- **Source**: https://bevy.org/learn/migration-guides/0-16-to-0-17/#changes-to-type-registration-for-reflection

## Medium Risk (compile-breaking, narrow)

### 0.19 — `System::type_id` renamed to `System::system_type`
- **Old**: `let id = my_system.type_id();`
- **New**: `let id = my_system.system_type();`
- **Migration**: Renamed to avoid shadowing `Any::type_id`. The old method is deprecated and will be removed in a future release; custom `System` impls should override `system_type`.
- **Source**: https://bevy.org/learn/migration-guides/0-18-to-0-19/#rename-system-type-id-to-system-system-type

### 0.19 — `ExecutorKind` removed; `Schedule::set_executor`
- **Old**:
  ```rust
  schedule.set_executor_kind(ExecutorKind::SingleThreaded);
  ```
- **New**:
  ```rust
  schedule.set_executor(SingleThreadedExecutor::new());
  ```
- **Migration**: `ExecutorKind` is gone; pass an executor instance (`SingleThreadedExecutor::new()`, `MultiThreadedExecutor::new()`, or `default_executor()`). `SystemExecutor` is now a public trait that can be implemented for fully custom executors.
- **Source**: https://bevy.org/learn/migration-guides/0-18-to-0-19/#set-executor-replaced-executorkind

### 0.19 — Non-send resources renamed to non-send data
- **Old**: `world.insert_non_send_resource(my_data);`
- **New**: `world.insert_non_send(my_data);`
- **Migration**: `App::init_non_send_resource`/`insert_non_send_resource`, `World::*_non_send_resource*`, `UnsafeWorldCell::get_non_send_resource*`, and `DeferredWorld::non_send_resource_mut` are deprecated in favor of the `*_non_send*` names. `Resources<false>`/`ResourceData<false>` were removed; `NonSends`/`NonSendData` replace them.
- **Source**: https://bevy.org/learn/migration-guides/0-18-to-0-19/#renaming-non-send-resources-to-non-send-data

### 0.19 — `Skybox` image is now optional
- **Old**:
  ```rust
  Skybox { image: my_skybox, brightness: 1000.0, ..default() }
  ```
- **New**:
  ```rust
  Skybox { image: Some(my_skybox), brightness: 1000.0, ..default() }
  ```
- **Migration**: `Skybox.image` is now `Option<Handle<Image>>`; a skybox without an image draws nothing. Wrap the handle in `Some(...)` (or drop the placeholder image entirely).
- **Source**: https://bevy.org/learn/migration-guides/0-18-to-0-19/#skybox-image-is-now-optional

### 0.19 — `Image::pixel_bytes` family returns `Result`
- **Old**:
  ```rust
  if let Some(bytes) = image.pixel_bytes(coords) { /* use bytes */ }
  ```
- **New**:
  ```rust
  match image.pixel_bytes(coords) {
      Ok(bytes) => { /* use bytes */ }
      Err(TextureAccessError::OutOfBounds { .. }) => { /* ... */ }
      Err(TextureAccessError::UnsupportedTextureFormat(format)) => { /* ... */ }
      Err(TextureAccessError::Uninitialized) => { /* ... */ }
  }
  ```
- **Migration**: `Image::pixel_bytes`, `pixel_bytes_mut`, and `pixel_data_offset` now return `Result<..., TextureAccessError>` instead of `Option`; distinguish out-of-bounds, unsupported (compressed) formats, and uninitialized data.
- **Source**: https://bevy.org/learn/migration-guides/0-18-to-0-19/#image-pixel-bytes-and-image-pixel-data-offset-now-return-result

### 0.18 — `Internal` component removed
- **Old**: observers and one-shot systems were tagged `Internal` and hidden by default query filters.
- **New**: no `Internal` component; observer/one-shot entities are no longer hidden by default query filters.
- **Migration**: Remove all references to `Internal`. Tests relying on exact entity counts should query for a component they care about instead.
- **Source**: https://bevy.org/learn/migration-guides/0-17-to-0-18/#internal-has-been-removed

### 0.18 — Same-state transitions now trigger `OnEnter`/`OnExit`
- **Old**: `next_state.set(State::Menu);` (no transition when already `Menu`)
- **New**: `next_state.set_if_neq(State::Menu);` to preserve the old behavior
- **Migration**: `NextState::set` now always runs state transition schedules (including `DespawnOnEnter`/`DespawnOnExit`) even when the target state equals the current one. Use `set_if_neq` if you do not want same-state transitions.
- **Source**: https://bevy.org/learn/migration-guides/0-17-to-0-18/#same-state-transitions

### 0.18 — `AmbientLight` split into component + resource
- **Old**:
  ```rust
  app.insert_resource(AmbientLight { color: Color::WHITE, brightness: 2000., ..default() });
  ```
- **New**:
  ```rust
  app.insert_resource(GlobalAmbientLight { color: Color::WHITE, brightness: 2000., ..default() });
  ```
- **Migration**: The resource form is now `GlobalAmbientLight` (added by `LightPlugin`); `AmbientLight` is a component that can be added to a `Camera` to override it.
- **Source**: https://bevy.org/learn/migration-guides/0-17-to-0-18/#ambientlight-split-into-a-component-and-a-resource

### 0.17 — `Handle::Weak` replaced by `Handle::Uuid`
- **Old**:
  ```rust
  const IMAGE: Handle<Image> = weak_handle!("b20988e9-b1b9-4176-b5f3-a6fa73aa617f");
  commands.spawn(Sprite::from_image(my_sprite_image.clone_weak()));
  ```
- **New**:
  ```rust
  const IMAGE: Handle<Image> = uuid_handle!("b20988e9-b1b9-4176-b5f3-a6fa73aa617f");
  commands.spawn(Sprite::from_image(my_sprite_image.clone()));
  ```
- **Migration**: `Handle::Weak` is now `Handle::Uuid`; `weak_handle!` → `uuid_handle!` and `Handle::clone_weak` → `Handle::clone`. Users of the `Handle::Weak` variant directly should consider `AssetId` (via `Handle::id`). For shaders, prefer `load_shader_library`/`load_embedded_asset` (enables hot reloading).
- **Source**: https://bevy.org/learn/migration-guides/0-16-to-0-17/#handle-weak-has-been-replaced-by-handle-uuid

### 0.17 — `Timer::paused`/`Timer::finished` renamed
- **Old**: `timer.paused()`, `timer.finished()`
- **New**: `timer.is_paused()`, `timer.is_finished()`
- **Migration**: Renamed to align with `Time` and `Stopwatch`.
- **Source**: https://bevy.org/learn/migration-guides/0-16-to-0-17/#renamed-timer-paused-to-timer-is-paused-and-timer-finished-to-timer-is-finished

### 0.17 — `Anchor` variants are now associated constants
- **Old**: `Anchor::Center`, `Anchor::BottomLeft`, `Anchor::Custom(value)`
- **New**: `Anchor::CENTER`, `Anchor::BOTTOM_LEFT`, `Anchor(value)`
- **Migration**: The `anchor` field was removed from `Sprite`; `Anchor` is now a required component. Variants became SCREAMING_SNAKE associated constants; `Anchor::Custom(v)` is now the tuple constructor `Anchor(v)`.
- **Source**: https://bevy.org/learn/migration-guides/0-16-to-0-17/#anchor-is-now-a-required-component-on-sprite

## Low Risk (deprecations, behavioral)

### 0.19 — Bloom luma calculation now in linear space
- **Old**: bloom Karis-average downsampling computed luma in non-linear sRGB space (subtly brighter, especially for saturated colors).
- **New**: luma is computed in linear space; bloom may appear dimmer.
- **Migration**: If bloom is now too dim, increase `Bloom::intensity`, increase material `emissive`, or adjust the `prefilter` settings. Visual change only — no code API break.
- **Source**: https://bevy.org/learn/migration-guides/0-18-to-0-19/#bloom-luma-calculation-now-in-linear-space

### 0.19 — `Assets::get_mut` returns `AssetMut` (change lists)
- **Old**: `assets.get_mut(handle)` returned `&mut A` and always triggered an `AssetEvent::Modified`.
- **New**: `Assets::get_mut` returns `AssetMut<A: Asset>`; a `Modified` event fires only when the asset is actually mutated (like `Mut`/`ResMut`).
- **Migration**: Mark the returned value `mut` and guard writes (e.g. compare against the new value first) to avoid unnecessary re-extraction cost.
- **Source**: https://bevy.org/learn/migration-guides/0-18-to-0-19/#avoiding-unnecessary-assetevent-modified-events-that-lead-to-rendering-performance-costs

### 0.19 — `Command` error handling simplified (`Out` associated type)
- **Old**:
  ```rust
  fn my_command() -> impl Command<Result> { move |world: &mut World| -> Result { /* ... */ } }
  ```
- **New**:
  ```rust
  fn my_command() -> impl Command { move |world: &mut World| -> Result { /* ... */ } }
  ```
- **Migration**: `Command` now takes `Out` as an associated type instead of a generic parameter; implementors must fill in `type Out = ();` (or `Result`). `HandleError` and `CommandWithEntity` functionality folded into `Command`/`EntityCommand`.
- **Source**: https://bevy.org/learn/migration-guides/0-18-to-0-19/#command-error-handling-has-been-simplified

### 0.18 — `DragEnter` now fires on drag starts
- **Old**: `DragEnter` fired only when entering an entity other than the dragged one.
- **New**: `DragEnter` also fires when a drag starts over an already-hovered entity.
- **Migration**: Behavioral change; filter by checking whether the trigger entity is the dragged entity if the old behavior is needed.
- **Source**: https://bevy.org/learn/migration-guides/0-17-to-0-18/#dragenter-now-fires-on-drag-starts

### 0.17 — `scale_value` removed from `bevy_text` text2d
- **Old**: `scale_value(value, scale_factor)` from `bevy::text::text2d`
- **New**: multiply by the scale factor directly.
- **Migration**: Remove the call and multiply by the scale factor instead.
- **Source**: https://bevy.org/learn/migration-guides/0-16-to-0-17/#remove-scale-value

### 0.17 — `RelativeCursorPosition` is now object-centered
- **Old**: coordinates relative to the node origin; `normalized_visible_node_rect` field existed.
- **New**: (0, 0) at the center of the node, corners at (±0.5, ±0.5); `normalized_visible_node_rect` replaced by a `cursor_over: bool` field.
- **Migration**: Update picking logic that consumed `RelativeCursorPosition` coordinates.
- **Source**: https://bevy.org/learn/migration-guides/0-16-to-0-17/#relativecursorposition-is-now-object-centered

---

### Band coverage notes

- **High Risk 0.16→0.17**: covered above (Event/Message split, `bevy_render` reorganization, `*Systems` naming, reflection auto-registration, `Handle::Weak`→`Handle::Uuid`). Additional widespread 0.17 changes: `System::run` now returns `Result` (https://bevy.org/learn/migration-guides/0-16-to-0-17/#system-run-returns-result) and the `wgpu` 25 bind-group renumbering for custom shaders (https://bevy.org/learn/migration-guides/0-16-to-0-17/#wgpu-25).
- **High Risk 0.17→0.18**: covered above; see also the `Entities`/`EntityRow` rework entry under 0.18 for the largest compile-breaking surface.
- **No notable changes in the Low Risk band for 0.16→0.17 beyond the entries above.** All three guides contain additional narrow/niche renames not reproduced here; consult the guide for the exact subsystem before migrating code that touches ECS internals, render phases, or reflection.
