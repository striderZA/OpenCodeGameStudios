# Babylon.js — Version Reference

| Field | Value |
|-------|-------|
| **Engine Version** | 9.12.0 |
| **Project Pinned** | 2026-06-15 |
| **LLM Knowledge Cutoff** | May 2025 |
| **Risk Level** | HIGH — post-cutoff major versions (8.x, 9.x) with breaking changes |
| **Last Verified** | 2026-06-15 |

## Post-Cutoff Version Timeline

Babylon.js releases weekly (every Thursday), so many versions have shipped since
the training cutoff. Key milestones:

| Version | Date | Significance |
|---------|------|-------------|
| 8.x series | 2025 Q3–Q4 | Frame Graph alpha → stable, Audio Engine V2, TypeScript 5.x |
| 9.0.0 | 2026-03-26 | Clustered Lighting, Frame Graph v1, OpenPBR, Inspector v2, Geospatial Camera, Volumetric Lighting, SDF Text, Audio V2, Large World Rendering |
| 9.1.0 | 2026-04 | TypeScript 6.0 upgrade, WebGPU vertex pulling, Flow Graph Editor |
| 9.12.0 | 2026-06-11 | Latest stable — weekly minor releases since 9.0 |

### Version Strategy

Babylon.js releases a new minor version every Thursday from master. Patch
versions are released during the week for critical bug fixes. Older minor
versions are never updated. Use caret (`^`) in `package.json` to stay at the
latest of a given major version.

**Recommended**: Pin to `^9.12.0` for this project. The caret will pick up
patch fixes within 9.x without jumping to 10.0 (when released).

## Migration Notes

### 8.x → 9.0 Migration

9.0.0 was a relatively small breaking release. The main items:

1. Removed redundant state assignment in `EquiRectangularCubeTexture.delayLoad`
2. Fixed splat shader materials having culling enabled by default (splats now
   render correctly without manual culling overrides)
3. Viewer: environment and IBL irradiance direction bug fixed

### 7.x → 8.x Migration

The 7.x → 8.x transition involved more significant changes:

1. Frame Graph alpha → added new rendering pipeline (optional, no breakage)
2. Audio Engine V2 introduced (legacy audio engine no longer default)
3. PBR translucency corrections with legacy fallback flag
4. Camera orientation fixes for right-handed scenes
5. Migration from Jest to Vitest (dev tooling, not runtime)
6. WebGPU improvements: WGSL shader generation, vertex pulling

## Key URLs

- **Breaking Changes**: https://doc.babylonjs.com/breaking-changes/
- **Changelog**: https://github.com/BabylonJS/Babylon.js/blob/master/CHANGELOG.md
- **Release Notes**: https://github.com/BabylonJS/Babylon.js/releases
- **Documentation**: https://doc.babylonjs.com/
- **Playground**: https://playground.babylonjs.com/
- **NPM**: https://www.npmjs.com/package/@babylonjs/core
