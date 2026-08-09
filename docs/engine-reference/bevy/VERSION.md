# Bevy Engine — Version Reference

| Field | Value |
|-------|-------|
| **Engine Version** | Bevy 0.19.0 (latest 0.19.x as of 2026-08-09; no 0.19.1 patch released yet) |
| **Release Date** | 2026-06-18 |
| **Project Pinned** | 2026-08-09 |
| **Last Docs Verified** | 2026-08-09 |
| **LLM Knowledge Cutoff** | May 2025 |

## Knowledge Gap Warning

Bevy 0.19 is BEYOND the LLM's training data cutoff (May 2025; training data
covers roughly 0.16–0.17). Risk level is HIGH. Agents MUST verify every API
against this reference set or the official docs before use.

## Risk Level: HIGH

Bevy ships a new minor version roughly every 3 months with breaking changes.
The Migration Guides are the authoritative source for version transitions.

## Version History

| Version | Release | Risk Level | Key Theme |
|---------|---------|------------|-----------|
| 0.16 | 2025-04-24 | HIGH | **0.16 → 0.17:** `Event` trait split into `Message` (buffered) and `Event` (observers); `bevy_render` reorganized into `bevy_camera` / `bevy_shader` / `bevy_light` / `bevy_mesh` / `bevy_image`; system sets standardized on `*Systems` naming |
| 0.17 | 2025-09-30 | HIGH | **0.17 → 0.18:** Entities rework (`EntityRow` index, flush removed, `EntitiesAllocator`); `RenderTarget` moved from a `Camera` field to a component; Cargo feature collections; `Internal` component removed |
| 0.18 | 2026-01-13 | HIGH | **0.18 → 0.19:** Resources are now stored as components on dedicated entities; `RenderGraph` replaced by systems; text moved from `cosmic-text` to `parley`; `bevy_scene` renamed to `bevy_world_serialization` (BSN arrives); `audio`/`ui` Cargo features no longer implied by `3d`/`2d`; bloom luma now computed in linear space |
| 0.19 | 2026-06-18 | HIGH | — (latest release; no 0.19 → 0.20 migration guide exists yet) |

## Bevy Characteristics

- **Rust game engine**, ECS-first (data-oriented design)
- **Code-only** — no visual editor; all content is code, assets, and .ron data
- **Renderer**: wgpu (WebGPU/WebGL abstraction), 2D and 3D
- **UI**: bevy_ui (retained node tree, flexbox)
- **Assets**: AssetServer / bevy_asset with hot reload
- **Licensing**: MIT OR Apache-2.0 — free forever, no restrictions
- **Platform support**: Windows, macOS, Linux, Web (WASM), Android/iOS (via mobile examples)

## Key Crates

| Crate | Purpose |
|-------|---------|
| bevy | Main engine crate (re-exports everything through `bevy::prelude`) |
| bevy_ecs | Entity-Component-System core: World, queries, systems, schedules, observers |
| bevy_render | Core rendering infrastructure, render world and render resources |
| bevy_ui | Retained UI node tree (flexbox layout) |
| bevy_asset | Asset loading, `AssetServer`, hot reload |
| bevy_audio | Audio playback (rodio backend; format support behind `vorbis`/`wav`/`mp3`/`flac` features) |
| bevy_camera | Camera types (`Camera`, `Camera3d`, `Camera2d`, projections) — split out of `bevy_render` in 0.17 |
| bevy_shader | Shader types (`Shader`, `ShaderRef`, `ShaderCache`) — split out in 0.17 |
| bevy_light | Light types (`PointLight`, `SpotLight`, `DirectionalLight`, `AmbientLight`, `AtmosphereEnvironmentMapLight`) — split out in 0.17; `Skybox` moved here from `bevy_core_pipelines` in 0.19; `Atmosphere` added in 0.19 |
| bevy_mesh | Mesh types (`Mesh`, `Mesh3d`, `Mesh2d`, `Indices`, `Meshable`) — split out in 0.17 |
| bevy_image | Image types (`Image`, `ImagePlugin`, `ImageFormat`) — split out in 0.17 |
| bevy_material | Material machinery extracted from `bevy_pbr`/`bevy_render` in 0.19 (`AlphaMode`, `MaterialProperties`) |
| bevy_world_serialization | Legacy scene system (renamed from `bevy_scene` in 0.19; `Scene` → `WorldAsset`, `SceneRoot` → `WorldAssetRoot`); still needed for round-trip world serialization and GLTF scene spawning |

## Verified Sources

- Official website: https://bevyengine.org/ (redirects to https://bevy.org/)
- GitHub repository: https://github.com/bevyengine/bevy
- Migration guides: https://bevyengine.org/learn/migration-guides/ (canonical: https://bevy.org/learn/migration-guides/)
- API docs: https://docs.rs/bevy
- Release feed (dates/tags): https://github.com/bevyengine/bevy/releases
