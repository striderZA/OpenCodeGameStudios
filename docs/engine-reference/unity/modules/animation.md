# Unity 6.3 — Animation Module Reference

**Last verified:** 2026-02-13
**Knowledge Gap:** Unity 6 animation improvements, Timeline enhancements

---

## Overview

Unity 6.3 animation systems:
- **Animator Controller (Mecanim)**: State machine-based (RECOMMENDED)
- **Timeline**: Cinematic sequences, cutscenes
- **Animation Rigging**: Procedural runtime animation
- **Legacy Animation**: Deprecated, avoid

---

## Key Changes from 2022 LTS

### Animation Rigging Package (Production-Ready in Unity 6)

```csharp
// Install: Package Manager > Animation Rigging
// Runtime IK, aim constraints, procedural animation
```

### Timeline Improvements
- Better performance
- More track types
- Improved signal system

---

## Animator Controller (Mecanim)

### Basic Setup

```csharp
// Create: Assets > Create > Animator Controller
// Add to GameObject: Add Component > Animator
// Assign Controller: Animator > Controller = YourAnimatorController
```

### State Transitions

```csharp
Animator animator = GetComponent<Animator>();

// ✅ Trigger transition
animator.SetTrigger("Jump");

// ✅ Bool parameter
animator.SetBool("IsRunning", true);

// ✅ Float parameter (blend trees)
animator.SetFloat("Speed", currentSpeed);

// ✅ Integer parameter
animator.SetInteger("WeaponType", 2);
```

### Animation Layers
- **Base Layer**: Default animations (locomotion)
- **Override Layers**: Replace base layer (e.g., weapon swap)
- **Additive Layers**: Add on top of base (e.g., breathing, aim offset)

```csharp
// Set layer weight (0-1)
animator.SetLayerWeight(1, 0.5f); // 50% blend
```

---

## Blend Trees

### 1D Blend Tree (Speed blending)

```csharp
// Idle (Speed = 0) → Walk (Speed = 0.5) → Run (Speed = 1.0)
animator.SetFloat("Speed", moveSpeed);
```

### 2D Blend Tree (Directional movement)

```csharp
// X-axis: Strafe (-1 to 1)
// Y-axis: Forward/Back (-1 to 1)
animator.SetFloat("MoveX", input.x);
animator.SetFloat("MoveY", input.y);
```

---

## Animation Events

### Trigger Events from Animation Clips

```csharp
// Add in Animation window: Right-click timeline > Add Animation Event
// Must have matching method on GameObject:

public void OnFootstep() {
    // Play footstep sound
    AudioSource.PlayClipAtPoint(footstepClip, transform.position);
}

public void OnAttackHit() {
    // Deal damage
    DealDamageInFrontOfPlayer();
}
```

---

## Root Motion

### Character Movement via Animation

```csharp
Animator animator = GetComponent<Animator>();
animator.applyRootMotion = true; // Move character based on animation

void OnAnimatorMove() {
    // Custom root motion handling
    transform.position += animator.deltaPosition;
    transform.rotation *= animator.deltaRotation;
}
```

---

## Animation Rigging (Unity 6+)

### IK (Inverse Kinematics)

```csharp
// Install: Package Manager > Animation Rigging
// Add: Rig Builder component + Rig GameObject

// Two Bone IK (Arm/Leg)
// - Add Two Bone IK Constraint
// - Assign Tip (hand/foot), Mid (elbow/knee), Root (shoulder/hip)
// - Set Target (where hand/foot should reach)

// Runtime control:
TwoBoneIKConstraint ikConstraint = rig.GetComponentInChildren<TwoBoneIKConstraint>();
ikConstraint.data.target = targetTransform;
ikConstraint.weight = 1f; // 0-1 blend
```

### Aim Constraint (Look At)

```csharp
// Character looks at target
MultiAimConstraint aimConstraint = rig.GetComponentInChildren<MultiAimConstraint>();
aimConstraint.data.sourceObjects[0] = new WeightedTransform(targetTransform, 1f);
```

---

## Timeline (Cutscenes)

### Basic Timeline Setup

```csharp
// Create: Assets > Create > Timeline
// Add to GameObject: Add Component > Playable Director
// Assign Timeline: Playable Director > Playable = YourTimeline

// Play from script:
PlayableDirector director = GetComponent<PlayableDirector>();
director.Play();
```

### Timeline Tracks
- **Activation Track**: Enable/disable GameObjects
- **Animation Track**: Play animations on Animator
- **Audio Track**: Synchronized audio playback
- **Cinemachine Track**: Camera movement
- **Signal Track**: Trigger events at specific times

### Signal System (Events)

```csharp
// Create Signal Asset: Assets > Create > Signals > Signal
// Add Signal Emitter to Timeline track
// Add Signal Receiver component to GameObject

public class CutsceneEvents : MonoBehaviour {
    public void OnDialogueStart() {
        // Triggered by signal
    }
}
```

---

## Animation Playback Control

### Play Animation Directly (No State Machine)

```csharp
// ✅ CrossFade (smooth transition)
animator.CrossFade("Attack", 0.2f); // 0.2s transition

// ✅ Play (instant)
animator.Play("Idle");

// ❌ Avoid: Legacy Animation component
Animation anim = GetComponent<Animation>(); // DEPRECATED
```

---

## Animation Curves

### Custom Property Animation

```csharp
// In Animation window: Add Property > Custom Component > Your Script > Your Float

public class WeaponTrail : MonoBehaviour {
    public float trailIntensity; // Animated by clip

    void Update() {
        // Intensity controlled by animation curve
        trailRenderer.startWidth = trailIntensity;
    }
}
```

---

## Performance Optimization

### Culling
- `Animator > Culling Mode`:
  - **Always Animate**: Always update (expensive)
  - **Cull Update Transforms**: Stop updating bones when off-screen (RECOMMENDED)
  - **Cull Completely**: Stop all animation when off-screen

### LOD (Level of Detail)
- Simpler animations for distant characters
- Reduce skeleton bone count for LOD meshes

---

## Common Patterns

### Check if Animation Finished

```csharp
AnimatorStateInfo stateInfo = animator.GetCurrentAnimatorStateInfo(0);
if (stateInfo.IsName("Attack") && stateInfo.normalizedTime >= 1.0f) {
    // Attack animation finished
}
```

### Override Animation Speed

```csharp
animator.speed = 1.5f; // 150% speed
```

### Get Current Animation Name

```csharp
AnimatorClipInfo[] clipInfo = animator.GetCurrentAnimatorClipInfo(0);
string currentClip = clipInfo[0].clip.name;
```

---

## Debugging

### Animator Window
- `Window > Animation > Animator`
- Visualize state machine, see active state

### Animation Window
- `Window > Animation > Animation`
- Edit animation clips, add events

---

## Sources
- https://docs.unity3d.com/6000.0/Documentation/Manual/AnimationOverview.html
- https://docs.unity3d.com/Packages/com.unity.animation.rigging@1.3/manual/index.html
- https://docs.unity3d.com/Packages/com.unity.timeline@1.8/manual/index.html
