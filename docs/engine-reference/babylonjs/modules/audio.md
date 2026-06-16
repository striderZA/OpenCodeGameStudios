# Babylon.js Audio — Quick Reference

Last verified: 2026-06-14 | Engine: Babylon.js 9.10.1

## What Changed Since LLM Cutoff (~May 2025)

### v9.x Changes
- Audio Engine V2 is the default (v9 — legacy audio is opt-in)
- Audio Engine V2 added waveform analyzer data support (v9.11)
- Audio Engine V2 added distance-only spatial mode (v9.8)

### v8.x / Previous
- Legacy audio engine deprecated (v7.52) but still available via engine constructor flag
- Audio Engine V2 introduced as the new standard

## Current API Patterns

### Audio Engine V2 (Default — v9.x)

Audio Engine V2 is automatically available in Babylon.js 9.x. No special setup
is needed. It uses the Web Audio API directly for better performance and
spatial audio support.

### Sound Class (Works with both engines)

```typescript
import { Sound } from "@babylonjs/core/Audio/sound";

// Background music (non-spatial)
const music = new Sound("music", "audio/theme.mp3", scene, null, {
  loop: true,
  autoplay: true,
  volume: 0.5,
});

// Spatial SFX (3D positioned)
const engineSound = new Sound("engine", "audio/engine.wav", scene, null, {
  loop: true,
  autoplay: false,
  volume: 0.8,
  spatialSound: true,
  maxDistance: 100,
});
engineSound.setPosition(new Vector3(0, 0, 0));

// One-shot SFX
const crashSound = new Sound("crash", "audio/crash.wav", scene);
crashSound.play();
```

### SoundTrack (Layered Audio)

```typescript
import { SoundTrack } from "@babylonjs/core/Audio/soundTrack";

// Main track (music)
const musicTrack = new SoundTrack(scene, { volume: 1.0 });
musicTrack.addSound(music);

// SFX track (sound effects)
const sfxTrack = new SoundTrack(scene, { volume: 1.0 });
sfxTrack.addSound(engineSound);
sfxTrack.addSound(crashSound);

// Set volume per track
musicTrack.setVolume(0.5);
sfxTrack.setVolume(1.0);
```

### Spatial Audio Configuration

```typescript
const spatialSound = new Sound("engine", "audio/engine.wav", scene, null, {
  spatialSound: true,
  maxDistance: 200,
  distanceModel: "linear", // "linear" | "exponential" | "inverse"
  rolloffFactor: 1.0,
  loop: true,
});

// Directional cone (e.g., car exhaust)
spatialSound.setDirectionalCone(90, 180, 0); // inner angle, outer angle, outer volume

// Attach to a mesh (follows automatically)
spatialSound.attachToMesh(carMesh);

// Update position manually (for non-attached)
spatialSound.setPosition(worldPosition);
```

### Legacy Audio Engine (Opt-in — NOT recommended)

```typescript
// Only if you need the legacy engine for backward compatibility:
const engine = new Engine(canvas, true, { audioEngine: true }, true);
```

## Important Notes

- Audio Engine V2 is the default in v9 — no special setup required
- Legacy audio engine was removed as default in v7.52 — do not opt back in
- Always call `sound.dispose()` when cleaning up a scene
- Use `SoundTrack` for organizing audio into logical groups (music, SFX, UI)
- For racing: attach engine sound to car mesh with `spatialSound: true` and
  use `setDirectionalCone` for realistic directionality
- Monitor audio performance via browser DevTools (Web Audio tab)
- Mobile browsers may require user interaction before playing audio — use
  `scene.onPointerDown` to unlock audio context
