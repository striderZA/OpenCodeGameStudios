# Bevy Current Best Practices (0.17–0.19)

**Last verified:** 2026-08-09

Practices below are 0.17–0.19 idioms that differ from pre-0.17 training data,
each verified against the official Migration Guides. Rule: anything not
verifiable against a cited source is omitted.

## ECS

- **Practice**: Buffered events are now *messages*. Derive `Message` (not `Event`) for anything you send/read with writers/readers, and use `MessageWriter`/`MessageReader`/`Messages<M>`. Reserve `Event` for observer events.
  ```rust
  #[derive(Message)]
  struct PlayerDied { player: Entity }

  fn send_death(mut messages: MessageWriter<PlayerDied>, ...) { /* ... */ }
  ```
  **Source**: https://bevy.org/learn/migration-guides/0-16-to-0-17/#event-trait-split-rename

- **Practice**: Observers take `On<E>` (renamed from `Trigger<E>`); entity-targeted events derive `EntityEvent` and are fired with `world.trigger(...)` (not `trigger_targets`).
  ```rust
  #[derive(EntityEvent)]
  #[entity_event(propagate)] // defaults to ChildOf propagation
  struct Explode { entity: Entity }

  commands.add_observer(|explode: On<Explode>| {
      info!("{} exploded!", explode.entity);
  });
  ```
  **Source**: https://bevy.org/learn/migration-guides/0-16-to-0-17/#observer-event-api-changes

- **Practice**: In 0.19 resources are components stored on dedicated entities. Do NOT derive both `Component` and `Resource` on one type — split into distinct types. When using broad queries (`Query<EntityMut>`, `Query<Entity>`...), exclude resource entities with `Without<IsResource>` to avoid conflicts with `Res<T>`/`NonSend<T>` params.
  ```rust
  #[derive(Component)]
  struct MyDataComp(f32);

  #[derive(Resource)]
  struct MyDataRes(f32);

  fn system(entity_query: Query<EntityMut, Without<IsResource>>, res: Res<MyDataRes>) { /* ... */ }
  ```
  **Source**: https://bevy.org/learn/migration-guides/0-18-to-0-19/#resources-as-components

- **Practice**: Use `NextState::set_if_neq` instead of `set` when you do not want same-state transitions; `set` always runs `OnEnter`/`OnExit` on same-state transitions (and `DespawnOnEnter`/`DespawnOnExit` since 0.19 — in 0.18 they were skipped due to a bug).
  ```rust
  next_state.set_if_neq(State::Menu);
  ```
  **Source**: https://bevy.org/learn/migration-guides/0-17-to-0-18/#same-state-transitions and https://bevy.org/learn/migration-guides/0-18-to-0-19/#despawnonenter-despawnonexit-can-now-trigger-during-same-state-transitions

- **Practice**: Name system sets with the `*Systems` suffix and schedule with executors passed as instances (0.19 removed `ExecutorKind`).
  ```rust
  #[derive(SystemSet, Debug, Clone, PartialEq, Eq, Hash)]
  enum MySystems { Movement, Physics }

  schedule.set_executor(MultiThreadedExecutor::new());
  ```
  **Source**: https://bevy.org/learn/migration-guides/0-16-to-0-17/#consistent-systems-naming-convention-for-system-sets and https://bevy.org/learn/migration-guides/0-18-to-0-19/#set-executor-replaced-executorkind

- **Practice**: Reflection auto-registration: with `reflect_auto_register` (a Bevy default feature) enabled, non-generic `Reflect` types register automatically — drop explicit `register_type` calls in app code. Generic types still need manual registration.
  **Source**: https://bevy.org/learn/migration-guides/0-16-to-0-17/#changes-to-type-registration-for-reflection

## Rendering

