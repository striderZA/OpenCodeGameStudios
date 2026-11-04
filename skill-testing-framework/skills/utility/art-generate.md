# Skill Test Spec: /art-generate

## Skill Summary

`/art-generate` reads an asset spec, art bible, and manifest, then uses the Aseprite MCP to generate placeholder `.aseprite` source files and exported PNGs for assets marked Needed. It updates the manifest to Placeholder Created and reports partial failures. It asks before choosing an implicit target and before generation/report actions as prescribed; completion verdict means placeholder generation finished, not production-ready art.

## Static Assertions (Structural)

- [ ] Frontmatter includes `name`, `description`, `argument-hint`, `user-invocable`, `allowed-tools`
- [ ] Has ≥2 phase headings
- [ ] Contains verdict keyword: COMPLETE
- [ ] Has collaborative approval language before generating/writing
- [ ] Has next-step handoff to `/asset-audit` or manual review
- [ ] Depends on Aseprite MCP; generated assets are placeholders and must not be represented as final art

## Director Gate Checks

None.

## Test Cases

### Case 1: Happy Path — Needed assets generated

**Fixture:** Valid asset spec, `design/art/art-bible.md`, and manifest with Needed assets; Aseprite MCP available.

**Input:** `/art-generate system:combat`

**Expected:** Processes assets one at a time, creates source `.aseprite` and exported PNG outputs, verifies layers/files, updates manifest status, asks before report/write as required, and returns COMPLETE.

### Case 2: Missing art bible

**Fixture:** Spec and manifest exist; `design/art/art-bible.md` is absent.

**Input:** `/art-generate system:combat`

**Expected:** Stops with instruction to run `/art-bible`; generates nothing.

### Case 3: No manifest target / no argument

**Fixture:** Manifest has no target with `Status: Needed`.

**Input:** `/art-generate`

**Expected:** Does not invent a target or generate assets; reports there is no Needed target.

### Case 4: MCP tool fails for one asset

**Fixture:** Two Needed assets; one MCP call fails.

**Input:** `/art-generate system:combat`

**Expected:** Offers retry, skip, or stop for the failed asset; reports partial outcome accurately and only marks generated assets as Placeholder Created.

## Verdict

Expected verdict keyword: **COMPLETE** when generation/report completes; failures are reported per asset.