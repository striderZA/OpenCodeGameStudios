# Unity 6.3 — Audio Module Reference

**Last verified:** 2026-02-13
**Knowledge Gap:** Unity 6 audio mixer improvements

---

## Overview

Unity 6.3 audio systems:
- **AudioSource**: Play sounds on GameObjects
- **Audio Mixer**: Mix, effect processing, dynamic mixing
- **Spatial Audio**: 3D positioned sound

---

## Basic Audio Playback

### AudioSource Component

```csharp
AudioSource audioSource = GetComponent<AudioSource>();

// ✅ Play
audioSource.Play();

// ✅ Play with delay
audioSource.PlayDelayed(0.5f); // 0.5 seconds

// ✅ Play one-shot (doesn't interrupt current sound)
audioSource.PlayOneShot(clip);

// ✅ Stop
audioSource.Stop();

// ✅ Pause/Resume
audioSource.Pause();
audioSource.UnPause();
```

### Play Sound at Position (Static Method)

```csharp
// ✅ Quick 3D sound playback (auto-destroys when done)
AudioSource.PlayClipAtPoint(clip, transform.position);

// ✅ With volume
AudioSource.PlayClipAtPoint(clip, transform.position, 0.7f);
```

---

## 3D Spatial Audio

### AudioSource 3D Settings

```csharp
AudioSource source = GetComponent<AudioSource>();

// Spatial Blend: 0 = 2D, 1 = 3D
source.spatialBlend = 1.0f; // Fully 3D

// Doppler effect (pitch shift based on velocity)
source.dopplerLevel = 1.0f;

// Distance attenuation
source.minDistance = 1f;   // Full volume within this distance
source.maxDistance = 50f;  // Inaudible beyond this distance
source.rolloffMode = AudioRolloffMode.Logarithmic; // Natural falloff
```

### Volume Rolloff Curves
- **Logarithmic**: Natural, realistic (RECOMMENDED)
- **Linear**: Steady decrease
- **Custom**: Define your own curve

---

## Audio Mixer (Advanced Mixing)

### Setup Audio Mixer

1. `Assets > Create > Audio Mixer`
2. Open mixer: `Window > Audio > Audio Mixer`
3. Create groups: Master > SFX, Music, Dialogue

### Assign AudioSource to Mixer Group

```csharp
using UnityEngine.Audio;

public AudioMixerGroup sfxGroup;

void Start() {
    AudioSource source = GetComponent<AudioSource>();
    source.outputAudioMixerGroup = sfxGroup; // Route to SFX group
}
```

### Control Mixer from Code

```csharp
using UnityEngine.Audio;

public AudioMixer audioMixer;

// ✅ Set volume (exposed parameter)
audioMixer.SetFloat("MusicVolume", -10f); // dB (-80 to 0)

// ✅ Get volume
audioMixer.GetFloat("MusicVolume", out float volume);

// Convert linear (0-1) to dB
float volumeDB = Mathf.Log10(volumeLinear) * 20f;
audioMixer.SetFloat("MusicVolume", volumeDB);
```

### Expose Mixer Parameters
In Audio Mixer window:
1. Right-click parameter (e.g., Volume)
2. "Expose 'Volume' to script"
3. Rename in "Exposed Parameters" tab (e.g., "MusicVolume")

---

## Audio Effects

### Add Effects to Mixer Groups

In Audio Mixer:
- Click group (e.g., SFX)
- Click "Add Effect"
- Choose: Reverb, Echo, Low Pass, High Pass, Distortion, etc.

### Duck Music During Dialogue (Sidechain)

```csharp
// Setup in Audio Mixer:
// 1. Create "Duck Volume" snapshot
// 2. Lower music volume in that snapshot
// 3. Transition to snapshot when dialogue plays

public AudioMixerSnapshot normalSnapshot;
public AudioMixerSnapshot duckedSnapshot;

public void PlayDialogue(AudioClip clip) {
    duckedSnapshot.TransitionTo(0.5f); // 0.5s transition
    audioSource.PlayOneShot(clip);
    Invoke(nameof(RestoreMusic), clip.length);
}

void RestoreMusic() {
    normalSnapshot.TransitionTo(1.0f); // 1s transition back
}
```

---

## Audio Performance

### Optimize Audio Loading

```csharp
// Audio Import Settings (Inspector):
// - Load Type:
//   - Decompress On Load: Small clips (SFX), loads fully into memory
//   - Compressed In Memory: Medium clips, decompressed at runtime (RECOMMENDED)
//   - Streaming: Large clips (music), streamed from disk

// Compression Format:
// - PCM: Uncompressed, highest quality, largest size
// - ADPCM: 3.5x compression, good for SFX (RECOMMENDED for SFX)
// - Vorbis/MP3: High compression, good for music (RECOMMENDED for music)
```

### Preload Audio

```csharp
// Preload audio clip before playing (avoid stutter)
audioSource.clip.LoadAudioData();

// Check if loaded
if (audioSource.clip.loadState == AudioDataLoadState.Loaded) {
    audioSource.Play();
}
```

---

## Music Systems

### Crossfade Between Tracks

```csharp
public IEnumerator CrossfadeMusic(AudioSource from, AudioSource to, float duration) {
    float elapsed = 0f;
    to.Play();

    while (elapsed < duration) {
        elapsed += Time.deltaTime;
        float t = elapsed / duration;

        from.volume = Mathf.Lerp(1f, 0f, t);
        to.volume = Mathf.Lerp(0f, 1f, t);

        yield return null;
    }

    from.Stop();
}
```

### Seamless Music Looping

```csharp
// Audio Import Settings:
// - Check "Loop" for seamless music loops
audioSource.loop = true;
```

---

## Common Patterns

### Random Pitch Variation (Avoid Repetition)

```csharp
void PlaySoundWithVariation(AudioClip clip) {
    AudioSource source = GetComponent<AudioSource>();
    source.pitch = Random.Range(0.9f, 1.1f); // ±10% pitch variation
    source.PlayOneShot(clip);
}
```

### Footstep Sounds (Random from Array)

```csharp
public AudioClip[] footstepClips;

void PlayFootstep() {
    AudioClip clip = footstepClips[Random.Range(0, footstepClips.Length)];
    AudioSource.PlayClipAtPoint(clip, transform.position, 0.5f);
}
```

### Check if Sound is Playing

```csharp
if (audioSource.isPlaying) {
    // Sound is currently playing
}
```

---

## Audio Listener

### Single Listener Rule
- Only ONE `AudioListener` should be active at a time
- Usually attached to Main Camera

```csharp
// Disable extra listeners
AudioListener listener = GetComponent<AudioListener>();
listener.enabled = false;
```

---

## Debugging

### Audio Window
- `Window > Audio > Audio Mixer`
- Visualize levels, test snapshots

### Audio Settings
- `Edit > Project Settings > Audio`
- Global volume, DSP buffer size, speaker mode

---

## Sources
- https://docs.unity3d.com/6000.0/Documentation/Manual/Audio.html
- https://docs.unity3d.com/6000.0/Documentation/Manual/AudioMixer.html
