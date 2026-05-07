# Aseprite MCP Integration Design

> **Status:** Draft
> **Date:** 2026-05-06
> **Context:** Integrate the [aseprite-mcp](https://github.com/striderZA/aseprite-mcp) server into the OCGS workflow for programmatic art generation from asset specs.

## 1. Motivation

The OCGS workflow currently has three art-focused skills:

| Skill | Function |
|-------|----------|
| `art-bible` | Defines visual identity, palette, shape language, asset standards |
| `asset-spec` | Generates per-asset visual specs with dimensions, format, naming |
| `asset-audit` | Validates delivered assets against specs |

There's a gap: **no skill creates the actual art files.** An agent can describe what art to make and check if it exists, but can't make it. The Aseprite MCP closes this gap by allowing programmatic sprite creation, drawing, animation, and export from within an agent session.

## 2. Architecture

### 2.1 Git Submodule

```
tools/aseprite-mcp/  →  https://github.com/striderZA/aseprite-mcp.git
```

Pinned to a specific commit/tag for reproducible builds. `ASEPRITE_PATH` is set via environment variable in the MCP config (not hardcoded in the repo).

### 2.2 Project-Level MCP Config

Added to `opencode.json` alongside the existing Godot MCP entry (which remains disabled by default):

```json
"mcp": {
  "aseprite": {
    "type": "local",
    "command": ["uv", "--directory", "tools/aseprite-mcp", "run", "--no-sync", "-m", "aseprite_mcp"],
    "enabled": true,
    "environment": {
      "ASEPRITE_PATH": "E:\\Jaco\\Projects\\Godot\\aseprite\\build\\bin\\aseprite.exe"
    }
  },
  "godot": {
    "type": "local",
    "command": ["npx", "@coding-solo/godot-mcp"],
    "enabled": false,
    "env": {
      "GODOT_PATH": "E:\\Jaco\\Projects\\Godot\\engine\\godot.exe",
      "DEBUG": "true"
    }
  }
}
```

The Aseprite MCP's 60+ tools become available to any agent in the project when this config is live.

### 2.3 Skill: `art-generate`

New skill at `.opencode/skills/art-generate/SKILL.md`. Creates .aseprite files from asset specs.

## 3. Skill Design: `art-generate`

### 3.1 Invocation

```
/art-generate system:<name>
/art-generate level:<name>
/art-generate character:<name>
/art-generate path/to/spec-file.md
```

No argument → reads `design/assets/asset-manifest.md` and finds the first target with `Needed` assets.

### 3.2 Phase 0: Parse Target & Gather Context

**Reads:**
- The asset spec file (e.g., `design/assets/specs/[target]-assets.md`) — extracts all ASSET-NNN entries with their fields
- `design/art/art-bible.md` — extracts palette (Section 2), shape language (Section 3), asset standards (Section 8)
- `design/assets/asset-manifest.md` — checks which assets already have placeholders

**Output:** list of assets to generate, filtered to `Status: Needed`.

### 3.3 Phase 1: Per-Asset Generation

For each asset, this pipeline executes via Aseprite MCP tools:

```
1. create_canvas(width, height, filename)
2. set_palette(filename, colors)          # from art bible palette
3. add_layer(filename, "body")
   add_layer(filename, "details")
   add_layer(filename, "outline")         # layer structure per category template
4. draw or fill shapes on each layer       # programmatic, based on shape language
5. set_tag(filename, "idle", 1, N)         # if multi-frame
6. export_sprite(filename, output_path)    # PNG export
```

#### Category Templates

**Sprite / 2D Asset:**
- Canvas: exact dimensions from spec (e.g., 256x256)
- Layers: body, details, outline
- Body fill: art bible semantic color for the asset's role (e.g., Threat Blue for enemies)
- Detail shapes: secondary color, offset or layered on body
- Outline: dark version of body color on outline layer
- If animated: duplicate frame range, set durations, tag

**UI Icon:**
- Canvas: 32-64px (per art bible asset standards)
- Layers: icon, background (optional)
- Simplified shape matching asset function
- Uses UI palette from art bible Section 6

**VFX:**
- Canvas: dimensions matching target sprite
- Layers: core, glow, sparks
- Core: filled shape with color from VFX section
- Glow: same shape at lower opacity, additive blend mode
- Multi-frame if animated (tween opacity for fade)

**Environment Tile/Prop:**
- Canvas: tile dimensions from spec
- Layers: base, shading, details
- Palette from environment section of art bible

**Character Sprite:**
- Canvas: full sprite sheet dimensions (e.g., 1024x256 for 4 frames)
- Layers: body, head, arms, legs, outline
- Base pose on frame 1
- Duplicate to frame 2-N, offset limbs for walk cycle (rough)
- Tag: idle (1), walk (2-5), etc.

### 3.4 Phase 2: Output & Manifest Update

**Output files:**
```
assets/source/[target]/ASSET-NNN-asset-name.aseprite   # source
assets/sprites/[target]/ASSET-NNN-asset-name.png        # export
```

**Manifest update:**
- Change `Status` from `Needed` to `Placeholder Created`
- Add `Source` column with `.aseprite` path

### 3.5 Phase 3: Verification

For each created asset:
- `validate_scene(filename)` — confirms all required layers and frames exist
- File size check against asset standards
- Dimension check against spec

If validation fails: report the issue, do NOT mark as Placeholder Created.

### 3.6 Agent Routing

- **Main session** (this agent): Executes generation pipeline, writes files, updates manifest
- **`art-director`** (subagent, optional): Consulted for color mapping from art bible to asset categories
- **`technical-artist`** (subagent, optional): Consulted for export format / compression settings

## 4. Directory Changes

| Path | Change | Reason |
|------|--------|--------|
| `tools/aseprite-mcp/` | New — git submodule | Aseprite MCP server source |
| `opencode.json` | Modified — add MCP block | Project-scoped MCP config |
| `.opencode/skills/art-generate/SKILL.md` | New | Art generation skill |
| `assets/source/` | New — per-target dirs | .aseprite source files |
| `assets/sprites/` | New — per-target dirs | Exported PNGs |

## 5. Dependency Map

```
art-bible (palette, shape language, standards)
    ↓
asset-spec (dimensions, format, naming)
    ↓
art-generate (creates .aseprite + exports PNG)  ← NEW
    ↓
asset-audit (validates delivered assets)
```

Each skill feeds into the next. `art-generate` sits between spec and audit — it produces the artifacts that audit validates.

## 6. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Aseprite not installed / wrong path | MCP config has a clear ASEPRITE_PATH error; `opencode.json` validation catches this early |
| Generated art looks bad | Intentional — this is placeholder/prototype art, not production. The value is in correct dimensions, layers, palette, and naming. |
| Aseprite MCP tool failures mid-batch | Phase 3 verification per asset; failed assets are reported without blocking the rest |
| Submodule drift from upstream | Pin to a specific commit; upgrade explicitly via `git submodule update --remote` |
| Python/dependency conflicts | `uv` manages isolated venv; `--no-sync` uses cached deps after initial `uv sync` |

## 7. Out of Scope

- **Production-quality art generation** — this creates placeholders matching spec constraints, not artist-quality assets
- **Asset modification** — `art-generate` only creates new assets; editing existing ones is a future concern
- **Batch generation from multiple specs** — one target per invocation
- **AI image generation integration** — no Stable Diffusion / DALL-E calls; purely procedural art via Aseprite drawing tools
