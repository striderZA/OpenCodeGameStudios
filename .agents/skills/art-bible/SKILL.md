---
name: art-bible
description: "Guided, section-by-section Art Bible authoring. Creates the visual identity specification that gates all asset production. Run after /brainstorm is approved and before /map-systems or any GDD authoring begins."
argument-hint: "[--review full|lean|solo]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Write, Edit, Task, question
---

## Phase 0: Parse Arguments and Context Check

Resolve the review mode (once, store for all gate spawns this run):
1. If `--review [full|lean|solo]` was passed → use that
2. Else read `production/review-mode.txt` → use that value
3. Else → default to `lean`

See `.opencode/docs/director-gates.md` for the full check pattern.

Read `design/gdd/game-concept.md`. If it does not exist, fail with:
> "No game concept found. Run `/brainstorm` first — the art bible is authored after the game concept is approved."

Extract from game-concept.md:
- Game title (working title)
- Core fantasy and elevator pitch
- Game pillars (all of them)
- **Visual Identity Anchor** section if present (from brainstorm Phase 4 art-director output)
- Target platform (if noted)

**Retrofit mode detection**: Glob `design/art/art-bible.md`. If the file exists:
- Read it in full
- For each of the 9 sections, check whether the body contains real content (more than a `[To be designed]` placeholder or similar) vs. is empty/placeholder
- Build a section status table:

```
Section | Status
--------|--------
1. Visual Identity Statement | [Complete / Empty / Placeholder]
2. Color Palette | ...
3. Lighting & Atmosphere | ...
4. Character Art Direction | ...
5. Environment & Level Art | ...
6. UI Visual Language | ...
7. VFX & Particle Style | ...
8. Asset Standards | ...
9. Style Prohibitions | ...
```

- Present this table to the user:
  > "Found existing art bible at `design/art/art-bible.md`. [N] sections are complete, [M] need content. I'll work on the incomplete sections only — existing content will not be touched."
- Only work on sections with Status: Empty or Placeholder. Do not re-author sections that are already complete.

If the file does not exist, this is a fresh authoring session — proceed normally.

Read `.opencode/docs/technical-preferences.md` if it exists — extract performance budgets and engine for asset standard constraints.

---

## Phase 1: Framing

Present the session context and ask two questions before authoring anything:

Use `question` with two tabs:
- Tab **"Scope"** — "Which sections need to be authored today?"
  Options: `Full bible — all 9 sections` / `Visual identity core (sections 1–4 only)` / `Asset standards only (section 8)` / `Resume — fill in missing sections`
- Tab **"References"** — "Do you have reference games, films, or art that define the visual direction?"
  (Free text — let the user type specific titles. Do NOT preset options here.)

If the game-concept.md has a Visual Identity Anchor section, note it:
> "Found a visual identity anchor from brainstorm: '[anchor name] — [one-line rule]'. I'll use this as the foundation for the art bible."

---

## Phase 2: Visual Identity Foundation (Sections 1–4)

These four sections define the core visual language. **All other sections flow from them.** Author and write each to file before moving to the next.

### Section 1: Visual Identity Statement

**Goal**: A one-line visual rule plus 2–3 supporting principles that resolve visual ambiguity.

If a visual anchor exists from game-concept.md: present it and ask:
- "Build directly from this anchor?"
- "Revise it before expanding?"
- "Start fresh with new options?"

**Agent delegation (MANDATORY)**: Spawn `art-director` via Task:
- Provide: game concept (elevator pitch, core fantasy), full pillar set, platform target, any reference games/art from Phase 1 framing, the visual anchor if it exists
- Ask: "Draft a Visual Identity Statement for this game. Provide: (1) a one-line visual rule that could resolve any visual decision ambiguity, (2) 2–3 supporting visual principles, each with a one-sentence design test ('when X is ambiguous, this principle says choose Y'). Anchor all principles directly in the stated pillars — each principle must serve a specific pillar."

Present the art-director's draft to the user. Use `question`:
- Options: `[A] Lock this in` / `[B] Revise the one-liner` / `[C] Revise a supporting principle` / `[D] Describe my own direction`

Write the approved section to file immediately.

### Section 2: Mood & Atmosphere

**Goal**: Emotional targets by game state — specific enough for a lighting artist to work from.

