# Technical Preferences

Project: The 19th Hole (cozy golf course management)  
Engine: Godot 4.6.2  
Language: GDScript  
Last updated: 2026-04-28

---

## Engine & Language

- **Engine**: Godot 4.6.2
- **Language**: GDScript
- **Build System**: SCons (engine), Godot Export Templates
- **Asset Pipeline**: Godot Import System + custom resource pipeline

---

## Naming Conventions

### GDScript
- **Classes**: PascalCase (e.g., `PlayerController`)
- **Variables / functions**: snake_case (e.g., `move_speed`)
- **Signals**: snake_case past tense (e.g., `health_changed`)
- **Files**: snake_case matching class (e.g., `player_controller.gd`)
- **Scenes**: PascalCase matching root node (e.g., `PlayerController.tscn`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_HEALTH`)

---

## Input & Platform

- **Target Platforms**: PC (Steam / Epic)
- **Input Methods**: Keyboard / Mouse
- **Primary Input**: Keyboard / Mouse
- **Gamepad Support**: Partial (recommended for accessibility)
- **Touch Support**: None
- **Platform Notes**: All UI must support keyboard navigation. No hover-only interactions.

---

## Performance Budgets

- **Target Frame Rate**: 60 fps
- **Frame Budget**: 16.6 ms
- **Target Hardware**: Mid-range PC (equivalent to GTX 1060 / RX 580)
- **Draw Calls**: Budget TBD — set during architecture phase
- **Memory Budget**: Budget TBD — set during architecture phase

---

## Testing

- **Unit Testing Framework**: GUT (Godot Unit Testing)
- **Integration Testing**: Manual + automated scene tests
- **Performance Testing**: Custom performance monitors via Godot profiler
- **CI/CD**: TBD — set during devops setup

---

## Forbidden Patterns

- [TO BE CONFIGURED — populated during architecture phase]

---

## Allowed Libraries

- [TO BE CONFIGURED — only add when actively integrating]

> **Guardrail**: Never add speculative dependencies. Only add a library here when it is actively being integrated, not speculatively.

---

## Engine Specialists

- **Primary**: godot-specialist
- **Language/Code Specialist**: godot-gdscript-specialist (all .gd files)
- **Shader Specialist**: godot-shader-specialist (.gdshader files, VisualShader resources)
- **UI Specialist**: godot-specialist (no dedicated UI specialist — primary covers all UI)
- **Additional Specialists**: godot-gdextension-specialist (GDExtension / native C++ bindings only)
- **Routing Notes**: Invoke primary for architecture decisions, ADR validation, and cross-cutting code review. Invoke GDScript specialist for code quality, signal architecture, static typing enforcement, and GDScript idioms. Invoke shader specialist for material design and shader code. Invoke GDExtension specialist only when native extensions are involved.

### File Extension Routing

| File Extension / Type | Specialist to Spawn |
|-----------------------|---------------------|
| Game code (.gd files) | godot-gdscript-specialist |
| Shader / material files (.gdshader, VisualShader) | godot-shader-specialist |
| UI / screen files (Control nodes, CanvasLayer) | godot-specialist |
| Scene / prefab / level files (.tscn, .tres) | godot-specialist |
| Native extension / plugin files (.gdextension, C++) | godot-gdextension-specialist |
| General architecture review | godot-specialist |

---

## Version Awareness

All engine specialists must:
1. Read `docs/engine-reference/godot/VERSION.md` before suggesting code
2. Check deprecated APIs in `docs/engine-reference/godot/deprecated-apis.md` before using older patterns
3. Check breaking changes in `docs/engine-reference/godot/breaking-changes.md` for relevant version transitions
4. Use WebSearch to verify uncertain APIs when working with features introduced after Godot 4.3

---

## Engine Version Reference

@docs/engine-reference/godot/VERSION.md
