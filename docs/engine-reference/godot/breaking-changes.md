# Godot — Breaking Changes

*Last verified: 2026-04-28*  
*Applies to: Godot 4.6.2*  
*Training cutoff: May 2025*

---

## 4.4 → 4.5

### TileMap Deprecation (Continued)
- **TileMap** is officially deprecated in favor of **TileMapLayer**
- TileMapLayer provides better performance and cleaner API
- Migration: Replace TileMap nodes with TileMapLayer nodes in scenes
- **Impact for this project**: HIGH — 2D isometric tile-based course design is central. Use TileMapLayer from day one.

### NavigationServer2D/3D Improvements
- Navigation mesh baking improvements
- New navigation obstacle types
- Better agent avoidance
- **Impact for this project**: MEDIUM — AI golfer pathfinding will use NavigationAgent2D

---

## 4.5 → 4.6

### Rendering Changes
- **Default glow blend mode** changed from `softlight` to `screen`
- Default glow levels have changed
- Glow blending now occurs before tonemapping
- `softlight` glow blending changed to always appear as it did when using HDR 2D on Viewport
- **Impact for this project**: LOW — pixel art 2D game unlikely to use glow heavily

### Core Changes
- **Quaternion** now correctly initializes with identity under `Variant`
- Previous behavior: Quaternion defaulted to zero rotation in some contexts
- **Impact for this project**: LOW — 2D game, Quaternion rarely used

### Editor Improvements
- Add support for rotating scene tiles in TileMapLayer
- Rename Select Mode to Transform Mode
- Add ObjectDB Profiling Tool
- Add drag and drop export variables
- Add game speed controls to embedded game window
- Add indicator to linked resources
- **Impact for this project**: MEDIUM — improved TileMapLayer editor tools benefit course design workflow

---

## Migration Recommendations

### For New Projects (like this one)
1. Use **TileMapLayer** instead of TileMap from the start
2. Use **NavigationAgent2D** for AI pathfinding
3. Avoid deprecated APIs — consult this doc before using any API not in 4.3 docs

### For Code Review
- Flag any use of `TileMap` — migrate to `TileMapLayer`
- Flag any Quaternion initialization assumptions
- Verify glow settings if using WorldEnvironment

---

## Sources
- Godot 4.6 beta 1 release notes: https://godotengine.org/article/dev-snapshot-godot-4-6-beta-1/
- Godot 4.6.2 maintenance release: https://godotengine.org/article/maintenance-release-godot-4-6-2/
- GitHub breaks-compat label (4.6 milestone): https://github.com/godotengine/godot/issues?q=milestone%3A4.6+is%3Amerged+label%3A%22breaks+compat%22