- **Practice**: Custom render passes are now systems (the `RenderGraph` API was removed in 0.19). Use a `ViewQuery` param + `RenderContext` system param, and order with `.before()`/`.after()` on actual pass systems, scoped by `Core3dSystems::Prepass` / `MainPass` / `EarlyPostProcess` / `PostProcess`.
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
          .after(main_opaque_pass_3d)
          .in_set(Core3dSystems::MainPass),
  );
  ```
  **Source**: https://bevy.org/learn/migration-guides/0-18-to-0-19/#render-graph-as-systems

- **Practice**: Import render types from the crates they were split into (0.17+): cameras from `bevy::camera`, shaders from `bevy::shader`, lights/skybox from `bevy::light`, meshes from `bevy::mesh`, images from `bevy::image`, post-process from `bevy::post_process`, AA from `bevy::anti_alias`. Do not use `bevy::render::` paths for these (re-exports were removed).
  ```rust
  use bevy::camera::Camera3d;
  use bevy::mesh::Mesh;
  use bevy::post_process::Bloom;
  ```
  **Source**: https://bevy.org/learn/migration-guides/0-16-to-0-17/#bevy-render-reorganization

- **Practice**: `RenderTarget` is a required component, not a `Camera` field (0.18).
  ```rust
  commands.spawn((
      Camera3d::default(),
      RenderTarget::Image(image_handle.into()),
  ));
  ```
  **Source**: https://bevy.org/learn/migration-guides/0-17-to-0-18/#rendertarget-is-now-a-component

- **Practice**: Many render pipeline resources are initialized in the `RenderStartup` schedule (0.17+), not in `Plugin::finish`. Initialize render resources from a system added to `RenderStartup` instead of `FromWorld`, and order after the pipeline init sets when needed.
  ```rust
  fn init_my_resource(
      mut commands: Commands,
      render_device: Res<RenderDevice>,
      asset_server: Res<AssetServer>,
  ) {
      commands.insert_resource(MyRenderResource { /* ... */ });
  }

  render_app
      .add_systems(RenderStartup, init_my_resource)
      .add_systems(Render, my_render_system);
  ```
  **Source**: https://bevy.org/learn/migration-guides/0-16-to-0-17/#many-render-resources-now-initialized-in-renderstartup

- **Practice**: Material config moved onto the `Material` trait (0.18): implement `enable_prepass()`/`enable_shadows()` instead of configuring `MaterialPlugin` fields.
  ```rust
  impl Material for MyMaterial {
      fn enable_prepass() -> bool { false }
      fn enable_shadows() -> bool { false }
  }
  ```
  **Source**: https://bevy.org/learn/migration-guides/0-17-to-0-18/#enable-prepass-and-enable-shadows-are-now-material-methods

- **Practice**: Bloom luma is computed in linear space since 0.19 — expect a subtly dimmer effect; tune `Bloom::intensity` / `prefilter` rather than assuming the old sRGB look.
  **Source**: https://bevy.org/learn/migration-guides/0-18-to-0-19/#bloom-luma-calculation-now-in-linear-space

## UI

- **Practice**: `Window` is split into multiple components (0.17): configure cursor settings via the `CursorOptions` component / `WindowPlugin::primary_cursor_options`, not `Window.cursor_options`.
  ```rust
  app.add_plugins(DefaultPlugins.set(WindowPlugin {
      primary_cursor_options: Some(CursorOptions {
          grab_mode: CursorGrabMode::Locked,
          ..default()
      }),
      ..default()
  }));
  ```
  **Source**: https://bevy.org/learn/migration-guides/0-16-to-0-17/#window-is-now-split-into-multiple-components

- **Practice**: `UiWidgetsPlugins` and `InputDispatchPlugin` are already part of `DefaultPlugins` since 0.19 — do not add them manually (adding them alongside `DefaultPlugins` would double-register).
  ```rust
  App::new()
      .add_plugins(DefaultPlugins)
      // .add_plugins(UiWidgetsPlugins)  // removed: already included
      .run();
  ```
  **Source**: https://bevy.org/learn/migration-guides/0-18-to-0-19/#uiwidgetsplugins-and-inputdispatchplugin-are-now-in-defaultplugins

- **Practice**: `BorderRadius` is a field on `Node`, not a separate component (0.18).
  ```rust
  commands.spawn(Node {
      border_radius: BorderRadius::all(Val::Px(4.)),
      ..default()
  });
  ```
  **Source**: https://bevy.org/learn/migration-guides/0-17-to-0-18/#borderradius-has-been-added-to-node-and-is-no-longer-a-component

- **Practice**: `TextFont` in 0.19 takes a `FontSource` and a `FontSize`, and `LineHeight` is a separate required component (since 0.18).
  ```rust
  TextFont {
      font: asset_server.load("FiraMono-medium.ttf").into(),
      font_size: FontSize::Px(35.),
      ..default()
  }
  ```
  **Source**: https://bevy.org/learn/migration-guides/0-18-to-0-19/#changes-to-textfont-s-font-size-and-font-fields and https://bevy.org/learn/migration-guides/0-17-to-0-18/#lineheight-is-now-a-separate-component

- **Practice**: UI debug options live in `bevy_ui_render` (0.17): `bevy::ui_render::UiDebugOptions` (still re-exported via `bevy::prelude`).
  **Source**: https://bevy.org/learn/migration-guides/0-16-to-0-17/#move-ui-debug-options-from-bevy-ui-to-bevy-ui-render

## Assets

- **Practice**: `AssetPath::resolve`/`resolve_embed` take `&AssetPath` (0.19); use the `*_str` variants for string paths.
  ```rust
  let resolved = base_asset_path.resolve(&relative_asset_path);
  let resolved_str = base_asset_path.resolve_str("models/foo.gltf#Scene0");
  ```
  **Source**: https://bevy.org/learn/migration-guides/0-18-to-0-19/#assetpath-resolve-and-resolve-embed-now-take-assetpath

- **Practice**: Prefer `AssetServer::load_builder()` for anything beyond a plain typed load (untyped loads, settings, guards) — all the old `load_*` variants have deprecation messages pointing at it (0.19).
  ```rust
  asset_server
      .load_builder()
      .with_settings(settings)
      .override_unapproved()
      .load(path)
  ```
  **Source**: https://bevy.org/learn/migration-guides/0-18-to-0-19/#advanced-assetserver-load-variants-are-now-exposed-through-a-builder-pattern

- **Practice**: `Assets::insert` / `get_or_insert_with` return `Result` since 0.17 — handle (or `unwrap()`) the error instead of panicking.
  ```rust
  assets.insert(handle, my_asset).unwrap();
  ```
  **Source**: https://bevy.org/learn/migration-guides/0-16-to-0-17/#assets-insert-and-assets-get-or-insert-with-now-return-result

- **Practice**: Custom asset loaders/transformers/savers/processors must derive `TypePath` (0.18).
  ```rust
  #[derive(TypePath)]
  struct MyFunkyLoader { add_funk: u32 }
  ```
  **Source**: https://bevy.org/learn/migration-guides/0-17-to-0-18/#traits-assetloader-assettransformer-assetsaver-and-process-all-now-require-typepath

- **Practice**: Custom asset sources are built with a required reader (0.18) and hand out `async_channel::Sender` watchers.
  ```rust
  AssetSourceBuilder::new(move || /* reader logic */)
      .with_writer(move || /* ... */)
      .with_processed_reader(move || /* ... */)
      .with_processed_writer(move || /* ... */);
  ```
  **Source**: https://bevy.org/learn/migration-guides/0-17-to-0-18/#custom-asset-sources-now-require-a-reader and https://bevy.org/learn/migration-guides/0-17-to-0-18/#assetsources-now-give-an-async-channel-sender-instead-of-a-crossbeam-channel-sender

## Input

- **Practice**: Use `Pointer<Press>` / `Pointer<Release>` (0.17 renamed from `Pressed`/`Released`); `Pressed` is now a marker component meaning "held down".
  **Source**: https://bevy.org/learn/migration-guides/0-16-to-0-17/#rename-pointer-pressed-and-pointer-released-to-pointer-press-and-pointer-release

- **Practice**: With `default-features = false` on `bevy`/`bevy_input`, explicitly enable the input sources you use (0.18) — mouse, keyboard, gamepad, touch, gestures.
  ```toml
  bevy = { version = "0.19", default-features = false, features = [
      "mouse", "keyboard", "gamepad", "touch", "gestures",
  ] }
  ```
  **Source**: https://bevy.org/learn/migration-guides/0-17-to-0-18/#put-input-sources-for-bevy-input-under-features

- **Practice**: `RelativeCursorPosition` coordinates are object-centered since 0.17: (0,0) at the node center, corners at (±0.5, ±0.5), with a `cursor_over: bool` field.
  **Source**: https://bevy.org/learn/migration-guides/0-16-to-0-17/#relativecursorposition-is-now-object-centered

## Audio

- **Practice**: Use `increase_by_percentage` instead of `+`/`-` on `Volume::Linear` (Add/Sub impls removed in 0.17).
  ```rust
  let linear = Volume::Linear(0.5);
  let louder = linear.increase_by_percentage(10.0);
  let quieter = linear.increase_by_percentage(-10.0);
  ```
  **Source**: https://bevy.org/learn/migration-guides/0-16-to-0-17/#remove-the-add-sub-impls-on-volume

- **Practice**: With `default-features = false`, enable audio format features explicitly (0.19): `vorbis` (default when using Bevy defaults), `wav`, `mp3`, `flac`, `mp4`, `aac`, or the `audio-all-formats` collection. `audio` is no longer implied by `3d`/`2d`/`ui`.
  ```toml
  bevy = { version = "0.19", default-features = false, features = ["3d", "audio", "vorbis", "wav"] }
  ```
  **Source**: https://bevy.org/learn/migration-guides/0-18-to-0-19/#rodio-0-22-update and https://bevy.org/learn/migration-guides/0-18-to-0-19/#audio-feature-is-now-no-longer-implied-by-the-3d-2d-or-ui-features

- **Practice**: Use the `mp3` feature (symphonia backend), not `minimp3` — the `minimp3` feature is no longer exposed (0.17); it is unmaintained, broken on wasm, and has known security vulnerabilities.
  **Source**: https://bevy.org/learn/migration-guides/0-16-to-0-17/#stop-exposing-mp3-support-through-minimp3

## Testing

- **Practice**: `System::run` and friends return `Result` since 0.17 — `unwrap()` or use `?`; parameter validation happens automatically.
  ```rust
  world.run_system_once(my_system).unwrap();
  ```
  **Source**: https://bevy.org/learn/migration-guides/0-16-to-0-17/#system-run-returns-result

- **Practice**: `SystemState::get`/`get_mut`/`fetch` return `Result<..., SystemParamValidationError>` since 0.19 — add `.unwrap()` where results were destructured directly.
  ```rust
  let (res, query) = system_state.get(&world).unwrap();
  ```
  **Source**: https://bevy.org/learn/migration-guides/0-18-to-0-19/#systemparam-validation-is-now-done-when-fetching-the-data

- **Practice**: Constructing entities manually in tests: `Entity::from_raw_u32` (returns `Option`, 0.17) and `EntityGeneration::FIRST.after_versions(...)` replaced the old `from_raw`/`NonZeroU32` APIs.
  ```rust
  let entity = Entity::from_raw_u32(1).unwrap();
  assert_eq!(entity.generation(), EntityGeneration::FIRST.after_versions(0));
  ```
  **Source**: https://bevy.org/learn/migration-guides/0-16-to-0-17/#manual-entity-creation-and-representation
