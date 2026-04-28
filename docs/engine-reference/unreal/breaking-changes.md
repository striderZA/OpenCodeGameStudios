# Unreal Engine 5.7 — Breaking Changes

**Last verified:** 2026-02-13

This document tracks breaking API changes and behavioral differences between Unreal Engine 5.3
(likely in model training) and Unreal Engine 5.7 (current version). Organized by risk level.

## HIGH RISK — Will Break Existing Code

### Substrate Material System (Production-Ready in 5.7)
**Versions:** UE 5.5+ (experimental), 5.7 (production-ready)

Substrate replaces the legacy material system with a modular, physically accurate framework.

```cpp
// ❌ OLD: Legacy material nodes (still work but deprecated)
// Standard material graph with Base Color, Metallic, Roughness, etc.

// ✅ NEW: Substrate material layers
// Use Substrate nodes: Substrate Slab, Substrate Blend, etc.
// Modular material authoring with true physical accuracy
```

**Migration:** Enable Substrate in `Project Settings > Engine > Substrate` and rebuild materials using Substrate nodes.

---

### PCG (Procedural Content Generation) API Overhaul
**Versions:** UE 5.7 (production-ready)

PCG framework reached production-ready status with major API changes.

```cpp
// ❌ OLD: Experimental PCG API (pre-5.7)
// Old node types, unstable API

// ✅ NEW: Production PCG API (5.7+)
// Use FPCGContext, IPCGElement, new node types
// Stable API, production-ready workflow
```

**Migration:** Follow PCG migration guide in 5.7 docs. Expect significant refactoring for experimental PCG code.

---

### Megalights Rendering System
**Versions:** UE 5.5+

New lighting system supports millions of dynamic lights.

```cpp
// ❌ OLD: Limited dynamic lights (clustered forward shading)
// Max ~100-200 dynamic lights before performance degrades

// ✅ NEW: Megalights (5.5+)
// Millions of dynamic lights with minimal performance cost
// Enable: Project Settings > Engine > Rendering > Megalights
```

**Migration:** No code changes needed, but lighting behavior may differ. Test scenes after enabling.

---

## MEDIUM RISK — Behavioral Changes

### Enhanced Input System (Now Default)
**Versions:** UE 5.1+ (recommended), 5.7 (default)

Enhanced Input is now the default input system.

```cpp
// ❌ OLD: Legacy input bindings (deprecated)
InputComponent->BindAction("Jump", IE_Pressed, this, &ACharacter::Jump);

// ✅ NEW: Enhanced Input
SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) {
    UEnhancedInputComponent* EIC = Cast<UEnhancedInputComponent>(PlayerInputComponent);
    EIC->BindAction(JumpAction, ETriggerEvent::Started, this, &ACharacter::Jump);
}
```

**Migration:** Replace legacy input bindings with Enhanced Input actions.

---

### Nanite Default Enabled
**Versions:** UE 5.0+ (optional), 5.7 (encouraged)

Nanite virtualized geometry is now the recommended workflow for static meshes.

```cpp
// Enable Nanite on static mesh:
// Static Mesh Editor > Details > Nanite Settings > Enable Nanite Support
```

**Migration:** Convert high-poly meshes to Nanite. Test performance on target platforms.

---

## LOW RISK — Deprecations (Still Functional)

### Legacy Material System
**Status:** Deprecated but supported
**Replacement:** Substrate Material System

Legacy materials still work, but Substrate is recommended for new projects.

---

### Old World Partition (UE4 Style)
**Status:** Deprecated
**Replacement:** World Partition (UE5+)

Use UE5's World Partition system for large worlds.

---

## Platform-Specific Breaking Changes

### Windows
- **UE 5.7**: DirectX 12 is now default (was DX11 in older versions)
- Update shaders for DX12 compatibility

### macOS
- **UE 5.5+**: Metal 3 required (minimum macOS 13)

### Mobile
- **UE 5.7**: Minimum Android API level raised to 26 (Android 8.0)
- Minimum iOS deployment target raised to iOS 14

---

## Migration Checklist

When upgrading from UE 5.3 to UE 5.7:

- [ ] Review Substrate materials (convert if ready for new system)
- [ ] Audit PCG usage (update to production API if using experimental)
- [ ] Test Megalights performance (enable and benchmark)
- [ ] Migrate legacy input to Enhanced Input
- [ ] Convert high-poly meshes to Nanite
- [ ] Update shaders for DX12 (Windows) or Metal 3 (macOS)
- [ ] Verify minimum platform versions (Android 8.0, iOS 14)
- [ ] Test Lumen and Nanite performance on target hardware

---

**Sources:**
- https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-5-7-release-notes
- https://dev.epicgames.com/documentation/en-us/unreal-engine/upgrading-projects-to-newer-versions-of-unreal-engine
