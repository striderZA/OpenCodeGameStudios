---
paths:
  - "src/gameplay/**"
---

# Gameplay Code Rules

- ALL gameplay values MUST come from external config/data files, NEVER hardcoded
- Use delta time for ALL time-dependent calculations (frame-rate independence)
- NO direct references to UI code — use events/signals for cross-system communication
- Every gameplay system must implement a clear interface
- State machines must have explicit transition tables with documented states
- Write unit tests for all gameplay logic — separate logic from presentation
- Document which design doc each feature implements in code comments
- No static singletons for game state — use dependency injection

## Examples

**Correct** (data-driven):

```gdscript
var damage: float = config.get_value("combat", "base_damage", 10.0)
var speed: float = stats_resource.movement_speed * delta
```

**Incorrect** (hardcoded):

```gdscript
var damage: float = 25.0   # VIOLATION: hardcoded gameplay value
var speed: float = 5.0      # VIOLATION: not from config, not using delta
```

## Anti-Patterns

- Giant `_physics_process()` with hundreds of lines — extract into functions or states
- Direct `get_node("../../../SomeNode")` paths — use `%` unique names or signals
- Connecting signals in `_process()` (reconnects every frame, massive leak)
- Checking `Input.is_action_pressed()` in `_process` instead of `_input`
- One system directly modifying another system's internal state (use signals)
- Storing `Node` references across scene reloads without null checking
- Forgetting to `queue_free()` nodes removed from the tree

## Cross-References

- Agent: `gameplay-programmer` — implements gameplay systems
- Agent: `game-designer` — provides gameplay specs
- Agent: `systems-designer` — creates formulas and tuning
- Agent: `ui-programmer` — receives gameplay-to-UI events
- Skill: `dev-story` — implements gameplay stories
- Skill: `code-review` — reviews gameplay code
- Rule: `engine-code.md` — dependency direction
- Rule: `test-standards.md` — gameplay test patterns
