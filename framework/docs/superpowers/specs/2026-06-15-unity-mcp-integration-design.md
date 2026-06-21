# Unity MCP Integration Design

> **Status:** Draft
> **Date:** 2026-06-15
> **Context:** Integrate the [unity-mcp](https://github.com/CoplayDev/unity-mcp) server (by CoplayDev) into the OCGS workflow for interactive, AI-assisted Unity development. Mirrors the existing `godot-mcp` and `aseprite-mcp` integration patterns.

## 1. Motivation

The OCGS framework already has two engine/asset MCP integrations:

| MCP | Engine/Asset | Status | Skill/Workflow |
|-----|--------------|--------|----------------|
| `aseprite` | Pixel art | Enabled by default | `art-generate` creates sprites from asset specs |
| `godot` | Godot 4 | Disabled by default | `automated-smoke-test` runs the project headlessly; 7 agents reference it |

Unity has **no MCP integration** despite the framework shipping **5 Unity specialists** (`unity-specialist`, `unity-dots-specialist`, `unity-shader-specialist`, `unity-addressables-specialist`, `unity-ui-specialist`) in the `engine-unity` module. The specialists are configured for Unity best-practice code review but cannot interact with a running Unity Editor to verify their work.

The [unity-mcp](https://github.com/CoplayDev/unity-mcp) server (v9.7.0, 10.7k stars, MIT licensed, by CoplayDev) closes this gap. It exposes ~50+ tools that let AI agents manage assets, control scenes, edit scripts, read the Editor console, and automate tasks inside a running Unity Editor.

### Scope decision: interactive AI-assisted dev only

This integration targets **interactive development sessions** (developer has Unity Editor open; agents use unity-mcp to read/write scenes, scripts, and assets during a coding session). It does **not** include an automated headless smoke-test for Unity (Unity in batchmode is finicky and would be a separate, larger effort). The Unity MCP itself requires Unity Editor to be running, so the integration is naturally oriented toward interactive workflows.

## 2. Architecture

### 2.1 No submodule

Unlike `aseprite-mcp` (a Python package hosted in `tools/aseprite-mcp/`), Unity MCP is **not** a standalone CLI server. It is a Unity Editor package installed via the Unity Package Manager. The server process lives inside Unity Editor and exposes an HTTP endpoint on `localhost:8080`. OpenCode connects to that endpoint; OpenCode does not own the process.

**No submodule, no `tools/unity-mcp/` directory.** The user installs the package once in their Unity project; the framework just configures the client side.

### 2.2 Project-Level MCP Config

Added to `opencode.json` alongside the existing aseprite and godot entries:

```json
"mcp": {
  "aseprite": { ... },
  "godot": { ... },
  "unity": {
    "type": "local",
    "url": "http://localhost:8080/mcp",
    "enabled": false
  }
}
```

**Shape decisions:**

- `type: "local"` — Unity MCP runs as a local process (inside Unity Editor) and exposes HTTP on localhost. OpenCode's `local` + `url` matches this exactly. No `command` array is needed because the process is owned by Unity, not by OpenCode.
- `url: "http://localhost:8080/mcp"` — the official default endpoint from the CoplayDev install docs.
- `enabled: false` — matches the `godot` precedent. The MCP requires Unity Editor to be running, so we don't auto-enable it; users opt in via the setup-engine step once their Editor is up.
- **No `environment` block** — Unity MCP reads its config from the Unity package settings, not from env vars passed by OpenCode.

### 2.3 Hard prerequisite: Unity Editor must be running

This is the single biggest difference from the `godot-mcp` integration. Godot MCP can be invoked in a headless Godot process; Unity MCP cannot. If an OCGS agent calls a unity-mcp tool while Unity Editor is closed, the call fails with a connection error.

This constraint is documented prominently in `setup-engine` §7.4 (see Section 3) and called out as the first troubleshooting entry.

### 2.4 Transport choice: HTTP (not stdio)

Unity MCP supports two transports: HTTP (default, `http://localhost:8080/mcp`) and stdio (`uvx --from mcpforunityserver mcp-for-unity --transport stdio`). We document HTTP for the following reasons:

- Simpler config: a single URL line, no path dependencies
- Matches the Unity MCP default and the recommendation for "Cursor, Windsurf, Antigravity, VS Code, Cline, etc."
- Trade-off acknowledged: `localhost:8080` must be free; conflict is rare in practice (a single dev workstation, one Unity instance at a time)

A stdio variant is **out of scope** for this design but can be added later if users request it.

## 3. Skill Updates

### 3.1 `setup-engine` skill — new section 7.4

Add a new section after the existing 7.3 (`godot-mcp`), in `.opencode/skills/setup-engine/SKILL.md` and its module copy at `.opencode/modules/core/skills/setup-engine/SKILL.md` (modular framework invariant — both copies must stay in sync).

**Section title:** `7.4. Configure unity-mcp (Optional — Unity Only)`

**Contents:**

1. **What it is** — one-paragraph: bridge between AI agents and Unity Editor via MCP, ~50+ tools for scene/script/asset management, by CoplayDev, MIT licensed.
2. **Prerequisites** (hard prereq, called out at the top):
   - Unity 2021.3 LTS or newer, installed
   - Python 3.10+ with `uv` (`pip install uv` or `winget install astral-sh.uv`)
   - MCP for Unity package installed in the user's Unity project (see step 3)
3. **Install steps:**
   ```
   # In Unity: Window → Package Manager → + → Add package from git URL
   # Paste: https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#main
   # (Use #beta for the latest beta features; #main for the latest stable)
   # Then: Window → MCP for Unity → "Configure All Detected Clients"
   # NOTE: The wizard's per-client support list (Claude Desktop, Cursor,
   # Claude Code, VS Code, Windsurf, Cline, etc.) does not explicitly
   # mention OpenCode. The wizard MAY auto-configure OpenCode's
   # config file (verify during implementation); the manual config in
   # step 5 below is the reliable fallback.
   ```
4. **Editor-running constraint** (prominent warning block):
   > ⚠ Unity Editor must be running before OCGS agents can use unity-mcp tools. If the Editor is closed, MCP calls will fail with a connection error. Open your project in Unity, then continue.
5. **Add to `opencode.json`** — the JSON from Section 2.2, with note that `enabled: false` is the default; flip to `true` once Unity Editor is up.
6. **Verify** — call any unity-mcp tool (e.g. `list_scenes`); expect a Unity scene list in return.
7. **Troubleshooting** — three bullets mirroring the Unity docs:
   - Bridge not connecting → open Window → MCP for Unity, check status panel
   - Server not starting → verify `uv --version` works in terminal
   - Client not connecting → confirm HTTP server is running on `localhost:8080` and the URL in the client config matches

**Why this shape:**

- Parallel to section 7.3 (godot-mcp) — pattern is established; users who know one section understand the other
- Editor-running constraint is the #1 thing that will trip users up; promoted to a warning callout
- "Configure All Detected Clients" is Unity's official first-class path; we point at it before manual config
- Two-file update (skill + module copy) matches the modular framework invariant from the 2026-05-09 modular-framework plan

## 4. Agent Updates

All 5 specialists in `.opencode/modules/engine-unity/agents/` get one new bullet in their existing tool/workflow section, in the same style as the godot specialists' MCP references (e.g. `godot-specialist.md:187-188`, `gameplay-programmer.md:397-398`).

**Common pattern:**

```markdown
- Use the unity-mcp server ([tool_a], [tool_b]) to [purpose]
```

**Per-agent tool hints (verified against upstream `unity-mcp-skill/SKILL.md` and `tools-reference.md` at v9.7.0):**

| Agent | Unity-mcp tools to reference | Purpose |
|-------|------------------------------|---------|
| `unity-specialist` | `read_console`, `manage_scene` (action `get_active` / `get_hierarchy`), resource `mcpforunity://editor/state` | Project-wide audit: compile errors, scene state, Editor state |
| `unity-dots-specialist` | `create_script`, `script_apply_edits`, `validate_script`, `manage_scene` (action `load`) | Verify ECS code compiles and runs in-editor |
| `unity-shader-specialist` | `manage_material`, `manage_asset` (shaders), `read_console` | Apply material/shader changes, watch for shader compile errors in console |
| `unity-addressables-specialist` | `manage_asset`, `manage_package`, `read_console` | Verify Addressables groups build, watch for build errors |
| `unity-ui-specialist` | `manage_ui` (UI Toolkit), `manage_scene`, `create_script` | Scaffold UI hierarchies, run scenes to verify UI |

**Verification step at implementation time:** the exact list of unity-mcp tool names (v9.7.0) must be confirmed against the actual server's tool list before this section is written into the agent files. If a referenced tool doesn't exist in the server, the spec is updated to use the correct name. This is an implementation-time check, not a design-time blocker.

**Why this shape:**

- Mirrors the godot-specialist line-by-line structure — readers familiar with one recognize the other
- Specific tool names per agent (not generic) so agents know which tools are relevant to their domain
- Verification step is honest about what we know vs. don't know at design time

## 5. Directory & File Changes

| Path | Change | Reason |
|------|--------|--------|
| `opencode.json` | Modified — add `unity` MCP block | Project-scoped MCP config |
| `.opencode/skills/setup-engine/SKILL.md` | Modified — add section 7.4 | Document Unity MCP install |
| `.opencode/modules/core/skills/setup-engine/SKILL.md` | Modified — add section 7.4 | Module copy stays in sync |
| `.opencode/modules/engine-unity/agents/unity-specialist.md` | Modified — add MCP ref | Discoverability for the parent specialist |
| `.opencode/modules/engine-unity/agents/unity-dots-specialist.md` | Modified — add MCP ref | DOTS-specific tool hints |
| `.opencode/modules/engine-unity/agents/unity-shader-specialist.md` | Modified — add MCP ref | Shader-specific tool hints |
| `.opencode/modules/engine-unity/agents/unity-addressables-specialist.md` | Modified — add MCP ref | Addressables-specific tool hints |
| `.opencode/modules/engine-unity/agents/unity-ui-specialist.md` | Modified — add MCP ref | UI-specific tool hints |
| `.opencode/modules/engine-unity/modulefile.yaml` | Modified — bump version 0.6.0 → 0.7.0; description note | New capability in module |
| `framework/docs/superpowers/specs/2026-06-15-unity-mcp-integration-design.md` | New — this spec | Design record |
| `framework/docs/superpowers/plans/2026-06-15-unity-mcp-integration.md` | New — implementation plan | Created by writing-plans skill after spec approval |
| `UPGRADING.md` | Modified — add entry under unreleased section | Document new capability for users upgrading |
| `README.md` | Modified — possibly add unity-mcp to MCP list if one exists | Quick discoverability (verify during implementation) |

## 6. Dependency Map

```
setup-engine (existing — engine selection)
    ↓
setup-engine §7.4 (Unity MCP install)  ← NEW
    ↓
5 unity specialists (discover + use unity-mcp tools)  ← UPDATED
```

The unity-mcp integration is **consumer-only** — it does not feed any new skill output. It enhances existing agent capabilities by giving them runtime access to a running Unity Editor.

## 7. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Unity Editor not running when agents call unity-mcp | Documented prominently in setup-engine §7.4; first tool call fails with a clear connection error users learn to recognize |
| Unity MCP server not started inside Unity | setup-engine step requires user to click "Configure All Detected Clients" in Unity; verify step catches this |
| Unity's "Configure All Detected Clients" wizard does not explicitly support OpenCode | Step 5 of setup-engine §7.4 always provides the manual `opencode.json` config as a reliable fallback; users should verify the wizard worked, otherwise use the manual config |
| Tool name drift between Unity MCP versions | Pin to a specific version in setup-engine (recommend `#main` for stability since v9.7.0 is the latest stable as of 2026-05-22; `#beta` is for users who want cutting-edge features); tool refs in agent files use names verified at implementation time against the actual server's tool list |
| `localhost:8080` conflict (rare — another tool using the port) | Documented in troubleshooting; user can change Unity MCP's port via the Editor's MCP for Unity window |
| Unity MCP requires Python + `uv` (not common in Unity dev) | setup-engine lists these as prereqs with install commands; the Unity wizard checks for them and prompts to install |
| We document tool names that may not exist in the actual unity-mcp server | Implementation includes a verification step: query the actual server for its tool list and reconcile against the agent references |
| OpenCode `local` + `url` shape (no `command`) is a less common pattern than `command: [...]` | Validated by OpenCode's own MCP config schema (see opencode.json:11-29 for existing `command`-based examples); the `local` + `url` shape is documented as supported for HTTP-served local servers |

## 8. Out of Scope

- **Automated smoke-test for Unity** — would require Unity in batchmode and is a separate, larger effort. The user's `automated-smoke-test` skill for Godot does not translate directly because Godot runs headless easily and Unity does not.
- **Custom Unity MCP tools** — only using the upstream CoplayDev tools.
- **Multiple Unity instance routing** — Unity MCP supports it via [Multi-Instance Routing](https://coplaydev.github.io/unity-mcp/guides/multi-instance); OCGS uses the default single-instance setup.
- **Remote-hosted server with auth** — Unity MCP supports it; OCGS uses local-only for now.
- **Roslyn script validation** — Unity MCP has a feature for it; OCGS agents use their own validation per existing workflows.
- **Tool groups configuration** — Unity MCP supports per-group enable; OCGS uses defaults.
- **stdio transport variant** — HTTP is documented; stdio can be added later if users request it.
- **Production-quality asset generation** — the unity-mcp tools assist with asset/script/scene work but the framework does not create or generate assets; that is the responsibility of the `art-bible` / `asset-spec` / `art-generate` pipeline.
