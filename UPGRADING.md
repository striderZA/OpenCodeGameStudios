# Upgrading OpenCode Game Studios

This guide covers upgrading your existing game project repo from one version of the template to the next.

## Upgrade Strategies

There are three ways to pull in template updates. Choose based on how your repo is set up.

### Strategy A — Git Remote Merge (recommended)

Best when: you cloned the template and have your own commits on top of it.

```shell
# Add the template as a remote (one-time setup)
git remote add template https://github.com/striderZA/OpenCodeGameStudios.git

# Fetch the new version
git fetch template main

# Merge into your branch
git merge template/main --allow-unrelated-histories
```

Git will flag conflicts only in files that both the template *and* you have changed. Resolve each one — your game content goes in, structural improvements come along for the ride. Then commit the merge.

**Tip:** The files most likely to conflict are `AGENTS.md` and `opencode.json`, because you've filled them in with your engine and project settings. Keep your content; accept the structural changes.

### Strategy B — Cherry-pick specific commits

Best when: you only want one specific feature (e.g., just the new command, not the full update).

```shell
git remote add template https://github.com/striderZA/OpenCodeGameStudios.git
git fetch template main

# Cherry-pick the specific commit(s) you want
git cherry-pick <commit-sha>
```

Commit SHAs for each version are listed in the version sections below.

## v0.3.0 — Godot MCP Integration

**New skill count:** 72 → 73 (added `automated-smoke-test`)

### What changed
- **New skill**: `automated-smoke-test` — runs the Godot project via godot-mcp, captures debug output, and checks for errors/crashes
- **setup-engine skill**: Added optional godot-mcp configuration section (section 7.3)
- **Agent files**: 5 agents (gameplay-programmer, godot-gdscript-specialist, godot-specialist, ui-programmer, qa-tester) updated with godot-mcp capability references
- **.gitattributes**: Added with `* text=auto eol=lf` for consistent line endings
- **Docs**: setup-requirements.md, quick-start.md, skills-reference.md updated

### For your local clone
A new `.gitattributes` was added. Existing clones should re-normalize:
```shell
git rm --cached -r . && git reset --hard
```

