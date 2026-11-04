# Skill Test Spec: /automated-smoke-test

## Skill Summary

`/automated-smoke-test` uses the godot-mcp server to inspect and launch the Godot project, capture/debug-scan output, stop the project, and present a structured report. It does not write a report file unless asked. Its verdict is PASS, FAIL, or SILENT-FAIL. Successful smoke testing hands off to `/smoke-check` as appropriate; automated output does not replace manual verification where required.

## Static Assertions (Structural)

- [ ] Frontmatter includes `name`, `description`, `argument-hint`, `user-invocable`, `allowed-tools`
- [ ] Has ≥2 phase headings
- [ ] Contains verdict keywords: PASS, FAIL, SILENT-FAIL
- [ ] No “May I write” requirement for the default report (file write only when asked)
- [ ] Handoff references `/smoke-check`
- [ ] Requires godot-mcp; unavailable server stops test and reports setup instructions

## Director Gate Checks

None.

## Test Cases

### Case 1: Happy Path — Clean substantive output

**Fixture:** Godot project and godot-mcp available; project launches and produces substantive debug output without errors.

**Input:** `/automated-smoke-test 10`

**Expected:** Reads project info, runs for requested duration, polls output, stops project, presents report with PASS; does not save report unless asked.

### Case 2: Missing MCP server

**Fixture:** godot-mcp unavailable.

**Input:** `/automated-smoke-test`

**Expected:** Reports unavailable server with install/configuration guidance and stops before project actions.

### Case 3: Boundary — empty output

**Fixture:** Project launches successfully but produces empty or trivially short output.

**Input:** `/automated-smoke-test 10`

**Expected:** Reports SILENT-FAIL and recommends manual verification; does not label it PASS.

### Case 4: Runtime failure and handoff

**Fixture:** Project starts but debug output includes an error/crash/assertion.

**Input:** `/automated-smoke-test 15`

**Expected:** Stops project, reports FAIL with matching lines, then hands off to `/smoke-check` for the framework smoke-check path.

## Verdict

Expected verdict keywords: **PASS**, **FAIL**, **SILENT-FAIL**.