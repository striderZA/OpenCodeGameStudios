# SFML Audio — Quick Reference

Last verified: 2026-07-22 | Engine: SFML 3.0

## What Changed Since 2.x (LLM Cutoff)

### SFML 3.0 Changes
- **Exception-based loading** — `sf::SoundBuffer` constructor throws on failure
- **No separate loadFromFile** — use constructor pattern
- **C++17 patterns** — use modern resource management

### Unchanged Core API
- `sf::Sound`, `sf::Music`, `sf::SoundBuffer`, `sf::Listener` remain
- Playback controls (`play()`, `pause()`, `stop()`) unchanged
- Spatial audio via `sf::Listener` unchanged

## Current API Patterns

### Sound Buffers & Sounds
```cpp
#include <SFML/Audio.hpp>

// Exception-based loading (3.0 pattern)
try {
    sf::SoundBuffer buffer("assets/explosion.wav");
    sf::Sound sound(buffer);
    sound.play();
} catch (const sf::Exception& e) {
    // Handle load failure
}

// Multiple sounds from one buffer
sf::SoundBuffer buffer("assets/laser.wav");
sf::Sound sound1(buffer);
sf::Sound sound2(buffer);
sound1.play();
sound2.play(); // Overlapping sounds
```

### Music Streaming
```cpp
// Music streams from disk — use for long audio (BGM, voice)
try {
    sf::Music music("assets/background.ogg");
    music.setLooping(true);
    music.setVolume(50.f); // 0-100
    music.play();
} catch (const sf::Exception& e) {
    // Handle load failure
}

// Music from memory
sf::Music memMusic(memoryData, size);
```

### Sound Properties
```cpp
sf::Sound sound(buffer);

// Volume (0.0 to 100.0)
sound.setVolume(75.f);

// Pitch (1.0 = normal)
sound.setPitch(1.5f);

// Looping
sound.setLooping(true);

// Position (for spatial audio)
sound.setPosition({10.f, 0.f, 5.f});

// Check status
if (sound.getStatus() == sf::Sound::Status::Stopped) {
    // Sound finished playing
}
```

### Spatial Audio (3D Sound)
```cpp
// Listener setup (the "ears")
sf::Listener::setGlobalVolume(100.f);
sf::Listener::setPosition({0.f, 0.f, 0.f});
sf::Listener::setDirection({0.f, 0.f, -1.f}); // Looking down -Z

// Sound positioning
sf::Sound sound(buffer);
sound.setPosition({10.f, 0.f, 5.f}); // Sound source position
sound.setRelativeToListener(false); // Enable 3D spatialization
sound.setMinDistance(5.f); // Distance at which volume is max
sound.setAttenuation(10.f); // How fast volume drops with distance
sound.play();
```

### Audio Recording
```cpp
// Check if recording is available
if (sf::AudioRecorder::isAvailable()) {
    sf::AudioRecorder recorder;
    recorder.start(44100); // Sample rate
    // ... record ...
    const sf::SoundBuffer& recording = recorder.stop();
    recording.saveToFile("recording.wav");
}
```

## Common Mistakes
- Using `buffer.loadFromFile()` — use constructor `sf::SoundBuffer("path")`
- Not catching exceptions from constructors — crashes on missing files
- Using `sf::Sound` for long audio (music) — use `sf::Music` for streaming
- Destroying `sf::SoundBuffer` while `sf::Sound` is still playing (lifetime)
- Forgetting to set `setRelativeToListener(false)` for 3D spatial audio
- Setting attenuation to 0 — disables distance-based volume drop
