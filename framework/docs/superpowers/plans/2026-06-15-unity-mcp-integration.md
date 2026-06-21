# Unity MCP Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add [unity-mcp](https://github.com/CoplayDev/unity-mcp) (by CoplayDev) to the OCGS framework so OCGS agents in Unity projects can interact with a running Unity Editor to read/write scenes, scripts, and assets.

**Architecture:** Add a `unity` MCP entry to `opencode.json` pointing at Unity's local HTTP server (`http://localhost:8080/mcp`). Mirror the existing `godot-mcp` and `aseprite-mcp` integration patterns: disabled by default, documented in `setup-engine` §7.4, referenced by all 5 `engine-unity` specialists. No submodule — Unity MCP is installed inside Unity as a package, not a standalone CLI.

**Tech Stack:** OpenCode MCP config (JSON), Markdown, YAML (module manifests), OCGS plugin validation suite (`tests/agents/validate.mjs`), Python 3.10+ / `uv` (Unity MCP prereq, not in this repo).

---

## File Structure

**Files to modify (10):**
- `opencode.json` — add `unity` MCP block
- `.opencode/skills/setup-engine/SKILL.md` — add §7.4
- `.opencode/modules/core/skills/setup-engine/SKILL.md` — mirror §7.4
- `.opencode/modules/engine-unity/modulefile.yaml` — bump version, update description
- `.opencode/modules/engine-unity/agents/unity-specialist.md` — add MCP ref
- `.opencode/modules/engine-unity/agents/unity-dots-specialist.md` — add MCP ref
- `.opencode/modules/engine-unity/agents/unity-shader-specialist.md` — add MCP ref
- `.opencode/modules/engine-unity/agents/unity-addressables-specialist.md` — add MCP ref
- `.opencode/modules/engine-unity/agents/unity-ui-specialist.md` — add MCP ref
- `UPGRADING.md` — add changelog entry
- `README.md` — add to MCP list (if one exists)

**Files to create (1):**
- `framework/docs/superpowers/plans/2026-06-15-unity-mcp-integration.md` — this plan

**No production code, no new skills, no new tests.** This is a config + docs change. The "test" for each change is the OCGS plugin validation suite (`tests/agents/validate.mjs`) passing.

---

## Task 1: Verify Unity MCP tool list and reconcile with spec

**Files:**
- Read: spec at `framework/docs/superpowers/specs/2026-06-15-unity-mcp-integration-design.md` (Section 4, per-agent tool hints table)
- Verify: live unity-mcp server tool list (out-of-repo, requires Unity Editor running)

**Context:** The spec references specific unity-mcp tool names (`read_console`, `list_scenes`, `manage_script`, `manage_asset`, `manage_scene`, `get_editor_state`, `run_scene`). These tool names come from the upstream docs and the tool groups feature page, but the exact tool list varies between Unity MCP versions. We must verify before writing the agent files so we don't reference tools that don't exist.

- [ ] **Step 1: Open the user's Unity project with the unity-mcp package installed**

If the user has Unity 2021.3 LTS+ and the unity-mcp package installed in their Unity project, open the project in Unity Editor. The MCP for Unity window should be visible: **Window → MCP for Unity**. Status should read "Connected".

If the user has not yet installed the unity-mcp package, follow the install steps in spec §3.1 first:
```
# In Unity: Window → Package Manager → + → Add package from git URL
# Paste: https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#main
# Then: Window → MCP for Unity → "Configure All Detected Clients"
```

- [ ] **Step 2: Query the actual tool list from the running server**

The HTTP endpoint at `http://localhost:8080/mcp` exposes a JSON-RPC `tools/list` method. Query it:

