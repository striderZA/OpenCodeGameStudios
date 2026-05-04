---
paths:
  - "src/ui/**"
---

# UI Code Rules

- UI must NEVER own or directly modify game state — display only, use commands/events to request changes
- All UI text must go through the localization system — no hardcoded user-facing strings
- Support both keyboard/mouse AND gamepad input for all interactive elements
- All animations must be skippable and respect user motion/accessibility preferences
- UI sounds trigger through the audio event system, not directly
- UI must never block the game thread
- Scalable text and colorblind modes are mandatory, not optional
- Test all screens at minimum and maximum supported resolutions
- Avoid deep container nesting (>5 levels) — extract into sub-scenes
- Use anchors and containers for layout, not absolute pixel positions
- Never poll game state in `_process()` — connect to signals for UI updates

## Examples

**Correct** (signal-driven, localized, responsive):

```gdscript
@onready var health_bar: ProgressBar = %HealthBar
@onready var label: Label = %Label

func bind(health_component: HealthComponent) -> void:
    health_component.health_changed.connect(_update_display)

func _update_display(current: float, maximum: float) -> void:
    health_bar.max_value = maximum
    health_bar.value = current
    label.text = tr("UI_HEALTH_FORMAT") % [int(current), int(maximum)]
```

**Incorrect** (polling game state, hardcoded strings):

```gdscript
func _process(delta: float) -> void:
    # VIOLATION: polling game state every frame
    health_bar.value = get_parent().health  # VIOLATION: coupling to parent type
    label.text = "Health: " + str(current_health)  # VIOLATION: no localization
```

## Anti-Patterns

- Directly calling `get_parent()` or assuming scene tree structure from UI code
- Hardcoded strings that say "Fix this later" (all strings must be localized from day one)
- `_process()` polling game state instead of using signals
- 10+ levels of nested containers — split into sub-scenes
- Forcing the game to wait for a UI animation to finish before the player can act
- UI code that references gameplay code directories (UI imports should point only to shared contracts)
- Not handling window resize (anchors not configured, elements fall off screen)
- Color as the sole differentiator for game-critical information

## Cross-References

- Agent: `ui-programmer` — implements UI systems
- Agent: `ux-designer` — designs interaction flows
- Agent: `accessibility-specialist` — audits for compliance
- Agent: `localization-lead` — manages string tables
- Agent: `art-director` — provides visual direction
- Skill: `team-ui` — orchestrates UI development team
- Rule: `test-standards.md` — UI test patterns
