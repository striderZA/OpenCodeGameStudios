---
paths:
  - "assets/shaders/**"
---

# Shader Code Standards

All shader files in `assets/shaders/` must follow these standards to maintain
visual quality, performance, and cross-platform compatibility.

## Naming Conventions
- File naming: `[type]_[category]_[name].[ext]`
  - `spatial_env_water.gdshader` (Godot)
  - `SG_Env_Water` (Unity Shader Graph)
  - `M_Env_Water` (Unreal Material)
- Use descriptive names that indicate the material purpose
- Prefix with shader type: `spatial_`, `canvas_`, `particles_`, `post_`

## Code Quality
- All uniforms/parameters must have descriptive names and appropriate hints
- Group related parameters (Godot: `group_uniforms`, Unity: `[Header]`, Unreal: Category)
- Comment non-obvious calculations (especially math-heavy sections)
- No magic numbers — use named constants or documented uniform values
- Include authorship and purpose comment at the top of each shader file

## Performance Requirements
- Document the target platform and complexity budget for each shader
- Use appropriate precision: `half`/`mediump` on mobile where full precision isn't needed
- Minimize texture samples in fragment shaders
- Avoid dynamic branching in fragment shaders — use `step()`, `mix()`, `smoothstep()`
- No texture reads inside loops
- Two-pass approach for blur effects (horizontal then vertical)

## Cross-Platform
- Test shaders on minimum spec target hardware
- Provide fallback/simplified versions for lower quality tiers
- Document which render pipeline the shader targets (Forward/Deferred, URP/HDRP, Forward+/Mobile/Compatibility)
- Do not mix shaders from different render pipelines in the same directory

## Variant Management
- Minimize shader variants — each variant is a separate compiled shader
- Document all keywords/variants and their purpose
- Use feature stripping where possible to reduce build size
- Log and monitor total variant count per shader

## Anti-Patterns

- Full precision (`highp`) everywhere on mobile (use `mediump`/`lowp` where possible)
- Dynamic branching on per-pixel data (unpredictable GPU performance)
- Not using mipmaps on textures sampled at varying distances (aliasing + cache thrashing)
- Overdraw from transparent objects without depth pre-pass
- Post-processing that samples screen texture multiple times (use multi-pass approach)
- Not setting `render_priority` on transparent materials (incorrect sort order)
- Texture reads inside loops (exponential GPU cost)

## Cross-References

- Agent: `godot-shader-specialist` — Godot shader authoring
- Agent: `technical-artist` — shader workflow and pipeline
- Agent: `performance-analyst` — GPU performance profiling
- Agent: `art-director` — visual direction constraints
- Rule: `engine-code.md` — rendering pipeline dependency