For each major game state (e.g., exploration, combat, victory, defeat, menus — adapt to this game's states), define:
- Primary emotion/mood target
- Lighting character (time of day, color temperature, contrast level)
- Atmospheric descriptors (3–5 adjectives)
- Energy level (frenetic / measured / contemplative / etc.)

**Agent delegation**: Spawn `art-director` via Task with the Visual Identity Statement and pillar set. Ask: "Define mood and atmosphere targets for each major game state in this game. Be specific — 'dark and foreboding' is not enough. Name the exact emotional target, the lighting character (warm/cool, high/low contrast, time of day direction), and at least one visual element that carries the mood. Each game state must feel visually distinct from the others."

Write the approved section to file immediately.

### Section 3: Shape Language

**Goal**: The geometric vocabulary that makes this game's world visually coherent and distinguishable.

Cover:
- Character silhouette philosophy (how readable at thumbnail size? Distinguishing trait per archetype?)
- Environment geometry (angular/curved/organic/geometric — which dominates and why?)
- UI shape grammar (does UI echo the world aesthetic, or is it a distinct HUD language?)
- Hero shapes vs. supporting shapes (what draws the eye, what recedes?)

**Agent delegation**: Spawn `art-director` via Task with Visual Identity Statement and mood targets. Ask: "Define the shape language for this game. Connect each shape principle back to the visual identity statement and a specific game pillar. Explain what these shape choices communicate to the player emotionally."

Write the approved section to file immediately.

### Section 4: Color System

**Goal**: A complete, producible palette system that serves both aesthetic and communication needs.

Cover:
- Primary palette (5–7 colors with roles — not just hex codes, but what each color means in this world)
- Semantic color usage (what does red communicate? Gold? Blue? White? Establish the color vocabulary)
- Per-biome or per-area color temperature rules (if the game has distinct areas)
- UI palette (may differ from world palette — define the divergence explicitly)
- Colorblind safety: which semantic colors need shape/icon/sound backup

**Agent delegation**: Spawn `art-director` via Task with Visual Identity Statement and mood targets. Ask: "Design the color system for this game. Every semantic color assignment must be explained — why does this color mean danger/safety/reward in this world? Identify which color pairs might fail colorblind players and specify what backup cues are needed."

Write the approved section to file immediately.

### Section 4b: Palette Export

After the color system is approved, write machine-readable palette files that tools and AI generators can ingest.

**Agent delegation**: Spawn `art-director` via Task with the approved Color System section. Ask: "Extract the exact palette as a JSON color map. For every named color, provide: hex code, sRGB values (0-255), semantic role name, usage context (world, UI, semantic), and any colorblind-safe backup (icon/shape/sound cue). Include the full primary palette, semantic color vocabulary, and any per-biome/area palette variants."

Write the approved palette data to **two files**:

**`design/art/palette.json`** — Ask "May I export the palette as JSON?"

```json
{
  "name": "[Game Title] — Color Palette",
  "generated": "[date]",
  "art-bible-source": "design/art/art-bible.md",
  "primary": [
    {
      "name": "Example Blue",
      "hex": "#4A90D9",
      "rgb": [74, 144, 217],
      "role": "Primary hero color — used for player character and friendly elements",
      "context": "world"
    }
  ],
  "semantic": [
    {
      "name": "Danger Red",
      "hex": "#D94A4A",
      "rgb": [217, 74, 74],
      "meaning": "Enemy health, warnings, death state",
      "colorblind-backup": "icon (skull symbol)",
      "context": "ui"
    }
  ],
  "variants": [
    {
      "name": "Forest Biome — Cool Shift",
      "palette": ["#2E5E3E", "#4A8B5E", "#6BA37A"],
      "rule": "Subtract 15% saturation from primary palette, add 10% blue channel"
    }
  ]
}
```

**`design/art/palette.css`** — Ask "May I export the palette as CSS custom properties?"

```css
:root {
  /* Primary Palette */
  --color-primary: #4A90D9;
  --color-secondary: #6BA37A;
  --color-accent: #E8C84A;

  /* Semantic Colors */
  --color-danger: #D94A4A;
  --color-safe: #4AD94A;
  --color-rare: #D9A84A;

  /* UI Palette */
  --color-ui-bg: #1A1A2E;
  --color-ui-text: #E0E0E0;
  --color-ui-highlight: #4A90D9;
}
```

Both files together mean: palette.json → 3D tools, palette.css → web/UI prototyping, and both → AI prompts ("use --color-primary as the dominant hue").

---

## Phase 2.5: Production Reference Outputs

These sections produce spec files that bridge visual identity → actual asset production. Each is written to `design/art/` and feeds directly into `/asset-spec` generation.

### Section 4c: Typography Spec

**Goal**: A complete typography system that covers both in-game UI and any marketing/branding materials.

**Agent delegation**: Spawn `art-director` via Task with the Visual Identity Statement and mood targets. Ask: "Design the typography system for this game. Consider: font family recommendations (primary + fallback + monospace), what each font communicates about the game's world, weight hierarchy (headline, body, caption — exact weights), line height ratios, tracking/letter-spacing for UI use, and any custom typographic effects that define the game's text treatment (glow, stroke, distortion). If the game has a specific cultural or period setting, recommend fonts that serve that setting."

Cover:
- **Primary display font** — used for titles, key UI headers, marketing. Name specific font families with fallback chains.
- **Body text font** — used for dialogue, item descriptions, menus. Must be readable at small sizes.
- **Monospace / data font** — used for damage numbers, timers, stats, code-like UI.
- **Size scale** — base size, scale ratio, and named tiers (caption / body / lead / subhead / headline / display)
- **Weight usage** — which weights map to which contexts (e.g., Bold for headers only, Regular for body)
- **Special treatments** — any glow, outline, distortion, or animation applied to text elements
- **Accessibility** — minimum size, contrast ratio against expected backgrounds

Write the approved section to `design/art/art-bible.md` Section 4c. Then ask: "May I export typography as JSON to `design/art/typography.json`?"

```json
{
  "name": "[Game Title] — Typography",
  "generated": "[date]",
  "art-bible-source": "design/art/art-bible.md",
  "fonts": {
    "display": {
      "family": "Cinzel Decorative",
      "fallback": ["Georgia", "serif"],
      "weights": [400, 700, 900],
      "usage": "Titles, chapter headers, key UI"
    },
    "body": {
      "family": "Lora",
      "fallback": ["Palatino", "serif"],
      "weights": [400, 600],
      "usage": "Dialogue, descriptions, menus"
    }
  },
  "scale": {
    "base": "16px",
    "ratio": 1.25,
    "tiers": {
      "caption": "0.75rem",
      "body": "1rem",
      "lead": "1.25rem",
      "subhead": "1.5rem",
      "headline": "2rem",
      "display": "3rem"
    }
  },
  "accessibility": {
    "minimum-size": "14px",
    "minimum-contrast": "4.5:1"
  }
}
```

### Section 4d: Visual Anchor Prompt

**Goal**: A single AI-generation-ready prompt that captures the entire visual identity. Use this as a seed prompt for all subsequent asset generation in `/asset-spec`.

**Agent delegation**: Spawn `art-director` via Task with the complete sections 1-4c (Visual Identity through Typography). Ask: "Write a single comprehensive visual anchor prompt for this game's art style. Structure it for use with AI image generation (Midjourney, Stable Diffusion, DALL-E). The prompt must be modular — use `--style` or `[style fragment]` markers so individual asset prompts can interpolate their subject into the style. Include: art style keywords, color palette anchor (reference the palette.json color names), lighting direction, composition philosophy, camera distance defaults, and strong negative prompts for what this style is NOT. The goal is: pasting this anchor + an asset description into any image generator produces output consistent with the art bible."

Write the anchor to `design/art/style-anchor-prompt.md`:

```markdown
# Visual Anchor Prompt — [Game Title]

> Generated: [date]
> Art Bible: design/art/art-bible.md

## Style Anchor

Use this as a prefix for all asset generations:

```
[style: hand-painted watercolor with bold ink outlines, flat shading,
lighting: soft warm directional from upper-left, no harsh shadows,
colors: --color-primary dominant hue, --color-secondary for environment,
--color-accent for points of interest,
composition: centered subject, negative space breathing room,
detail level: painterly — suggestive not photorealistic,
camera: medium distance, eye-level,
negative: no photorealistic textures, no bloom, no lens flare,
no gritty/dark fantasy tone, no cel-shading outlines, no anime eyes]
```

## Usage

For any asset spec, insert the asset description between the style anchor
and camera/detail instructions:

```
[style anchor as above]
subject: a weathered iron golem standing guard, moss covering its left shoulder,
one eye glowing with --color-accent
[camera/detail instructions]
```

## Per-Biome Variants

| Biome | Palette Shift | Lighting Adjust |
|-------|--------------|-----------------|
| [Forest] | Use --color-secondary variants | Soft dappled light, warm tint |
| [Cave] | Desaturate 30%, add 15% blue | Single hard light source from above |
```

## Phase 3: Production Guides (Sections 5–8)

These sections translate the visual identity into concrete production rules. They should be specific enough that an outsourcing team can follow them without additional briefing.

### Section 5: Character Design Direction

**Agent delegation**: Spawn `art-director` via Task with sections 1–4. Ask: "Define character design direction for this game. Cover: visual archetype for the player character (if any), distinguishing feature rules per character type (how do players tell enemies/NPCs/allies apart at a glance?), expression/pose style targets (stiff/expressive/realistic/exaggerated), and LOD philosophy (how much detail is preserved at game camera distance?)."

Write the approved section to file.

### Section 6: Environment Design Language

**Agent delegation**: Spawn `art-director` via Task with sections 1–4. Ask: "Define the environment design language for this game. Cover: architectural style and its relationship to the world's culture/history, texture philosophy (painted vs. PBR vs. stylized — why this choice for this game?), prop density rules (sparse/dense — what drives the choice per area type?), and environmental storytelling guidelines (what visual details should tell the story without text?)."

Write the approved section to file.

### Section 7: UI/HUD Visual Direction

**Agent delegation**: Spawn in parallel:
- **`art-director`**: Visual style for UI — diegetic vs. screen-space HUD, typography direction (font personality, weight, size hierarchy), iconography style (flat/outlined/illustrated/photorealistic), animation feel for UI elements
- **`ux-designer`**: UX alignment check — does the visual direction support the interaction patterns this game requires? Flag any conflicts between art direction and readability/accessibility needs.

Collect both. If they conflict (e.g., art-director wants elaborate diegetic UI but ux-designer flags it would reduce combat readability), surface the conflict explicitly with both positions. Do NOT silently resolve — use `question` to let the user decide.

Write the approved section to file.

### Section 8: Asset Standards

**Agent delegation**: Spawn in parallel:
- **`art-director`**: File format preferences, naming convention direction, texture resolution tiers, LOD level expectations, export settings philosophy
- **`technical-artist`**: Engine-specific hard constraints — poly count budgets per asset category, texture memory limits, material slot counts, importer constraints, anything from the performance budgets in `.opencode/docs/technical-preferences.md`

If any art preference conflicts with a technical constraint (e.g., art-director wants 4K textures but performance budget requires 2K for mobile), resolve the conflict explicitly — note both the ideal and the constrained standard, and explain the tradeoff. Ambiguity in asset standards is where production costs are born.

Write the approved section to file.

---

## Phase 4: Reference Direction (Section 9)

**Goal**: A curated reference set that is specific about what to take and what to avoid from each source.

**Agent delegation**: Spawn `art-director` via Task with the completed sections 1–8. Ask: "Compile a reference direction for this game. Provide 3–5 reference sources (games, films, art styles, or specific artists). For each: name it, specify exactly what visual element to draw from it (not 'the general aesthetic' — a specific technique, color choice, or compositional rule), and specify what to explicitly avoid or diverge from (to prevent the 'trying to copy X' reading). References should be additive — no two references should be pointing in exactly the same direction."

Write the approved section to file.

---

## Phase 4.5: Reference Image Collection

**Goal**: Find and catalog actual reference images that embody the art bible's visual direction. This turns abstract references ("like Hollow Knight's lighting") into concrete URLs that `/asset-spec` can embed in AI generation prompts.

After the reference direction section is written, gather visual references:

### Step 1: Generate Search Queries

For each reference source named in Section 9, generate 2-3 specific image search queries that target the exact visual element being referenced. Example: instead of "Hollow Knight concept art", use "Hollow Knight Greenpath background lighting warm greens atmospheric".

Use `question` to present the query list:
- Prompt: "I'll search for reference images matching these queries. Each targets a specific visual element from the reference direction."
- Show the query list as conversation text
- Options: `[A] Proceed — search for all of these` / `[B] Add or remove queries` / `[C] Skip — I'll provide images myself`

### Step 2: Fetch and Catalog

For each approved query, use `webfetch` to search for reference images. Target platforms: ArtStation, Pinterest, DeviantArt, or general image search.

The goal is to find:
- Concept art showing the overall style
- Specific technique examples (lighting, color palette usage, shape language)
- "What to avoid" counter-examples

For each successful fetch, extract the page URL and note what visual element it demonstrates. Present findings:

> Found [N] reference pages:
> - [URL] — "Greenpath lighting — warm greens, soft dappled light" — matches §2 Mood targets
> - [URL] — "Character silhouette — horned knight" — matches §3 Shape Language
> - [URL] — "UI mockup — ornate border with gold accents" — matches §7 UI Direction

### Step 3: Write Reference Catalog

Ask: "May I write the reference catalog to `design/art/reference-catalog.md`?"

```markdown
# Reference Image Catalog — [Game Title]

> Generated: [date]
> Art Bible: design/art/art-bible.md

## References by Art Bible Section

### §2 Mood & Atmosphere — Lighting References
| Image URL | Source | Element | Matches |
|-----------|--------|---------|---------|
| [url] | ArtStation | Warm green atmospheric lighting in cave | §2 Exploration mood |
| [url] | Pinterest | Golden hour forest — warm directional light | §2 Combat energy |

### §3 Shape Language — Silhouette References
...

### §9 Reference Direction — Full Scene References
...

## AI Generation Seed URLs

Include these as image reference URLs (`--sref` or `--iw`) when generating:
- [URL 1] — overall style anchor
- [URL 2] — color palette exemplar
- [URL 3] — lighting benchmark
```

---

**Review mode check** — apply before spawning AD-ART-BIBLE:
- `solo` → skip. Note: "AD-ART-BIBLE skipped — Solo mode." Proceed to Phase 6.
- `lean` → skip (not a PHASE-GATE). Note: "AD-ART-BIBLE skipped — Lean mode." Proceed to Phase 6.
- `full` → spawn as normal.

After all sections are complete (or the scoped set from Phase 1 is complete), spawn `creative-director` via Task using gate **AD-ART-BIBLE** (`.opencode/docs/director-gates.md`).

Pass: art bible file path, game pillars, visual identity anchor.

Handle verdict per standard rules in `director-gates.md`. Record the verdict in the art bible's status header:
`> **Art Director Sign-Off (AD-ART-BIBLE)**: APPROVED [date] / CONCERNS (accepted) [date] / REVISED [date]`

---

## Phase 6: Close

Before presenting next steps, check project state:
- Does `design/gdd/systems-index.md` exist? → map-systems is done, skip that option
- Does `.opencode/docs/technical-preferences.md` contain a configured engine (not `[TO BE CONFIGURED]`)? → setup-engine is done, skip that option
- Does `design/gdd/` contain any `*.md` files? → design-system has been run, skip that option
- Does `design/gdd/gdd-cross-review-*.md` exist? → review-all-gdds is done
- Do GDDs exist (check above)? → include /consistency-check option

Use `question` for next steps. Only include options that are genuinely next based on the state check above:

**Option pool — include only if not already done:**
- `[_] Run /map-systems — decompose the concept into systems before writing GDDs` (skip if systems-index.md exists)
- `[_] Run /setup-engine — configure the engine (asset standards may need revisiting after engine is set)` (skip if engine configured)
- `[_] Run /design-system — start the first GDD` (skip if any GDDs exist)
- `[_] Run /review-all-gdds — cross-GDD consistency check (required before Technical Setup gate)` (skip if gdd-cross-review-*.md exists)
- `[_] Run /asset-spec — generate per-asset visual specs and AI generation prompts from approved GDDs` (include if GDDs exist)
- `[_] Run /consistency-check — scan existing GDDs against the art bible for visual direction conflicts` (include if GDDs exist)
- `[_] Run /create-architecture — author the master architecture document (next Technical Setup step)`
- `[_] Stop here`

Assign letters A, B, C… only to the options actually included. Mark the most logical pipeline-advancing option as `(recommended)`.

> **Always include** `/create-architecture` and Stop here as options — these are always valid next steps once the art bible is complete.

---

## Collaborative Protocol

Every section follows: **Question → Options → Decision → Draft (from art-director agent) → Approval → Write to file**

- Never draft a section without first spawning the relevant agent(s)
- Write each section to file immediately after approval — do not batch
- Surface all agent disagreements to the user — never silently resolve conflicts between art-director and technical-artist
- The art bible is a constraint document: it restricts future decisions in exchange for visual coherence. Every section should feel like it narrows the solution space productively.

---

## Recommended Next Steps

After the art bible is approved:
- Run `/map-systems` to decompose the concept into game systems before authoring GDDs
- Run `/setup-engine` if the engine is not yet configured (asset standards may need revisiting after engine selection)
- Run `/design-system [first-system]` to start authoring per-system GDDs
- Run `/consistency-check` once GDDs exist to validate them against the art bible's visual rules
- Run `/create-architecture` to produce the master architecture document
