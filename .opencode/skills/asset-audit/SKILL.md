---
name: asset-audit
description: "Audits game assets for compliance with naming conventions, file size budgets, format standards, and pipeline requirements. Identifies orphaned assets, missing references, and standard violations."
argument-hint: "[category|all] [--fix]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Write, Bash, Task, question
---

## Phase 1: Read Standards

Read the art bible or asset standards from the relevant design docs:

- `design/art/art-bible.md` — visual and naming standards
- `design/gdd/asset-manifest.md` — expected asset list if it exists
- `.opencode/rules/data-files.md` — data file standards
- `AGENTS.md` — project naming conventions

If no art bible exists, note: "No art bible found. Auditing against general game industry conventions." and proceed.

---

## Phase 2: Scan Asset Directories

Use Glob to index all asset files in the target scope. Scan these directories:

```
Glob pattern="assets/art/**/*.{png,jpg,svg,psd,tres,tscn}" (art)
Glob pattern="assets/audio/**/*.{ogg,mp3,wav,flac}" (audio)
Glob pattern="assets/vfx/**/*.{tscn,tres,gdshader}" (VFX)
Glob pattern="assets/shaders/**/*.{gdshader,tres}" (shaders)
Glob pattern="assets/data/**/*.{json,yaml,csv,tres}" (data)
```

If the argument specifies a category (e.g., `art`), limit to that directory.

For each file found, use Bash `stat` (or Node.js `fs.statSync` equivalent via Execute) to record file size.

---

## Phase 3: Run Compliance Checks

### 3a: Naming Conventions

Check each file against the expected naming pattern:
- Art: `[category]_[name]_[variant]_[size].{png,jpg}` (e.g., `char_player_idle_256.png`)
- Audio: `[category]_[context]_[name]_[variant].{ogg,mp3}` (e.g., `sfx_combat_sword_hit_01.ogg`)
- Shaders: `[type]_[category]_[name].gdshader` (e.g., `spatial_env_water.gdshader`)
- All files must use lowercase with underscores, no spaces
- No special characters in filenames (hyphens acceptable in specific conventions)

Flag violations with the file path and the specific rule broken.

### 3b: File Size Budgets

Check file sizes against budget thresholds using Bash:

```
Bash: find assets/art -name "*.png" -exec stat --format="%s %n" {} \;
```

| Category | Budget per file | Budget total |
|----------|----------------|--------------|
| Textures (UI) | < 512 KB | < 5 MB |
| Textures (3D models) | < 4 MB | < 100 MB |
| Audio (SFX) | < 256 KB | < 20 MB |
| Audio (music) | < 10 MB | < 100 MB |
| Shaders | < 10 KB | < 200 KB |
| Data files | < 1 MB | < 10 MB |

Flag files exceeding their budget. Calculate total category size and flag if exceeding total budget.

### 3c: Format Verification

- Textures: Check for power-of-two dimensions (use Bash `identify` from ImageMagick if available, or note manual verification needed)
- Audio: Expected format — OGG for SFX, OGG/MP3 for music. Flag `.wav` files (should be compressed for shipping)
- Data: Validate JSON with `Bash: python -m json.tool file.json` (dry-run). Validate YAML with Grep for common errors
- Shaders: File extension must match `shader_type` declaration in `.gdshader` files

### 3d: Orphaned Assets

For each asset file, search code and scene files for references. For art/audio assets, search for the filename without extension:

```
Grep pattern="asset_name" path="src/" (game code)
Grep pattern="asset_name" path="assets/" (scene references)
Grep pattern='"asset_name"' path="assets/data/" (data file references)
```

Flag any asset with zero references as orphaned. For `.tres` and `.tscn` files, also check if they're loaded by other resources.

### 3e: Missing Assets

Search code for asset references and verify the files exist:

```
Grep pattern='load\("res://' path="src/" (GDScript Resource loads)
Grep pattern='GD.Load<' path="src/" (C# Resource loads)
Grep pattern='preload\("res://' path="src/" (preload statements)
```

For each `res://` reference found, verify the file exists at that path using Glob. Flag any reference where the file doesn't exist.

---

## Phase 4: Delegate Specialist Review

Spawn specialist agents via Task in **parallel**:

- **Art assets** → spawn `technical-artist`: provide the naming violations and size violations. Ask for:
  - Verification that flagged issues are actually problems (not intentional exceptions)
  - Texture format and compression recommendations for flagged files
  - Priority ranking: which violations affect performance most

- **Audio assets** → spawn `sound-designer`: provide the audio format and naming issues. Ask for:
  - Format recommendations for flagged files
  - Whether flagged sample rates are intentional

- **Data files** → spawn `systems-designer`: provide the data file issues. Ask for:
  - Schema validation for game data files
  - Whether flagged orphaned/missing data files affect game balance

Collect all specialist outputs. Surface any disagreements between specialists and your own findings to the user via `question`.

---

## Phase 5: Output Audit Report

Present the synthesized report:

```markdown
# Asset Audit Report — [Category] — [Date]

## Summary
- **Total assets scanned**: [N]
- **Naming violations**: [N]
- **Size violations**: [N]
- **Format violations**: [N]
- **Orphaned assets**: [N]
- **Missing assets**: [N]
- **Specialist review**: [technical-artist / sound-designer / systems-designer findings]
- **Overall health**: [CLEAN / MINOR ISSUES / NEEDS ATTENTION / CRITICAL]

## Naming Violations
| File | Expected Pattern | Issue | Specialist Note |
|------|-----------------|-------|-----------------|

## Size Violations
| File | Budget | Actual | Overage | Specialist Note |
|------|--------|--------|---------|-----------------|

## Format Violations
| File | Expected Format | Actual Format | Specialist Note |
|------|----------------|---------------|-----------------|

## Orphaned Assets (no code references found)
| File | Last Modified | Size | Recommendation |
|------|-------------|------|---------------|

## Missing Assets (referenced but not found)
| Reference Location | Expected Path | Severity |
|-------------------|---------------|----------|

## Recommendations
| Priority | Issue | Action | Owner |
|----------|-------|--------|-------|

## Verdict: [COMPLIANT / WARNINGS / NON-COMPLIANT]
```

Ask: "May I write this audit report to `production/qa/asset-audit-[category]-[date].md`?"

If yes, write the file (create `production/qa/` directory if needed).

If the user passed `--fix`, offer to apply automated fixes (rename files, flag for manual conversion). Do NOT delete orphaned assets without explicit confirmation.

---

## Phase 6: Next Steps

- Fix naming violations using the patterns defined in AGENTS.md or art bible
- Delete confirmed orphaned assets after manual review (never auto-delete)
- Run `/content-audit` to cross-check asset counts against GDD-specified requirements
- Run `/asset-spec system:[relevant-system]` if audit reveals missing assets that need production
- Re-run `/asset-audit` after fixes to verify cleanliness