```bash
curl -X POST http://localhost:8080/mcp -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Capture the response. Extract the list of tool names.

Alternative: If `curl` is not available or the endpoint requires streaming, open the MCP for Unity status panel in Unity and look for the tools list (v9.7.0+ shows registered tools in the UI).

- [ ] **Step 3: Reconcile against the spec's per-agent tool hints**

Compare the actual tool list against the spec's table (Section 4). For each per-agent tool hint, mark it as:
- **CONFIRMED** — exact name match
- **NEAR MATCH** — similar name, likely rename (e.g., `read_console` vs `get_console`)
- **MISSING** — tool does not exist; needs replacement

If any tool in the spec is MISSING, find the closest equivalent in the actual tool list and update the spec at `framework/docs/superpowers/specs/2026-06-15-unity-mcp-integration-design.md` Section 4 (and the corresponding agent files in later tasks).

- [ ] **Step 4: Record findings**

Create a temporary note (e.g., in a scratch file or in the PR description) listing the verified tool names. This becomes the source of truth for the agent updates in Tasks 7-11.

- [ ] **Step 5: No commit**

This task does not produce a code change. Move to Task 2.

---

## Task 2: Add `unity` MCP entry to `opencode.json`

**Files:**
- Modify: `opencode.json` (insert after the `godot` MCP entry, lines 20-28)

- [ ] **Step 1: Read the current `opencode.json`**

Run: `Read("opencode.json")` (full file is 57 lines).

Confirm the file structure:
```json
"mcp": {
  "aseprite": { ... },
  "godot": { ... }
}
```

- [ ] **Step 2: Add the `unity` block**

Insert this block as the last entry in the `mcp` object, after the `godot` block:

```json
    "unity": {
      "type": "local",
      "url": "http://localhost:8080/mcp",
      "enabled": false
    }
```

The result should be:

```json
"mcp": {
  "aseprite": {
    "type": "local",
    "command": ["uv", "--directory", "tools/aseprite-mcp", "run", "-m", "aseprite_mcp"],
    "enabled": true,
    "environment": {
      "ASEPRITE_PATH": "{env:ASEPRITE_PATH}"
    }
  },
  "godot": {
    "type": "local",
    "command": ["npx", "@coding-solo/godot-mcp"],
    "enabled": false,
    "environment": {
      "GODOT_PATH": "{env:GODOT_PATH}",
      "DEBUG": "{env:DEBUG}"
    }
  },
  "unity": {
    "type": "local",
    "url": "http://localhost:8080/mcp",
    "enabled": false
  }
}
```

- [ ] **Step 3: Validate the JSON is well-formed**

Run: `node -e "JSON.parse(require('fs').readFileSync('opencode.json', 'utf8')); console.log('OK')"`

Expected: `OK`

- [ ] **Step 4: Run the framework validation suite**

Run: `node tests/agents/validate.mjs 2>&1 | tail -30`

Expected: validation passes (no new errors). If a new error mentions the `unity` MCP entry, the `local` + `url` shape may not be supported — check OpenCode's MCP schema. If the schema requires `command`, fall back to:
```json
    "unity": {
      "type": "local",
      "command": ["echo", "unity-mcp requires Unity Editor running; see setup-engine §7.4"],
      "enabled": false
    }
```
This is a placeholder command that fails fast with a clear message, while still allowing OpenCode to parse the config. Update the spec note about the config shape.

- [ ] **Step 5: Commit**

```bash
git add opencode.json
git commit -m "feat(mcp): add unity MCP entry, disabled by default

Adds the unity MCP block to opencode.json pointing at
http://localhost:8080/mcp, the default endpoint of the CoplayDev
unity-mcp package running inside Unity Editor.

Mirrors the godot MCP pattern: disabled by default because the
server requires Unity Editor to be running. Users opt in via the
setup-engine skill §7.4 (added in the next task)."
```

---

## Task 3: Add §7.4 to `.opencode/skills/setup-engine/SKILL.md`

**Files:**
- Modify: `.opencode/skills/setup-engine/SKILL.md` (insert new section after §7.3, which ends around line 670 based on the modular framework reference)

- [ ] **Step 1: Locate the end of §7.3**

Read `.opencode/skills/setup-engine/SKILL.md` and find the end of section 7.3 (Configure godot-mcp). The next section number should be 7.4.

If the file does not have a 7.3 section yet, or the numbering is different, search for the heading that contains "godot-mcp" or "Coding-Solo" — that's the boundary.

- [ ] **Step 2: Insert §7.4**

Insert this section immediately after §7.3 (or at the appropriate position in the engine setup section):

```markdown
### 7.4. Configure unity-mcp (Optional — Unity Only)

