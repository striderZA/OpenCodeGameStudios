# Skill Test Spec: /init-template

## Skill Summary

`/init-template` initializes a cloned OCGS template by collecting project identity/engine/team details, installing framework modules, replacing README and updating project configuration, cautiously clearing only safe internal files, optionally resetting git, and summarizing setup. Its module installer is `.opencode/modules/install.mjs`; `--pi` targets `.agents/`. It asks for missing inputs and for optional destructive git reset; completion verdict is the initialization summary.

## Static Assertions (Structural)

- [ ] Frontmatter includes `name`, `description`, `argument-hint`, `user-invocable`, `allowed-tools`
- [ ] Has ≥2 phase headings
- [ ] Contains completion verdict language
- [ ] Uses questions/approval for missing project details and optional git reset
- [ ] Handoff includes `/setup-engine`, `/concept-brainstorm`, and `/start`
- [ ] Uses `.opencode/modules/install.mjs`; `--pi` installs into `.agents/`
- [ ] Destructive cleanup checks for user content and warns/skips rather than destroying it

## Director Gate Checks

None.

## Test Cases

### Case 1: Happy Path — OpenCode target with provided arguments

**Fixture:** Cloned template; arguments include `--name "My Game" --engine godot`.

**Input:** `/init-template --name "My Game" --engine godot`

**Expected:** Skips name/engine prompts, runs module installer via `.opencode/modules/install.mjs`, initializes identity/config, preserves guarded user content, and presents completion summary and next steps.

### Case 2: Missing identity details

**Fixture:** No name or engine arguments.

**Input:** `/init-template`

**Expected:** Asks for project identity, engine, genre, and team details before continuing.

### Case 3: Boundary — Pi target

**Fixture:** User requests Pi-target installation.

**Input:** `/init-template --name "My Game" --engine godot`

**Expected:** Uses `node .opencode/modules/install.mjs add core --pi` to install into `.agents/`, not the OpenCode target directory.

### Case 4: Existing user files / reset declined

**Fixture:** `design/`, `src/`, or `production/` contains user-created content; user declines optional git reset.

**Input:** `/init-template --reset-git`

**Expected:** Warns and skips destructive cleanup of populated directories; does not reset history without user agreement.

## Verdict

Expected verdict keyword: **✅ Template initialized** (completion summary).