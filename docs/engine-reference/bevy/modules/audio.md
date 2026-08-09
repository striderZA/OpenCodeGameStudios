# Bevy Audio — Quick Reference

**Last verified:** 2026-08-09

## Core Concepts
- **AudioPlayer** — component that plays a sound: `pub struct AudioPlayer<Source = AudioSource>(pub Handle<Source>)`, or `AudioPlayer::new(handle)`. Required component `PlaybackSettings` is auto-inserted.
- **PlaybackSettings** — controls playback: `mode: PlaybackMode`, `volume: Volume`, `speed`, `paused`, `muted`, `spatial`; consts `ONCE`, `LOOP`, `DESPAWN`, `REMOVE`; builder fns `paused()`, `muted()`, `with_volume()`, `with_speed()`, `with_spatial()`, `with_spatial_scale()`.
- **AudioSource** — the audio data asset (loads .ogg/.wav/.mp3/.flac depending on format features).
- **AudioSink / SpatialAudioSink** — components added to the entity once playback starts, for runtime control.
- **Spatial audio** — set `PlaybackSettings.spatial = true` on the emitter and spawn one `SpatialListener` entity; simple left/right panning (no HRTF).
- **Volume** — `enum Volume { Linear(f32), Decibels(f32) }`; helpers `to_linear()`, `increase_by_percentage()`, `decrease_by_percentage()`, `fade_towards()`.
- **Features** — `audio` is no longer implied by `2d`/`3d`/`ui` (0.19); enable format features explicitly with `default-features = false`.

## Playing Audio
```rust
fn play_background_audio(asset_server: Res<AssetServer>, mut commands: Commands) {
    commands.spawn((
        AudioPlayer::new(asset_server.load("background_audio.ogg")),
        PlaybackSettings::LOOP,
    ));
}
```
- One-shot SFX that despawns when finished: `commands.spawn((AudioPlayer::new(handle), PlaybackSettings::DESPAWN));`.
- Simplest: `commands.spawn(AudioPlayer::new(asset_server.load("sounds/shot.ogg")));` (default `ONCE`).
- There is no `AudioBundle` in 0.19 — spawn the components directly.

## Spatial Audio
```rust
// Emitter: enable spatial on the playback settings.
commands.spawn((
    AudioPlayer::new(asset_server.load("sounds/footsteps.ogg")),
    PlaybackSettings::LOOP.with_spatial(true),
    Transform::from_xyz(0.0, 0.0, -5.0),
));

// Listener: exactly one per scene; gap = ear separation (400.0 in 2D, 4.0 in 3D).
commands.spawn((
    Transform::default(),
    SpatialListener::new(400.0),
));
```
`SpatialListener { left_ear_offset: Vec3, right_ear_offset: Vec3 }` requires `Transform`; only one listener entity at a time. There is no `SpatialAudioBundle` in 0.19.

## Volume Control
```rust
// Adjust volume relatively (Add/Sub impls were removed in 0.17):
let volume = Volume::Linear(0.5);
let louder = volume.increase_by_percentage(10.0);
// Global volume resource: ResMut<GlobalVolume> (from AudioPlugin).
```

## Common Pitfalls
- **No `AudioBundle` / `SpatialAudioBundle` in 0.19** — required components (`PlaybackSettings`, `Transform`) are auto-inserted; spawn the component tuples.
- **0.19: `audio` not implied by `2d`/`3d`/`ui`** — with `default-features = false`, add `"audio"` plus format features (`vorbis`, `wav`, `mp3`, `flac`) to Cargo.toml.
- **`minimp3` feature removed (0.17)** — use `mp3` (symphonia backend).
- `PlaybackSettings` changes don't affect already-playing audio — mutate the `AudioSink` component instead.
- Spatial audio is simple stereo panning; only one `SpatialListener` entity at a time.

## Sources
- https://docs.rs/bevy/0.19.0/bevy/audio/index.html
- https://docs.rs/bevy/0.19.0/bevy/audio/struct.AudioPlayer.html
- https://docs.rs/bevy/0.19.0/bevy/audio/struct.PlaybackSettings.html
- https://docs.rs/bevy/0.19.0/bevy/audio/struct.SpatialListener.html
- https://docs.rs/bevy/0.19.0/bevy/audio/enum.Volume.html
- https://bevy.org/learn/migration-guides/0-16-to-0-17/#remove-the-add-sub-impls-on-volume
- https://bevy.org/learn/migration-guides/0-18-to-0-19/#audio-feature-is-now-no-longer-implied-by-the-3d-2d-or-ui-features
