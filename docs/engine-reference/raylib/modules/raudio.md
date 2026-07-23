# Raylib raudio — Quick Reference

Last verified: 2026-07-22 | Engine: Raylib 5.5

## Overview

The audio module provides sound playback and music streaming. Always call
`InitAudioDevice()` before any audio functions, and `CloseAudioDevice()` at cleanup.

## Current API Patterns

### Audio Setup
```c
#include "raylib.h"

int main() {
    InitWindow(800, 600, "Game");
    InitAudioDevice(); // MUST call before audio functions

    // ... game loop ...

    CloseAudioDevice(); // MUST call at cleanup
    CloseWindow();
    return 0;
}
```

### Sound Effects (Short Audio)
```c
// Load sound (loads entire file into memory)
Sound laser = LoadSound("assets/laser.wav");
Sound explosion = LoadSound("assets/explosion.ogg");

// Play sound
PlaySound(laser);

// Sound properties
SetSoundVolume(laser, 0.8f);   // 0.0f to 1.0f
SetSoundPitch(laser, 1.2f);    // 1.0 = normal
SetSoundPan(laser, 0.5f);      // 0.0 = left, 1.0 = right

// Multiple instances of same sound
Sound instance1 = LoadSoundAlias(laser); // Shares audio data
PlaySound(instance1);
PlaySound(laser); // Both play simultaneously

// Check if playing
if (!IsSoundPlaying(laser)) {
    PlaySound(laser);
}

// Stop
StopSound(laser);
PauseSound(laser);
ResumeSound(laser);

// Cleanup
UnloadSound(laser);
UnloadSoundAlias(instance1);
```

### Music Streaming (Long Audio)
```c
// Music streams from disk — use for BGM, ambient, voice
Music bgm = LoadMusicStream("assets/background.ogg");

// Play music
PlayMusicStream(bgm);

// MUST call every frame to process streaming
UpdateMusicStream(bgm);

// Music properties
SetMusicVolume(bgm, 0.5f);
SetMusicPan(bgm, 0.5f);
SetMusicPitch(bgm, 1.0f);

// Looping
// Music loops by default — use StopMusicStream() to stop, or
// check GetMusicTimePlayed() >= GetMusicTimeLength() to manually loop.

// Check playback state
if (IsMusicStreamPlaying(bgm)) {
    // Music is playing
}
float length = GetMusicTimeLength(bgm); // Total duration in seconds
float played = GetMusicTimePlayed(bgm); // Time played so far

// Seek
SeekMusicStream(bgm, 30.0f); // Jump to 30 seconds

// Pause/Resume/Stop
PauseMusicStream(bgm);
ResumeMusicStream(bgm);
StopMusicStream(bgm);

// Cleanup
UnloadMusicStream(bgm);
```

### Audio Recording
```c
// Check if recording is supported
if (IsAudioDeviceReady()) {
    // Start recording (44100 Hz, 16-bit, mono)
    AudioStream stream = LoadAudioStream(44100, 16, 1);
    StartAudioRecording(); // Note: platform-dependent

    // Stop recording
    Wave wave = StopAudioRecording();

    // Save recording
    ExportWave(wave, "recording.wav");
    UnloadWave(wave);
}
```

### Wave (Raw Audio Data)
```c
// Load wave file
Wave wave = LoadWave("assets/sound.wav");

// Wave properties
unsigned int sampleCount = wave.sampleCount;
unsigned int sampleRate = wave.sampleRate;
unsigned int sampleSize = wave.sampleSize; // bits
unsigned int channels = wave.channels;

// Modify wave data
WaveCopy copy = WaveCopy(wave);
WaveCrop(&copy, 100, 500); // Crop samples
WaveFormat(&copy, 22050, 16, 1); // Convert format

// Generate wave from audio data
float* data = (float*)wave.data;
for (unsigned int i = 0; i < wave.sampleCount; i++) {
    // Process audio samples
}

// Export
ExportWave(wave, "output.wav");

// Cleanup
UnloadWave(wave);
```

### Sound Properties
```c
// Volume (0.0 to 1.0)
SetSoundVolume(sound, 0.8f);
SetMusicVolume(music, 0.5f);
SetMasterVolume(0.7f); // Affects all audio

// Pitch (1.0 = normal)
SetSoundPitch(sound, 1.5f); // Higher pitch

// Pan (0.0 left, 0.5 center, 1.0 right)
SetSoundPan(sound, 0.3f);
```

## Common Mistakes
- Not calling `InitAudioDevice()` — audio functions will crash/fail silently
- Not calling `UpdateMusicStream()` every frame — music will stutter or stop
- Using `LoadSound()` for long audio — use `LoadMusicStream()` for streaming
- Forgetting to `UnloadSound()` / `UnloadMusicStream()` — memory leak
- Not calling `CloseAudioDevice()` at cleanup
- Playing too many sounds simultaneously without aliasing
- Modifying audio without checking device ready state
- Forgetting to set master volume for global audio control
