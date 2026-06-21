---
name: art-generate
description: "Generates placeholder .aseprite files from asset specs using the Aseprite MCP. Reads asset specs and art bible, creates sprites with correct dimensions/palette/layers, exports PNGs. Run after /asset-spec has produced specs and /art-bible exists."
argument-hint: "[system:<name> | level:<name> | character:<name> | path/to/spec.md]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Write, Edit, Task, question
---

If no argument is provided, read `design/assets/asset-manifest.md`:
- If it exists: find the first target with any asset at `Status: Needed` and use `question`:
  - Prompt: "The next unspecced target is **[target]**. Generate placeholder art for it?"
  - Options: `[A] Yes — generate for [target]` / `[B] Pick a different target` / `[C] Stop here`
- If no manifest: fail with:
  > "No asset manifest found. Run `/asset-spec [target]` first — I need asset specs to generate art from."

---

## Phase 0: Parse Target

Resolve the target:
1. If argument matches `system:<name>` → spec at `design/assets/specs/[name]-assets.md`
2. If argument matches `level:<name>` → spec at `design/assets/specs/[name]-assets.md`
3. If argument matches `character:<name>` → spec at `design/assets/specs/[name]-assets.md`
4. If argument is a path → read that file directly
5. If argument is a path to a .md file → treat as spec file

Fail if the spec file does not exist:
> "No asset spec found at `[path]`. Run `/asset-spec [target]` first."

---

## Phase 1: Gather Context

Read all source material before generating anything.

### Required reads:
- **Asset spec**: Read the resolved spec file. Extract all `ASSET-NNN` entries. For each, extract: Category, Dimensions, Format, Naming, Visual Description.
- **Art bible**: Read `design/art/art-bible.md` — fail if missing:
  > "No art bible found. Run `/art-bible` first — I need the palette and shape language to generate art."
  Extract: Color System (Section 2), Shape Language (Section 3), Asset Standards (Section 8 — dimension tiers).
- **Asset manifest**: Read `design/assets/asset-manifest.md` — note which assets already have placeholders. Filter to assets with `Status: Needed`.

### Present context summary:
> **art-generate: [Target Type] — [Target Name]**
> - Spec: [path] — [N] assets identified
> - Art bible: found — [N] palette colors, shape language: [style]
> - Assets to generate: [N] (filtered from [N] total — [N] already have placeholders)
> - Output: assets/source/[target]/ and assets/sprites/[target]/

---

## Phase 2: Per-Asset Generation

For each asset with `Status: Needed`, execute the following pipeline. **Process one asset at a time — do NOT batch MCP calls.**

### Step 2a: Create Canvas

Construct the filename as `assets/source/[target]/[naming]` (replace `.png` or similar with `.aseprite`).

Use the `create_canvas` MCP tool:
```
create_canvas(width, height, filename)
```

Wait for success. If it fails, stop this asset and report.

### Step 2b: Apply Palette

Load the art bible palette. If the art bible specifies a named palette resource (e.g., "DB16", "RPG"), use:

```
load_palette_from_resource(filename, resource_name)
```

Otherwise extract hex colors from the art bible's Color System section and apply:

```
set_palette(filename, [hex_colors_array])
```

### Step 2c: Create Layer Structure

Create layers matching the asset category template:

**Sprite / 2D Art:**
```
add_layer(filename, "body")
set_layer(filename, "body")
set_layer_label_color(filename, "body", color_hex)
add_layer(filename, "details")
add_layer(filename, "outline")
```

**UI Icon:**
```
add_layer(filename, "icon")
```

**VFX:**
```
add_layer(filename, "core")
set_layer_blend_mode(filename, "core", "normal")
add_layer(filename, "glow")
set_layer_blend_mode(filename, "glow", "add")
add_layer(filename, "sparks")
```

**Environment:**
```
add_layer(filename, "base")
add_layer(filename, "shading")
add_layer(filename, "details")
```

**Character Sprite:**
```
add_layer(filename, "body")
add_layer(filename, "head")
add_layer(filename, "arms")
add_layer(filename, "legs")
add_layer(filename, "outline")
```

### Step 2d: Draw Placeholder Content

Draw shapes on each layer following the art bible's shape language. Use the semantic color from the art bible for the asset's role.

General approach per layer:
1. `set_layer(filename, layer_name)` — activate the layer
2. `set_frame(filename, 1)` — draw on frame 1
3. Draw shapes:
   - **Body/base**: Fill a rectangle/circle/polygon covering ~80% of the canvas at the body center position
   - **Details**: Smaller shapes offset from center, using secondary/accent colors from the palette
   - **Outline**: Thin rectangle around the body bounds using a dark color

Use these drawing tools as appropriate:
- `draw_rectangle_at(filename, layer, frame, x, y, w, h, color, fill=true)` for blocky shapes
- `draw_circle_at(filename, layer, frame, cx, cy, r, color, fill=true)` for round shapes
- `draw_polygon(filename, layer, frame, points, color, fill=true)` for angular shapes (character limbs)
- `fill_area_at(filename, layer, frame, cx, cy, color)` for filled regions
- `apply_gradient_rect(filename, layer, frame, x, y, w, h, start, end, horizontal)` for gradient fills

