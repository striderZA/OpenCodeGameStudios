# Skill Test Spec: /autopilot-playtest

## Skill Summary

`/autopilot-playtest` runs Autopilot against the game open in Godot, builds a run-specific harness, and files evidence to `production/qa/playtests/autopilot-[date]-[slug].md` only after asking approval. Automated evidence is never a human playtest or core-fantasy evidence. It requires the Autopilot MCP server to be enabled for the session; if disabled, ask whether to enable it and stop pending answer. Tool names vary: OpenCode `autopilot_start_run`, Pi `mcp__autopilot__start_run`, omp `mcp__autopilot_start_run`.

## Static Assertions (Structural)

- [ ] Frontmatter includes `name`, `description`, `argument-hint`, `user-invocable`, `allowed-tools`
- [ ] Has ≥2 phase headings
- [ ] Contains outcome verdict concepts (CONFIRMED, DENIED, INCONCLUSIVE; goal achieved/not achieved)
- [ ] Asks “May I write” before filing report
- [ ] Next step describes report/findings and bug confirmation via `/bug-report`
- [ ] Default-disabled MCP server is preflighted; skill must not edit config files
- [ ] Explicitly states automated playtest is not a human playtest; harness tool names differ

## Director Gate Checks

None invoked by this skill; results cannot satisfy `gate-check` core-fantasy evidence.

## Test Cases

### Case 1: Happy Path — Verify a gameplay claim

**Fixture:** Godot 4.7+ game open with Autopilot dock connected, server enabled, tools available, privacy sharing off, keys configured.

**Input:** `/autopilot-playtest verify the door opens with the key`

**Expected:** Starts one run, reads run instructions, writes harness, waits for completion, asks before filing to `production/qa/playtests/`, marks findings Unverified (Autopilot), and includes the exact human-playtest disclaimer.

### Case 2: MCP disabled by default

**Fixture:** Autopilot MCP entry exists but is disabled.

**Input:** `/autopilot-playtest explore the level`

**Expected:** Asks whether to enable it for this session, does not edit config, and stops until the user answers.

### Case 3: Boundary — harness tool naming

**Fixture:** Run under Pi or omp, not OpenCode.

**Input:** `/autopilot-playtest goal sell three crops`

**Expected:** Uses the correct harness-specific start tool (`mcp__autopilot__start_run` in Pi; `mcp__autopilot_start_run` in omp), not the OpenCode name.

### Case 4: MCP tools unavailable after preflight

**Fixture:** Server is enabled but start tool remains absent after up to 20 readiness checks.

**Input:** `/autopilot-playtest explore the level`

**Expected:** Stops with the harness-appropriate MCP listing command and asks user to resend once connected; no run/report is fabricated.

## Verdict

Expected outcome keywords: **CONFIRMED**, **DENIED**, **INCONCLUSIVE**, achieved/not achieved; findings remain **Unverified (Autopilot)**.