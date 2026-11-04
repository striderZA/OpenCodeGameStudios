# Godot Engine — Version Reference

| Field | Value |
|-------|-------|
| **Engine Version** | Godot 4.7.2 |
| **Release Date** | June 2026 (4.7); 4.7.2 patch, August 2026 |
| **Project Pinned** | 2026-11-04 |
| **Last Docs Verified** | 2026-11-04 |
| **LLM Knowledge Cutoff** | May 2025 |

## Knowledge Gap Warning

The LLM's training data likely covers Godot up to ~4.3. Versions 4.4, 4.5,
4.6, and 4.7 introduced significant changes that the model does NOT know about.
Always cross-reference this directory before suggesting Godot API calls.

## Post-Cutoff Version Timeline

| Version | Release | Risk Level | Key Theme |
|---------|---------|------------|-----------|
| 4.4 | ~Mid 2025 | MEDIUM | Jolt physics option, FileAccess return types, shader texture type changes |
| 4.5 | ~Late 2025 | HIGH | Accessibility (AccessKit), variadic args, @abstract, shader baker, SMAA |
| 4.6 | Jan 2026 | HIGH | Jolt default, glow rework, D3D12 default on Windows, IK restored |
| 4.7 | Jun 2026 | HIGH | AreaLight3D, HDR output, Asset Store, Control offset transforms, standalone Android export (GABE) |

## Verified Sources

- Official docs: https://docs.godotengine.org/en/stable/
- 4.5→4.6 migration: https://docs.godotengine.org/en/stable/tutorials/migrating/upgrading_to_godot_4.6.html
- 4.4→4.5 migration: https://docs.godotengine.org/en/stable/tutorials/migrating/upgrading_to_godot_4.5.html
- Changelog: https://github.com/godotengine/godot/blob/master/CHANGELOG.md
- Release notes: https://godotengine.org/releases/4.6/
- 4.6→4.7 migration: https://docs.godotengine.org/en/4.7/tutorials/migrating/upgrading_to_godot_4.7.html
- Release notes 4.7: https://godotengine.org/releases/4.7/

## Migration Notes — 4.6 → 4.7.2

- Migration guide: https://docs.godotengine.org/en/4.7/tutorials/migrating/upgrading_to_godot_4.7.html
- Pre-upgrade audit (2026-11-04): this repository has no Godot code. `src/` holds only `.gitkeep` and `AGENTS.md`, and there is no `project.godot`. No deprecated API usage was found, so no source migration is needed here.
- Breaking changes most likely to affect a new project (the full list is in `breaking-changes.md`):
  - GDScript: an override of a method with a typed return must return explicitly (the guide suggests `return null`).
  - GDScript: setting an element of a packed array no longer calls the setter for the whole array property.
  - Input: mouse and keyboard device IDs changed from `0` to `InputEvent.DEVICE_ID_MOUSE` and `InputEvent.DEVICE_ID_KEYBOARD`.
  - Physics: `AudioStreamPlayer.area_mask` now defaults to `0` (was `1`). Projects that use Area `audio_bus_override` with the old default must set the mask back to layer 1.
  - Changed defaults: new projects use `canvas_items` stretch mode and `expand` aspect.
- Renamed or replaced APIs: see `deprecated-apis.md` (4.7 rows).
- Recommended migration order: none (no source code in this repository).
