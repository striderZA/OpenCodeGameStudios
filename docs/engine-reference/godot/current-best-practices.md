# Godot — Current Best Practices

*Last verified: 2026-04-28*  
*Applies to: Godot 4.6.2*  
*Training cutoff: May 2025*

---

## TileMap → TileMapLayer (Critical for 2D Projects)

### Use TileMapLayer for all new 2D tile work
```gdscript
# OLD (deprecated) — TileMap
extends TileMap

func _ready():
    set_cell(0, Vector2i(1, 2), 0)

# NEW — TileMapLayer
extends TileMapLayer

func _ready():
    set_cell(Vector2i(1, 2), 0)
```

### Key differences
- TileMapLayer is a single layer — use multiple TileMapLayer nodes for multiple layers
- No layer index parameter in method calls
- Better performance due to reduced overhead
- Cleaner scene tree structure

### For this project
- Course terrain (fairway, rough, green, bunker, water) = separate TileMapLayer nodes
- Decoration (trees, benches, flags) = additional TileMapLayer nodes
- This maps cleanly to the "readable beauty" pillar

---

## Navigation in 2D

### Use NavigationAgent2D for AI pathfinding
```gdscript
extends CharacterBody2D

@onready var nav_agent: NavigationAgent2D = $NavigationAgent2D

func _ready():
    nav_agent.path_desired_distance = 4.0
    nav_agent.target_desired_distance = 4.0

func set_target_position(target: Vector2):
    nav_agent.target_position = target

func _physics_process(delta: float):
    if nav_agent.is_navigation_finished():
        return
    
    var next_path_position: Vector2 = nav_agent.get_next_path_position()
    var new_velocity: Vector2 = global_position.direction_to(next_path_position) * speed
    velocity = new_velocity
    move_and_slide()
```

### NavigationRegion2D for walkable areas
- Use NavigationRegion2D to define walkable polygons
- Bake navigation mesh from TileMapLayer or polygon data
- Update navigation mesh when terrain changes (e.g., player places a bunker)

---

## GDScript Improvements (4.4+)

### Typed dictionaries
```gdscript
# Godot 4.4+ supports typed dictionaries
var terrain_modifiers: Dictionary[String, float] = {
    "fairway": 1.0,
    "rough": 0.8,
    "bunker": 0.5,
}
```

### Better static typing enforcement
- `@static_unbound` methods
- Improved type inference in loops

---

## Rendering for 2D Pixel Art

### Recommended viewport settings
```
Project Settings → Display → Window:
  - Viewport Width: 640 (or 480)
  - Viewport Height: 360 (or 270)
  - Stretch Mode: viewport
  - Stretch Aspect: keep
```

### CanvasItem texture filtering
```gdscript
# For pixel art textures, use nearest-neighbor filtering
extends Sprite2D

func _ready():
    texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
```

### TileMapLayer for pixel art
- Set `rendering_quadrant_size` to match tile size (e.g., 16 or 32)
- Use `CanvasItem.TEXTURE_FILTER_NEAREST` on TileMapLayer

---

## Performance Best Practices

### For isometric tile-based games
1. **Use Y-sort** on TileMapLayer for proper depth ordering
2. **Limit tile updates** — don't redraw the entire course every frame
3. **Object pooling** for golf balls, particle effects
4. **Navigation mesh baking** — bake once after design changes, not every frame

### Memory management
- Use `ResourceLoader.load()` with cache mode for repeated assets
- Free nodes explicitly when removing course objects
- Monitor with Godot's built-in Memory Profiler

---

## Editor Workflow Improvements (4.6)

### Embedded game window speed controls
- Use while prototyping to fast-forward AI rounds
- Access via the embedded game window toolbar

### Drag-and-drop export variables
- Drag resources directly onto export variables in the Inspector
- Faster iteration when assigning textures, scenes, etc.

### ObjectDB Profiling Tool
- Use to detect memory leaks during long play sessions
- Access: Debugger → Monitors → Object Counts

---

## Version-Specific Gotchas

### Quaternion (4.6)
- If using Quaternion in 3D contexts (not applicable to this 2D project), note that `Quaternion()` now initializes to identity
- Old code relying on zero-initialization may behave differently

### Glow (4.6)
- If using WorldEnvironment for post-processing, verify glow settings
- Default changed from `softlight` to `screen`

---

## Sources
- Godot 4.6 beta 1 release notes: https://godotengine.org/article/dev-snapshot-godot-4-6-beta-1/
- Godot 4.6.2 maintenance release: https://godotengine.org/article/maintenance-release-godot-4-6-2/
- Godot 4.6 stable features: https://docs.godotengine.org/en/stable/about/list_of_features.html
