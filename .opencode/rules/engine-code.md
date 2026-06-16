---
paths:
  - "src/core/**"
---

# Engine Code Rules

- ZERO allocations in hot paths (update loops, rendering, physics) — pre-allocate, pool, reuse
- All engine APIs must be thread-safe OR explicitly documented as single-thread-only
- Profile before AND after every optimization — document the measured numbers
- Engine code must NEVER depend on gameplay code (strict dependency direction: engine <- gameplay)
- Every public API must have usage examples in its doc comment
- Changes to public interfaces require a deprecation period and migration guide
- Use RAII / deterministic cleanup for all resources
- All engine systems must support graceful degradation
- Before writing engine API code, consult `docs/engine-reference/` for the current engine version and verify APIs against the reference docs

## Examples

**Correct** (zero-alloc hot path — GDScript / Godot):

```gdscript
# Pre-allocated array reused each frame
var _nearby_cache: Array[Node3D] = []

func _physics_process(delta: float) -> void:
    _nearby_cache.clear()  # Reuse, don't reallocate
    _spatial_grid.query_radius(position, radius, _nearby_cache)
```

**Correct** (zero-alloc hot path — C++ / SFML):

```cpp
// Pre-allocated vertex buffer reused each frame
std::vector<sf::Vertex> m_vertex_cache;

void update(float dt) {
    m_vertex_cache.clear();        // Reuse, don't reallocate
    m_vertex_cache.reserve(1024);  // Ensure capacity
    // Populate vertices...
    m_target.draw(m_vertex_cache.data(), m_vertex_cache.size(), sf::Quads);
}
```

**Incorrect** (allocating in hot path — GDScript / Godot):

```gdscript
func _physics_process(delta: float) -> void:
    var nearby: Array[Node3D] = []  # VIOLATION: allocates every frame
    nearby = get_tree().get_nodes_in_group("enemies")  # VIOLATION: tree query every frame
```

**Incorrect** (allocating in hot path — C++ / Raylib):

```cpp
void Update() {
    std::vector<Vector2> positions;  // VIOLATION: heap alloc every frame
    for (int i = 0; i < entity_count; i++) {
        positions.push_back(GetEntityPos(i));
    }
    // Use positions...
}
```

## Anti-Patterns

- Calling `free()` instead of `queue_free()` in signal callbacks (use-after-free crashes)
- Storing scene-specific node references in Autoloads (invalid after scene change)
- Synchronous resource loading in `_ready()` for large assets (blocks main thread)
- Accessing `get_tree()` in non-node classes without null checking
- Not disconnecting signals before `queue_free()` (error spam from dead nodes)
- Mixing engine and gameplay dependencies (engine code must not import gameplay)
- Calling Godot API from threads other than the main thread (undefined behavior)
- Loading textures/fonts/sounds inside the render loop (blocks rendering every frame)
- Creating/destroying `sf::Texture` or `RenderTexture2D` as local variables in draw functions
- Using `new`/`delete` directly instead of RAII (leaks on exception)
- Not checking return values on resource loading (crashes on missing files)

## Cross-References

- Agent: `engine-programmer` — owns engine code
- Agent: `godot-specialist` — Godot-specific engine patterns
- Agent: `sfml-specialist` — SFML 3-specific engine patterns
- Agent: `raylib-specialist` — Raylib-specific engine patterns
- Agent: `babylonjs-specialist` — Babylon.js-specific engine patterns
- Agent: `performance-analyst` — profiles engine performance
- Agent: `technical-director` — approves engine architecture
- Rule: `network-code.md` — transport layer dependency
- Rule: `test-standards.md` — engine-level test patterns