> **What it is:** A bridge between AI agents and Unity Editor via MCP, exposing ~50+ tools for scene, script, and asset management. Maintained by CoplayDev, MIT licensed. See [github.com/CoplayDev/unity-mcp](https://github.com/CoplayDev/unity-mcp).

#### Prerequisites (must be installed first)

- **Unity 2021.3 LTS or newer** — [Download Unity](https://unity.com/download)
- **Python 3.10+** with `uv` — install `uv` via `pip install uv` (or `winget install astral-sh.uv` on Windows)
- **MCP for Unity package** installed in your Unity project (see below)

#### Install steps

In your Unity project, open **Window → Package Manager**, click the **`+`** button, choose **Add package from git URL...**, and paste:

```
https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#main
```

> Use `#beta` instead of `#main` for the latest beta features. `#main` is recommended for stability and currently tracks the v9.7.0 release.

After the package imports, MCP for Unity opens a **setup wizard** automatically:

1. Confirm Python and `uv` are installed — the wizard guides you through both if missing.
2. Click **Done**. Once dependencies are green, a list of detected MCP clients appears.
3. Pick the clients you want to configure and click **Configure Selected**.

> **Note:** The wizard's per-client list (Claude Desktop, Cursor, Claude Code, VS Code, Windsurf, Cline, etc.) does not explicitly mention OpenCode. The wizard MAY auto-configure OpenCode's `opencode.json` (verify by checking the file after); if it does not, use the manual config below.

#### Manual opencode.json config (reliable fallback)

Add this block to the `mcp` object in your project's `opencode.json`:

```json
"unity": {
  "type": "local",
  "url": "http://localhost:8080/mcp",
  "enabled": false
}
```

`enabled: false` is the default. Flip to `true` once Unity Editor is running and you want OCGS agents to use unity-mcp tools.

> ⚠ **Unity Editor must be running** before OCGS agents can use unity-mcp tools. If the Editor is closed, MCP calls will fail with a connection error. Open your project in Unity, then continue.

#### Verify

In a session where `enabled: true`, call any unity-mcp tool (e.g. `list_scenes`) via OCGS. Expect a list of scenes from your open Unity project.

#### Troubleshooting

- **Bridge not connecting** — Open **Window → MCP for Unity** and check the status panel. Restart Unity if needed.
- **Server not starting** — Verify `uv --version` works in your terminal. Check the MCP for Unity log for errors.
- **Client not connecting** — Confirm the HTTP server is running on `localhost:8080` and the URL in your client config matches.
- **Port 8080 conflict** — Open Unity's MCP for Unity window and change the port; update the `url` in `opencode.json` to match.
```

- [ ] **Step 3: Run the framework validation suite**

Run: `node tests/agents/validate.mjs 2>&1 | tail -30`

Expected: validation passes. The setup-engine skill has no broken cross-references.

- [ ] **Step 4: Commit**

```bash
git add .opencode/skills/setup-engine/SKILL.md
git commit -m "docs(setup-engine): add §7.4 for unity-mcp install

Documents the prerequisites (Unity 2021.3+, Python 3.10+, uv),
install steps (git URL via Package Manager), the Editor-running
constraint, manual opencode.json config fallback (the wizard may
not auto-configure OpenCode), and troubleshooting."
```

---

## Task 4: Mirror §7.4 to `.opencode/modules/core/skills/setup-engine/SKILL.md`

**Files:**
- Modify: `.opencode/modules/core/skills/setup-engine/SKILL.md` (insert same §7.4 as Task 3)

- [ ] **Step 1: Confirm the modular framework invariant**

The OCGS modular framework requires `setup-engine` to exist in both `.opencode/skills/` (project root) and `.opencode/modules/core/skills/` (core module). Both must stay in sync. This task mirrors Task 3's change to the core module copy.

- [ ] **Step 2: Locate the end of §7.3 in the core module copy**

Read `.opencode/modules/core/skills/setup-engine/SKILL.md` and find the end of the equivalent of §7.3.

- [ ] **Step 3: Insert §7.4 with identical content**

Insert the exact same §7.4 block from Task 3 (the markdown between the `### 7.4. Configure unity-mcp` heading and the end of the troubleshooting list) into the core module copy at the same relative position.

Use `Edit` to make the change — do not rewrite the whole file. Match indentation, heading levels, and code fence languages exactly to the version in `.opencode/skills/setup-engine/SKILL.md`.

- [ ] **Step 4: Run the framework validation suite**

Run: `node tests/agents/validate.mjs 2>&1 | tail -30`

Expected: validation passes. The core module copy has no broken cross-references.

- [ ] **Step 5: Confirm both files are byte-identical for the new section**

Run (PowerShell):
```powershell
$a = Select-String -Path .opencode/skills/setup-engine/SKILL.md -Pattern "### 7.4. Configure unity-mcp"
$b = Select-String -Path .opencode/modules/core/skills/setup-engine/SKILL.md -Pattern "### 7.4. Configure unity-mcp"
if ($a.LineNumber -ne $b.LineNumber) { Write-Error "Section 7.4 not at same line in both files" }
```

The pattern just confirms the section exists in both. A more rigorous check (diff the section text) can be done by extracting both blocks with `Read` and comparing manually if needed.

- [ ] **Step 6: Commit**

```bash
git add .opencode/modules/core/skills/setup-engine/SKILL.md
git commit -m "docs(setup-engine): mirror §7.4 to core module

Modular framework invariant: setup-engine must stay in sync
between .opencode/skills/ and .opencode/modules/core/skills/."
```

---

## Task 5: Update `engine-unity/modulefile.yaml` — bump version, add note

**Files:**
- Modify: `.opencode/modules/engine-unity/modulefile.yaml` (12 lines, full file)

- [ ] **Step 1: Bump version**

Edit the `version:` line from `"0.6.0"` to `"0.7.0"`.

- [ ] **Step 2: Update description**

Edit the `description:` line to mention the new MCP integration. Replace:

```yaml
description: "Unity engine specialists — DOTS/ECS, shaders, Addressables, UI."
```

with:

```yaml
description: "Unity engine specialists — DOTS/ECS, shaders, Addressables, UI. Includes unity-mcp integration for interactive AI-assisted dev."
```

- [ ] **Step 3: Validate the YAML is well-formed**

Run: `node -e "const yaml = require('yaml'); console.log(yaml.parse(require('fs').readFileSync('.opencode/modules/engine-unity/modulefile.yaml', 'utf8')))"`

Expected: parsed object printed. If `yaml` is not installed, fall back to:

```bash
node -e "const fs = require('fs'); const lines = fs.readFileSync('.opencode/modules/engine-unity/modulefile.yaml', 'utf8').split('\n'); console.log(lines.map((l, i) => \`\${i+1}: \${l}\`).join('\n'))"
```

…and visually confirm there are no indentation or syntax errors.

- [ ] **Step 4: Run the framework validation suite**

Run: `node tests/agents/validate.mjs 2>&1 | tail -30`

Expected: validation passes.

- [ ] **Step 5: Commit**

```bash
git add .opencode/modules/engine-unity/modulefile.yaml
git commit -m "feat(engine-unity): bump to 0.7.0, note unity-mcp integration

Version bump reflects the new MCP capability added in 0.7.0."
```

---

## Task 6: Add unity-mcp reference to `unity-specialist.md`

**Files:**
- Modify: `.opencode/modules/engine-unity/agents/unity-specialist.md` (184 lines, full file)

- [ ] **Step 1: Locate the "Common Patterns" / "Verification" section**

Read the file and find the section that contains the agent's existing tool/workflow references. The godot-specialist equivalent is around line 187 (per the spec reference). For unity-specialist, look for a section like "Common Patterns", "Workflow", or "Verification" near the end of the file.

- [ ] **Step 2: Determine the verified tool names**

From Task 1's findings, the verified unity-mcp tool names for this agent are:
- `read_console`
- `list_scenes`
- `get_editor_state`

If Task 1 found different names (NEAR MATCHES), use the verified names instead.

- [ ] **Step 3: Add the unity-mcp bullet**

Insert this bullet into the agent's "Common Patterns" / "Verification" section, in the same style as the godot specialists' MCP references:

```markdown
- Use the unity-mcp server (`read_console`, `list_scenes`, `get_editor_state`) to audit project state and verify in-editor behavior during development sessions. Requires Unity Editor running.
```

Adjust the surrounding context so the bullet fits the existing list structure (e.g., if it's a bulleted list, match the bullet style; if it's under a "Verification" heading, place it there).

- [ ] **Step 4: Validate**

Run: `node tests/agents/validate.mjs 2>&1 | tail -30`

Expected: validation passes.

- [ ] **Step 5: Commit**

```bash
git add .opencode/modules/engine-unity/agents/unity-specialist.md
git commit -m "feat(unity-specialist): reference unity-mcp tools

Adds discoverability for the unity-mcp server in the parent
specialist. Mirrors the godot-specialist pattern."
```

---

## Task 7: Add unity-mcp reference to `unity-dots-specialist.md`

**Files:**
- Modify: `.opencode/modules/engine-unity/agents/unity-dots-specialist.md`

- [ ] **Step 1: Locate the "Common Patterns" / "Verification" section**

- [ ] **Step 2: Add the unity-mcp bullet**

```markdown
- Use the unity-mcp server (`manage_script`, `run_scene`) to verify ECS code compiles and runs in-editor. Requires Unity Editor running.
```

(Substitute the verified tool names from Task 1 if different.)

- [ ] **Step 3: Validate**

Run: `node tests/agents/validate.mjs 2>&1 | tail -30`

- [ ] **Step 4: Commit**

```bash
git add .opencode/modules/engine-unity/agents/unity-dots-specialist.md
git commit -m "feat(unity-dots-specialist): reference unity-mcp tools"
```

---

## Task 8: Add unity-mcp reference to `unity-shader-specialist.md`

**Files:**
- Modify: `.opencode/modules/engine-unity/agents/unity-shader-specialist.md`

- [ ] **Step 1: Locate the "Common Patterns" / "Verification" section**

- [ ] **Step 2: Add the unity-mcp bullet**

```markdown
- Use the unity-mcp server (`manage_asset`, `read_console`) to apply shader changes and watch for shader compile errors in the Unity console. Requires Unity Editor running.
```

(Substitute verified tool names from Task 1 if different.)

- [ ] **Step 3: Validate**

Run: `node tests/agents/validate.mjs 2>&1 | tail -30`

- [ ] **Step 4: Commit**

```bash
git add .opencode/modules/engine-unity/agents/unity-shader-specialist.md
git commit -m "feat(unity-shader-specialist): reference unity-mcp tools"
```

---

## Task 9: Add unity-mcp reference to `unity-addressables-specialist.md`

**Files:**
- Modify: `.opencode/modules/engine-unity/agents/unity-addressables-specialist.md`

- [ ] **Step 1: Locate the "Common Patterns" / "Verification" section**

- [ ] **Step 2: Add the unity-mcp bullet**

```markdown
- Use the unity-mcp server (`manage_asset`, `read_console`) to verify Addressables groups build and watch for build errors in the Unity console. Requires Unity Editor running.
```

(Substitute verified tool names from Task 1 if different.)

- [ ] **Step 3: Validate**

Run: `node tests/agents/validate.mjs 2>&1 | tail -30`

- [ ] **Step 4: Commit**

```bash
git add .opencode/modules/engine-unity/agents/unity-addressables-specialist.md
git commit -m "feat(unity-addressables-specialist): reference unity-mcp tools"
```

---

## Task 10: Add unity-mcp reference to `unity-ui-specialist.md`

**Files:**
- Modify: `.opencode/modules/engine-unity/agents/unity-ui-specialist.md`

- [ ] **Step 1: Locate the "Common Patterns" / "Verification" section**

- [ ] **Step 2: Add the unity-mcp bullet**

```markdown
- Use the unity-mcp server (`manage_scene`, `manage_script`) to scaffold UI hierarchies and run scenes to verify UI behavior. Requires Unity Editor running.
```

(Substitute verified tool names from Task 1 if different.)

- [ ] **Step 3: Validate**

Run: `node tests/agents/validate.mjs 2>&1 | tail -30`

- [ ] **Step 4: Commit**

```bash
git add .opencode/modules/engine-unity/agents/unity-ui-specialist.md
git commit -m "feat(unity-ui-specialist): reference unity-mcp tools"
```

---

## Task 11: Add changelog entry to `UPGRADING.md`

**Files:**
- Modify: `UPGRADING.md`

- [ ] **Step 1: Locate the "Unreleased" or latest version section**

Read `UPGRADING.md` and find the section for upcoming changes. If there is no "Unreleased" section, add one at the top of the changelog.

- [ ] **Step 2: Add the unity-mcp entry**

Insert (in the appropriate changelog section, under a "New Features" or "MCP Integrations" subsection):

```markdown
- **New MCP integration: unity-mcp** — Adds optional support for the [CoplayDev unity-mcp](https://github.com/CoplayDev/unity-mcp) server, giving OCGS agents in Unity projects access to ~50+ tools for scene, script, and asset management. Requires Unity Editor running. Configure via `setup-engine` §7.4. The `engine-unity` module is now version 0.7.0.
```

- [ ] **Step 3: Validate (no-op for markdown, but check formatting)**

Open the file and visually confirm the entry is in the right place, formatted consistently with other entries.

- [ ] **Step 4: Commit**

```bash
git add UPGRADING.md
git commit -m "docs(upgrading): note unity-mcp integration

Documents the new MCP capability for users upgrading."
```

---

## Task 12: Update `README.md` (if applicable)

**Files:**
- Read: `README.md` to find the MCP list (if one exists)

- [ ] **Step 1: Check if README has an MCP table or section**

Read `README.md` and search for sections mentioning "MCP", "aseprite", "godot-mcp", or "engine integration". If no such section exists, skip this task (the UPGRADING.md entry in Task 11 is sufficient discoverability).

- [ ] **Step 2: Add the unity-mcp row (only if a table exists)**

If a table exists, add a row for unity-mcp following the same format as the godot-mcp and aseprite rows. Example:

```markdown
| `unity-mcp` | Unity Editor bridge (scene/script/asset tools) | Optional, requires Unity Editor |
```

- [ ] **Step 3: Commit (only if changes were made)**

```bash
git add README.md
git commit -m "docs(readme): list unity-mcp in MCP integrations"
```

If no changes were made (no MCP table existed), skip this commit and note it in the PR description.

---

## Task 13: Final validation pass

**Files:** none modified

- [ ] **Step 1: Run the full validation suite**

Run: `node tests/agents/validate.mjs 2>&1`

Expected: all checks pass. No new errors or warnings related to the unity-mcp integration.

- [ ] **Step 2: Run the plugin test suite**

Run: `node .opencode/plugins/tests/test-*.mjs 2>&1 | tail -50`

Expected: 129+ tests pass. No new failures.

- [ ] **Step 3: Re-confirm opencode.json is valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('opencode.json', 'utf8')); console.log('OK')"`

Expected: `OK`

- [ ] **Step 4: Spot-check the two setup-engine copies are in sync**

Run (PowerShell):
```powershell
$root = Get-Content .opencode/skills/setup-engine/SKILL.md -Raw
$core = Get-Content .opencode/modules/core/skills/setup-engine/SKILL.md -Raw
$rootHas74 = $root -match '### 7\.4\. Configure unity-mcp'
$coreHas74 = $core -match '### 7\.4\. Configure unity-mcp'
if ($rootHas74 -and $coreHas74) { Write-Host "OK: both copies have §7.4" } else { Write-Error "MISMATCH: root=$rootHas74 core=$coreHas74" }
```

Expected: `OK: both copies have §7.4`

- [ ] **Step 5: View commit log**

Run: `git log --oneline master..HEAD`

Expected: 11-12 commits, one per task (Tasks 1 and 12 may not produce commits). The commit subjects should read as a clean changelog of the integration.

- [ ] **Step 6: No commit (this task is verification only)**

If any validation step failed, fix the issue and create a follow-up commit before proceeding to PR.

---

## Self-Review

**1. Spec coverage:**

| Spec section | Covered by |
|--------------|------------|
| §1 Motivation | N/A — context, not implementation |
| §2.1 No submodule | Implicit — no submodule task in plan |
| §2.2 opencode.json MCP config | Task 2 |
| §2.3 Editor-running constraint | Task 3 (documented in §7.4) |
| §2.4 HTTP transport | Task 2 (URL is HTTP) |
| §3.1 setup-engine §7.4 | Tasks 3 + 4 |
| §4 unity-specialist MCP ref | Task 6 |
| §4 unity-dots-specialist MCP ref | Task 7 |
| §4 unity-shader-specialist MCP ref | Task 8 |
| §4 unity-addressables-specialist MCP ref | Task 9 |
| §4 unity-ui-specialist MCP ref | Task 10 |
| §4 verification of tool names | Task 1 |
| §5 file changes | All tasks (1 per file plus planning artifacts) |
| §6 dependency map | Implicit (setup-engine → specialists) |
| §7 risks & mitigations | Risks documented in §7.4 (Task 3); verification in Task 1 mitigates tool-name drift |
| §8 out of scope | None of the out-of-scope items are in the plan ✓ |

**2. Placeholder scan:** No TBD / TODO / "implement later" / "similar to Task N" in the plan. Each step has explicit code or commands.

**3. Type / name consistency:**
- Tool names used in agent file bullets (Tasks 6-10) match the spec's per-agent table, contingent on Task 1's verification.
- File paths are consistent: `.opencode/modules/engine-unity/agents/unity-*-specialist.md` in every task.
- `setup-engine` paths appear as `.opencode/skills/setup-engine/SKILL.md` and `.opencode/modules/core/skills/setup-engine/SKILL.md` consistently.
- Section number `7.4` is used consistently.

**4. Task ordering:** Tasks 1 → 2 → 3 → 4 (sequential, each depends on prior) → 5 (independent) → 6-10 (independent of each other but after spec/tool verification) → 11-12 (independent doc updates) → 13 (final verification). All dependencies are explicit.

Plan ready for execution.
