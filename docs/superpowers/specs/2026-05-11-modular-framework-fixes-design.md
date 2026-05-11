# Modular Framework: Post-Review Fixes

**Date:** 2026-05-11
**Branch:** `feat/modular-framework`
**Author:** Code Review feedback implementation

## Problem Statement

The code review of the `feat/modular-framework` branch identified 5 issues in the new modular framework infrastructure. These are technical debt items in the build tooling and module manifests — not game code bugs, but structural issues that affect maintainability, correctness, and user experience.

## Scope

This spec covers fixes to the following files only:
- `.opencode/modules/install.mjs`
- `.opencode/modules/seed-installed.mjs` (if duplicated logic)
- `tools/seed-installed.mjs`
- All 19 `modulefile.yaml` manifests
- `tests/modules/validate-modules.mjs` (if CI scope is addressed)
- New: `tools/lib/parse-modulefile.mjs`

No changes to:
- Skill content, agent definitions, or command files within modules
- The migration tools (`tools/migrate-to-modules.mjs`, `tools/create-module-dirs.mjs`)
- CI workflow file structure (only add/remove a condition if Issue 5 is done)

## Design

### Issue 1: DRY — Duplicate YAML Parser

**Problem:** `install.mjs` and `seed-installed.mjs` each contain identical copies of `parseFlowList()` and `parseModulefile()` (~50 lines each).

**Solution:** Extract to shared module.

**New file:** `tools/lib/parse-modulefile.mjs`
- Exports: `parseFlowList(str)`, `parseModulefile(text)`
- Pure functions, no side effects, no file I/O
- Re-usable by any tool script

**Changes:**
- `install.mjs`: Remove inline parser, `import` from `../../tools/lib/parse-modulefile.mjs`
- `seed-installed.mjs`: Remove inline parser, `import` from `../../tools/lib/parse-modulefile.mjs`

**Edge cases:**
- Path resolution: `install.mjs` is at `.opencode/modules/install.mjs`, shared lib at `tools/lib/parse-modulefile.mjs` — relative import works from both callers
- No circular dependencies: neither file currently imports each other

### Issue 2: Empty dependency declarations

**Problem:** All 19 `modulefile.yaml` have `depends: []` but every module relies on `core`.

**Solution:** Update manifests to declare real dependencies.

| Module | Depends on | Reasoning |
|--------|-----------|-----------|
| `core` | `[]` | Foundation module, no deps |
| `data` | `[core]` | Needs framework conventions |
| `architecture` | `[core]` | Uses core ADR skills |
| `design` | `[core]` | Uses core skills |
| `stories` | `[core, design]` | Story workflow references design docs |
| `programming` | `[core]` | Uses core director agents |
| `ui` | `[core]` | Uses core director agents |
| `audio` | `[core]` | Uses core director agents |
| `narrative` | `[core]` | Uses core director agents |
| `level-design` | `[core]` | Uses core director agents |
| `qa` | `[core]` | Uses core director agents |
| `release` | `[core]` | Uses core director agents |
| `prototyping` | `[core]` | Uses core director agents |
| `live-ops` | `[core]` | Uses core director agents |
| `localization` | `[core]` | Uses core director agents |
| `art` | `[core]` | Uses core director agents |
| `engine-godot` | `[core]` | Agent definitions reference core types |
| `engine-unity` | `[core]` | Same |
| `engine-unreal` | `[core]` | Same |

**Secondary effect:** `install.mjs` currently only *warns* on missing dependencies. After this change, the warnings become actionable. No behavior change needed yet — just accurate metadata.

### Issue 3: `--force` flag for `install.mjs add`

**Problem:** When running `install.mjs add <module>` and a target file already exists, it silently skips (`SKIP` log). No way to overwrite.

**Solution:** Add `--force` flag.

**Behavior:**
- Default (no `--force`): current behavior — skip existing files, log `SKIP`
- With `--force`: re-copy even if dest exists, log `UPDATE` instead of `SKIP`
- Before overwriting, compute MD5 hash of both files. If identical, log `SAME` (no unnecessary write). If different, log `UPDATE` and overwrite.

**Interface:**
```
node .opencode/modules/install.mjs add --force module-name
```
OR
```
node .opencode/modules/install.mjs add module-name --force
```

Both positions accepted. `--force` applies to all modules in the same `add` command.

**Changes to `walkAndCopy`:**
```diff
- if (existsSync(destPath)) { log('SKIP', ...); }
+ if (existsSync(destPath)) {
+   if (force) {
+     const same = filesMatch(srcPath, destPath);
+     if (same) { log('SAME', ...); } 
+     else { copyFileSync(srcPath, destPath); log('UPDATE', ...); }
+   } else { log('SKIP', ...); }
+ }
```

**Helper:** `filesMatch(a, b)` — reads both, compares Buffer contents. No external dependency (no `crypto` needed — Buffer.compare is sufficient).

### Issue 4: Seeded installed.json has empty file lists

**Problem:** `seed-installed.mjs` writes `files: []` for every module. If someone then runs `remove`, the CLI has no file list to delete. Only the `installed.json` entry is removed, leaving all files on disk.

**Solution:** After seeding, walk the installed file tree and record paths.

**Changes to `seed-installed.mjs`:**
1. Define the same `INSTALL_SUBDIRS` and `SKIP_DIRS` as `install.mjs`
2. For each module, walk its subdirectory contents mapped to install destinations
3. Record relative paths (relative to `.opencode/`) in `files`
4. Write complete `installed.json`

**Algorithm:**
```
for each module:
  for each subdir in [agents, skills, commands, rules, plugins, docs]:
    if subdir exists in module dir:
      for each file in subdir:
        compute dest = .opencode/<subdir>/<filepath>
        record dest in files[]
```

**Also fix existing `installed.json`:** Regenerate it with correct file lists by running the updated seed script.

### Issue 5 (Optional): CI validates all 19 modules on every push

**Problem:** Every push to `development` runs full validation of all 19 modules.

**Options considered:**
- **A) Accept as-is:** The validation is fast (148 lines, no deps, pure file-system checks). Run time is <2s. Not worth optimizing.
- **B) Filter to changed modules:** Complex — requires diffing against base, mapping changed files to modules, and passing to validator. Adds CI complexity.
- **C) Only run on module-related changes:** Gate job with `paths:` filter on `.opencode/modules/**`, `tests/modules/**`.

**Recommendation:** Option A (trivial runtime). Option C as a lightweight enhancement if desired.

## Files Modified

| File | Change |
|------|--------|
| `tools/lib/parse-modulefile.mjs` | **NEW** — shared YAML parser |
| `.opencode/modules/install.mjs` | Import shared parser; add `--force` flag |
| `tools/seed-installed.mjs` | Import shared parser; populate file lists |
| `.opencode/modules/installed.json` | Regenerate with populated file lists |
| `.opencode/modules/*/modulefile.yaml` (18 files) | Add `depends: [core]` |
| `.opencode/modules/core/modulefile.yaml` | Ensure `depends: []` (no change needed) |

## Success Criteria

1. `node tools/seed-installed.mjs` produces `installed.json` with non-empty `files` arrays
2. `node .opencode/modules/install.mjs list` still works (no regression)
3. `node .opencode/modules/install.mjs add --force existing-module` overwrites files and logs `UPDATE`
4. `node .opencode/modules/install.mjs add existing-module` (without `--force`) still skips and logs `SKIP`
5. `node tests/modules/validate-modules.mjs` passes with updated `depends` fields
6. No functional regressions in `add`, `remove`, `list`, `info` commands
