---
paths:
  - "src/ai/**"
---

# AI Code Rules

- AI update budget: 2ms per frame maximum — profile to verify
- All AI parameters must be tunable from data files (behavior tree weights, perception ranges, timers)
- AI must be debuggable: implement visualization hooks for all AI state (paths, perception cones, decision trees)
- AI should telegraph intentions — players need time to read and react
- Prefer utility-based or behavior tree approaches over hard-coded if/else chains
- Group AI must support formation, flanking, and role assignment from data
- All AI state machines must log transitions for debugging
- Never trust AI input from the network without validation
- Stagger AI decision updates across frames — never run full AI logic every frame for all agents
- Use Area/Shape-based detection zones instead of per-frame distance checks for perception
- Cache navigation queries — avoid per-frame `NavigationServer.map_get_path()` for many agents

## Examples

**Correct** (staggered update, data-driven):

```gdscript
@export var think_interval: float = 0.2
var _think_timer: float = 0.0

func _physics_process(delta: float) -> void:
    _think_timer += delta
    if _think_timer >= think_interval:
        _think_timer = 0.0
        _evaluate_behavior()
```

**Incorrect** (every-frame logic, hardcoded values):

```gdscript
func _physics_process(delta: float) -> void:
    var dist = global_position.distance_to(player.position)  # VIOLATION: distance check every frame
    if dist < 15.0:  # VIOLATION: hardcoded range
        _attack()
```

## Anti-Patterns

- Running every AI agent's full decision tree every frame (stagger across frames)
- `get_tree().get_nodes_in_group("enemies")` in `_physics_process()` (cache the list)
- RayCast line-of-sight checks every frame without cooldown
- Single `_physics_process()` with hundreds of lines of nested if/else (use state machine or BT)
- AI that never loses track of the player (agents should return to patrol after losing sight)
- Hardcoded reaction times, attack ranges, patrol routes (must be data-driven)

## Cross-References

- Agent: `ai-programmer` — implements AI systems
- Agent: `game-designer` — provides AI behavior specs
- Agent: `performance-analyst` — profiles AI update budgets
- Agent: `network-programmer` — multiplayer AI authority
- Skill: `team-combat` — orchestrates AI + gameplay integration