### New dependency (optional)
The `automated-smoke-test` skill requires [godot-mcp](https://github.com/Coding-Solo/godot-mcp):
```shell
npx @coding-solo/godot-mcp
```
Configure via `opencode.json` MCP settings (see `setup-engine` skill section 7.3).

### Safe to overwrite
- `.opencode/skills/automated-smoke-test/SKILL.md`
- `.gitattributes`

### Merge carefully
- `.opencode/skills/setup-engine/SKILL.md` — has new section 7.3
- `.opencode/agents/gameplay-programmer.md` — MCP capability line added
- `.opencode/agents/godot-gdscript-specialist.md` — MCP capability line added
- `.opencode/agents/godot-specialist.md` — MCP capability line added  
- `.opencode/agents/ui-programmer.md` — MCP capability line added
- `.opencode/agents/qa-tester.md` — MCP capability line added
- `.opencode/docs/setup-requirements.md` — godot-mcp dependency section added
- `.opencode/docs/quick-start.md` — setup step added, steps renumbered
- `.opencode/docs/skills-reference.md` — automated-smoke-test entry added

## v0.4.0 — Unity MCP Integration

**New MCP server:** unity-mcp (CoplayDev), for interactive AI-assisted dev with Unity Editor.

### What changed
- **New MCP integration**: `unity` — Adds optional support for the [CoplayDev unity-mcp](https://github.com/CoplayDev/unity-mcp) server, giving OCGS agents in Unity projects access to ~50+ tools for scene, script, and asset management. Requires Unity Editor running. Configure via `setup-engine` §7.4.
- **setup-engine skill**: Added section 7.4 covering unity-mcp prerequisites (Unity 2021.3+, Python 3.10+, `uv`), install steps, and the Editor-running constraint.
- **Module version**: `engine-unity` bumped from 0.6.0 → 0.7.0; description updated to mention the unity-mcp integration.
- **Agent files**: 5 unity specialists (`unity-specialist`, `unity-dots-specialist`, `unity-shader-specialist`, `unity-addressables-specialist`, `unity-ui-specialist`) updated with new `## MCP Integration` sections referencing domain-specific unity-mcp tools.
- **opencode.json**: New `mcp.unity` block (HTTP, `http://localhost:8080/mcp`, disabled by default) — mirrors the `mcp.godot` pattern.

### New dependency (optional)
The unity-mcp integration requires the CoplayDev unity-mcp package installed in your Unity project (via Unity Package Manager git URL). The integration itself is opt-in: users set `mcp.unity.enabled: true` in `opencode.json` after installing.

### Safe to overwrite
- `.opencode/modules/engine-unity/modulefile.yaml`

### Merge carefully
- `opencode.json` — new `mcp.unity` block; if you've customized this file, merge the new block into your existing `mcp` object
- `.opencode/skills/setup-engine/SKILL.md` — has new section 7.4 (and §7.4 SFML3/Raylib renumbered to §7.5 in the root monolith; core copy has just §7.4 with no §7.5 because SFML3/Raylib are optional modules)
- `.opencode/modules/core/skills/setup-engine/SKILL.md` — has new section 7.4 (mirror of the root change, no renumbering)
- `.opencode/modules/engine-unity/agents/unity-specialist.md` — new `## MCP Integration` section
- `.opencode/modules/engine-unity/agents/unity-dots-specialist.md` — new `## MCP Integration` section
- `.opencode/modules/engine-unity/agents/unity-shader-specialist.md` — new `## MCP Integration` section
- `.opencode/modules/engine-unity/agents/unity-addressables-specialist.md` — new `## MCP Integration` section
- `.opencode/modules/engine-unity/agents/unity-ui-specialist.md` — new `## MCP Integration` section

## v0.7.0 — Babylon.js MCP Integration

**New MCP servers:** `babylonjs-nme`, `babylonjs-gui` — first-party @babylonjs/mcp-servers.

### What changed
- **Module version**: `engine-babylonjs` bumped 0.6.0 → 0.7.0; description updated to mention MCP integration
- **opencode.json**: Added `babylonjs-nme` and `babylonjs-gui` MCP entries (disabled by default) — following the same pattern as godot-mcp and unity-mcp
- **scaffolding.md**: Added MCP Servers section listing all 7 available @babylonjs/mcp-servers with link to official docs
- **Agent files**: 5 babylonjs specialists updated with `## MCP Integration` sections
- **Docs**: scaffolding.md updated; setup-engine SKILL.md already references scaffolding.md

### New dependency (optional)
The MCP servers are built into the `@babylonjs/mcp-servers` npm package — no extra install.
Enable them in `opencode.json` by setting `babylonjs-nme.enabled: true` or `babylonjs-gui.enabled: true`.

### Safe to overwrite
- `.opencode/modules/engine-babylonjs/modulefile.yaml`
- `.opencode/modules/engine-babylonjs/agents/*.md`
- `.opencode/agents/babylonjs-specialist.md`
- `.opencode/agents/babylonjs-physics-specialist.md`
- `.opencode/agents/babylonjs-network-specialist.md`
- `.opencode/agents/babylonjs-gui-specialist.md`
- `.opencode/agents/babylonjs-perf-specialist.md`
- `docs/engine-reference/babylonjs/scaffolding.md`

### Merge carefully
- `opencode.json` — new `babylonjs-nme` and `babylonjs-gui` blocks in `mcp` object

### Strategy C — Manual file copy

Best when: you didn't use git to set up the template (just downloaded a zip).

1. Download or clone the new version alongside your repo.
2. Copy the files listed under **"Safe to overwrite"** directly.
3. For files under **"Merge carefully"**, open both versions side-by-side and manually merge the structural changes while keeping your content.