### Step 2e: Handle Animation

If the spec indicates multiple frames (e.g., "4-frame sprite sheet"):

```
add_frames(filename, count=3, duration_ms=200)  # frame 1 already exists
set_frame_duration(filename, 1, 200)
```

For each additional frame, duplicate frame 1 and add minor position offsets for limbs:
```
copy_frame(filename, source_frame=1, target_frame=N)
```

Then tag the animation:
```
set_tag(filename, name="default", from_frame=1, to_frame=N, direction="forward")
```

If not animated, skip this step.

### Step 2f: Export

```
export_sprite(filename, output_path="assets/sprites/[target]/[naming]")
```

### Step 2g: Verify

Use the quality tools to check the output:

```
validate_scene(filename, required_layers=[list from step 2c])
```

Expected: JSON confirming all layers and frames exist.

Also verify the exported file exists:
```
Test-Path "assets/sprites/[target]/[naming]"
```

Expected: `True`

### Error Handling

If any MCP tool call fails:
```
Question: "Tool [tool_name] failed for ASSET-[NNN] ([asset name]): [error]. Options:"
A) Retry this asset
B) Skip this asset, continue with next
C) Stop generation entirely
```

---

## Phase 3: Update Manifest

After all assets are generated (or after partial completion), update `design/assets/asset-manifest.md`.

For each generated asset, change its status from `Needed` to `Placeholder Created`. Add a `Source` column if it doesn't exist:

```
| ASSET-001 | hero-sprite | Sprite | Placeholder Created | design/assets/specs/hero-assets.md | assets/source/hero/ASSET-001-hero-sprite.aseprite |
```

If the manifest doesn't have a `Source` column yet, rewrite the header to include it.

---

## Phase 4: Summary Report

Present a completion summary:

> **art-generate complete for [target]:**
> - [N]/[M] assets generated successfully
> - [N] failed (skipped)
> - Output: assets/source/[target]/ (source .aseprite files)
> - Output: assets/sprites/[target]/ (exported PNGs)
> - Manifest updated: design/assets/asset-manifest.md

---

## Phase 5: Next Steps

Use `question`:
- Prompt: "Placeholder art generated for **[target]**. What's next?"
- Options:
  - `[A] Generate another target — /art-generate [next-target]`
  - `[B] Run /asset-audit — validate generated assets against specs`
  - `[C] Review generated art manually`
  - `[D] Stop here`

---

## Per-Category Drawing Templates

### Sprite / 2D Asset (Default)

```
Canvas: spec dimensions (e.g. 256x256)
Layers: body, details, outline

Frame 1:
  layer=body:   fill_rect(32, 32, 192, 192, body_color)
  layer=details: draw_rect(48, 48, 160, 160, accent_color, fill=false)
  layer=outline: draw_rect(30, 30, 196, 196, outline_color, fill=false)
```

### UI Icon

```
Canvas: 32x32 or 64x64
Layers: icon

Frame 1:
  layer=icon: fill_rect(4, 4, 24, 24, palette[0])
```

### VFX

```
Canvas: matching target sprite dimensions
Layers: core, glow, sparks

Frame 1:
  layer=core: circle(center, radius*0.3, core_color, fill=true)
  layer=glow: circle(center, radius, glow_color, fill=true, set opacity=128)
```

### Environment Prop

```
Canvas: tile dimensions
Layers: base, shading, details

Frame 1:
  layer=base: fill_rect(0, 0, w, h, base_color)
  layer=shading: gradient_rect(0, 0, w, h, shade_top, shade_bottom)
```

### Character Sprite

```
Canvas: sprite sheet width, frame height
Layers: body, head, arms, legs, outline

Frame 1 (idle pose):
  layer=body:   fill_rect(24, 40, 16, 24, body_color)
  layer=head:   fill_rect(28, 24, 8, 12, skin_color)
  layer=arms:   fill_rect(16, 44, 8, 8, skin_color)
               draw_rect(40, 44, 8, 8, skin_color)
  layer=legs:   fill_rect(24, 64, 6, 12, leg_color)
               fill_rect(34, 64, 6, 12, leg_color)
  layer=outline: draw_rect(22, 22, 20, 54, outline)

Frame 2 (walk frame 1): copy_frame(1, 2)
  layer=legs: offset legs by +2 on x to show stride
```

---

## Error Recovery

| Error | Recovery |
|-------|----------|
| Spec file not found | Fail with clear message pointing to /asset-spec |
| Art bible not found | Fail — generation without palette produces wrong colors |
| MCP tool timeout | Report tool + args that failed, offer retry/skip/stop |
| Palette resource unknown | Fall back to `set_palette` with hex colors from art bible |
| Export fails | Check file path permissions, suggest manual export |
| validate_scene fails | Report which layers/frames are missing, offer to fix via ensure_layers_present |

## Collaborative Protocol

- Never generate without user confirming the target
- Report each asset's success/failure immediately after processing it
- Write the manifest update only after explicit approval
- If the art bible's palette has changed since the spec was written, ask which to use
