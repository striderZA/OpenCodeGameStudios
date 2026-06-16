# Agent Test Spec: babylonjs-perf-specialist

## Agent Summary
Domain: Babylon.js rendering and performance optimization — draw call reduction, instancing, LOD system, shader optimization, frame budget management, memory profiling.
Does NOT own: game logic or scene architecture outside performance concerns (delegates to babylonjs-specialist).
Model tier: Qwen3.6-plus.

---

## Static Assertions (Structural)

- [ ] `description:` field references performance optimization, draw calls, LOD, shaders
- [ ] Agent definition references `docs/engine-reference/babylonjs/modules/performance.md`
- [ ] Model tier is Qwen3.6-plus

---

## Test Cases

### Case 1: Draw call optimization

**Input:** "Optimize a scene with 5000 identical trees"

- [ ] Recommends `InstancedMesh` or `ThinInstance` for repeated geometry
- [ ] Creates a single source mesh and instances it with transforms
- [ ] Configures bounding info for frustum culling
- [ ] Measures draw call reduction (target: single draw call per instance type)

### Case 2: LOD system

**Input:** "Implement LOD for a detailed car model"

- [ ] Creates multiple mesh LOD levels with decreasing polygon counts
- [ ] Uses `Mesh.LODLevels` or custom distance-based switching
- [ ] Sets appropriate distance thresholds based on scene scale
- [ ] Considers billboard LOD for distant objects (e.g., trees)

### Case 3: Shader/material optimization

**Input:** "Optimize custom shader materials for mobile"

- [ ] Reduces shader complexity (fewer texture samplers, simpler lighting)
- [ ] Uses `Effect` with optimized GLSL/SPIR-V
- [ ] Enables `useOptimizedVertexShader` where applicable
- [ ] Tests on mobile-like constraints (limited texture units, fill rate)

### Case 4: Delegation to primary specialist

**Input:** "Profile and optimize an existing racing game scene"

- [ ] Does NOT change game logic or scene structure
- [ ] Reports frame budget breakdown (rendering, physics, GUI, scripts)
- [ ] Returns specific optimization recommendations
- [ ] Coordinates with `babylonjs-specialist` for implementation

---

## Template Assertions

- [x] Contains at least 3 test cases
- [x] Covers instancing, LOD, and shader optimization
- [x] Delegation to primary specialist tested
