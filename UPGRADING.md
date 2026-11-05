# Upgrading OpenCode Game Studios

This guide covers upgrading an existing game project repo from one version of the template to the next.

## Upgrade Strategies

There are three ways to pull in template updates. Choose based on how your repo is set up.

### Strategy A — Git Remote Merge (recommended)

Best when: you cloned the template and have your own commits on top of it.

```shell
# Add the template as a remote (one-time setup)
git remote add template https://github.com/striderZA/OpenCodeGameStudios.git

# Fetch the new version
git fetch template master

# Merge into your branch
git merge template/master --allow-unrelated-histories
```

Git will flag conflicts only in files that both the template *and* you have changed. Resolve each one — your game content goes in, structural improvements come along for the ride. Then commit the merge.

**Tip:** The files most likely to conflict are `AGENTS.md`, `opencode.json`, and `docs/framework/technical-preferences.md`, because you've filled them in with your engine and project settings. Keep your content; accept the structural changes.

### Strategy B — Cherry-pick specific commits

Best when: you only want one specific feature (e.g., just the new command, not the full update).

```shell
git remote add template https://github.com/striderZA/OpenCodeGameStudios.git
git fetch template master

# Cherry-pick the specific commit(s) you want
git cherry-pick <commit-sha>
```

Commit SHAs for each release are listed in the version index below.

### Strategy C — Manual file copy

Best when: you didn't use git to set up the template (just downloaded a zip).

1. Download or clone the new version alongside your repo.
2. Copy the files listed under **"Safe to overwrite"** for the target release.
3. For files under **"Merge carefully"**, open both versions side-by-side and manually merge the structural changes while keeping your content.

## Version Index

| Version | Date | Commit | Summary |
|---------|------|--------|---------|
| `v0.14.0` | 2026-11-04 | `4196cce` | oh-my-pi support, `ocgs-hooks`, tracked git hooks, Autopilot playtest, Godot 4.7.2 reference, OpenCode V2 config, model assignment removed |
| `v0.13.1` | 2026-10-06 | `f2ceaaf` | OpenCode V2 plugin migration (`Plugin.define` / `setup(ctx)`) |
| `v0.13.0` | 2026-08-10 | `c5abd9a` | Bevy engine support |
| `v0.12.1` | 2026-08-02 | `9435c51` | Windows `.opencode/` symlink repair tool |
| `v0.12.0` | 2026-07-23 | `8de2da6` | See `CHANGELOG.md` |
| `v0.11.0` | 2026-07-22 | `2748a52` | SFML 3 engine reference docs, Pi docs refresh |
| `v0.10.2` | 2026-06-23 | `c393f79` | See `CHANGELOG.md` |
| `v0.10.1` | 2026-06-22 | `5d4543b` | Framework docs moved to `docs/framework/` |
| `v0.10.0` | 2026-06-21 | `5605c19` | Multi-harness migration to `.agents/` |
| `v0.9.1` | 2026-06-15 | `304640c` | See `CHANGELOG.md` |
| `v0.9.0` | 2026-06-15 | `c189412` | See `CHANGELOG.md` |
| `v0.8.0` | 2026-05-11 | `1093501` | See `CHANGELOG.md` |
| `v0.7.0` | 2026-05-11 | `307931b` | See `CHANGELOG.md` |
| `v0.6.0` | 2026-05-07 | `9d3f012` | See `CHANGELOG.md` |
| `v0.5.0` | 2026-05-06 | `0aeaf87` | See `CHANGELOG.md` |
| `v0.4.0` | 2026-05-04 | `f40338b` | Unity MCP integration (historical; superseded by Unity CLI) |
| `v0.3.0` | 2026-05-01 | `4560ddf` | Godot MCP integration |
| `v0.1.0`–`v0.3.2` | 2026-04-29–05-02 | see tags | Initial framework releases |

## v0.5.0 → v0.14.0 — Current Layout Migration

These are the structural changes that matter when upgrading an older project.
The release-by-release detail is in `CHANGELOG.md`.

### 1. Content moved to `.agents/`

Since v0.10, canonical agents, skills, commands, and rules live in `.agents/`.
`.opencode/{agents,skills,commands,rules}` are symlinks to those directories.
Pi and omp read `.agents/` directly.

If your project still has real files under `.opencode/`, run:

```shell
node tools/migrate-to-agents.mjs --dry-run
node tools/migrate-to-agents.mjs
```

Keep your previous `.opencode/` content only until you have verified the migration.

### 2. Modular install

The framework is partitioned into 22 theme modules. The installer reads
`.opencode/modules/` for the OpenCode target and `.agents/modules/` for every
other target:

```shell
node .opencode/modules/install.mjs add core engine-godot art design qa
node .opencode/modules/install.mjs list

# Other targets
node .opencode/modules/install.mjs add core --harness pi
node .opencode/modules/install.mjs add core --harness omp
node .opencode/modules/install.mjs add core --harness claude
node .opencode/modules/install.mjs add core --harness codex
```

`--harness` selects the content target, the install manifest, and the MCP file.
`--pi` remains as an alias. `/init-template` asks for the harness and passes it
through.

### 3. OpenCode V2 configuration

`opencode.json` uses the V2 schema: `plugins` (plural), `mcp.servers`,
`permissions` as an ordered array, and `commands`. V1 keys are accepted without
error and then ignored. Install OpenCode 2.x with `npm install -g @opencode/cli`.

### 4. Model assignment removed

Per-item `model:` frontmatter was removed from `.agents/`. Model choice belongs
to each developer's harness. Do not add `model:`, `mode:`, or `permission:` to
agent files in `.agents/agents/`.

### 5. Harness support

- **OpenCode 2.x** — V2 config, plugins under `.opencode/plugins/`
- **Pi 1.x** — extensions under `.pi/extensions/`; no subagent tool. `ocgs-tool-map` maps OCGS `Task`/`question` names to direct work
- **omp 18.16.0+** — `.omp/config.yml` loads the shared Pi extensions, including `ocgs-tool-map` (`Task` → `task`, `question` → `ask`)
- **Claude Code 2.1.277+** — `.claude/` content, `.mcp.json`, native `AGENTS.md`
- **Codex** — `.agents/skills` and `AGENTS.md` native; `.codex/agents/*.toml`

Module installs are harness-aware:

| Harness | `--harness` | Content target | MCP file |
|---------|-------------|----------------|----------|
| OpenCode | `opencode` (default) | `.opencode/{agents,skills,commands,rules}` | `opencode.json` |
| Pi | `pi` / `--pi` | `.agents/{agents,skills,commands,rules}` | `.pi/mcp.json` |
| oh-my-pi | `omp` / `--omp` | `.omp/agents` + `.agents/{skills,commands,rules}` | `.omp/mcp.json` |
| Claude Code | `claude` / `--claude` | `.claude/{agents,skills,commands,rules}` | `.mcp.json` |
| Codex | `codex` / `--codex` | `.codex/agents` + `.agents/skills` | `.codex/config.toml` |

### 6. Engine reference

`docs/engine-reference/` is version-pinned. Check the relevant `VERSION.md`
before accepting engine API guidance. Godot is pinned to 4.7.2. Unity now uses
the Unity CLI; the old `unity-mcp` setup in the v0.4.0 notes is historical.

### Upgrade checklist

- [ ] Merge or cherry-pick the target release
- [ ] Run `node tools/migrate-to-agents.mjs` if your content is still under `.opencode/`
- [ ] Reinstall the modules you use with `node .opencode/modules/install.mjs add ...`
- [ ] Move `opencode.json` to the V2 schema (`plugins`, `mcp.servers`, `permissions`, `commands`)
- [ ] Remove `model:`, `mode:`, and `permission:` from `.agents/agents/*.md`
- [ ] On Pi, stop relying on `Task`/`/consult`; `ocgs-tool-map` now instructs direct work
- [ ] Re-run `node tests/agents/validate.mjs` and `node tests/workflow/run-all.mjs`
- [ ] Re-run `npm run test:plugins` and `npm run test:hooks`
- [ ] Refresh `docs/framework/technical-preferences.md` with `/setup-engine`

## Historical Notes (v0.3.0–v0.4.0)

> These notes describe the layout at the time of release. Paths such as
> `.opencode/skills/` and `mcp.unity` are historical; current projects use
> `.agents/` and the Unity CLI. Use them only to understand an old diff.

### v0.3.0 — Godot MCP Integration

**New skill count:** 72 → 73 (added `automated-smoke-test`)

#### What changed
- **New skill**: `automated-smoke-test` — runs the Godot project via godot-mcp, captures debug output, and checks for errors/crashes
- **setup-engine skill**: Added optional godot-mcp configuration section (section 7.3)
- **Agent files**: 5 agents (gameplay-programmer, godot-gdscript-specialist, godot-specialist, ui-programmer, qa-tester) updated with godot-mcp capability references
- **.gitattributes**: Added with `* text=auto eol=lf` for consistent line endings
- **Docs**: setup-requirements.md, quick-start.md, skills-reference.md updated

#### For your local clone
A new `.gitattributes` was added. Existing clones should re-normalize:
```shell
git rm --cached -r . && git reset --hard
```

#### New dependency (optional)
The `automated-smoke-test` skill requires [godot-mcp](https://github.com/Coding-Solo/godot-mcp):
```shell
npx @coding-solo/godot-mcp
```
Configure via `opencode.json` MCP settings (see `setup-engine` skill section 7.3).

#### Safe to overwrite
- `.opencode/skills/automated-smoke-test/SKILL.md`
- `.gitattributes`

#### Merge carefully
- `.opencode/skills/setup-engine/SKILL.md` — has new section 7.3
- `.opencode/agents/gameplay-programmer.md` — MCP capability line added
- `.opencode/agents/godot-gdscript-specialist.md` — MCP capability line added
- `.opencode/agents/godot-specialist.md` — MCP capability line added
- `.opencode/agents/ui-programmer.md` — MCP capability line added
- `.opencode/agents/qa-tester.md` — MCP capability line added
- `docs/framework/setup-requirements.md` — godot-mcp dependency section added
- `docs/framework/quick-start.md` — setup step added, steps renumbered
- `docs/framework/skills-reference.md` — automated-smoke-test entry added

### v0.4.0 — Unity MCP Integration (Historical)

**New MCP server:** unity-mcp (CoplayDev), for interactive AI-assisted dev with Unity Editor. This is superseded by the Unity CLI in current releases.

#### What changed
- **New MCP integration**: `unity` — Adds optional support for the [CoplayDev unity-mcp](https://github.com/CoplayDev/unity-mcp) server, giving OCGS agents in Unity projects access to ~50+ tools for scene, script, and asset management. Requires Unity Editor running. Configure via `setup-engine` §7.4.
- **setup-engine skill**: Added section 7.4 covering unity-mcp prerequisites (Unity 2021.3+, Python 3.10+, `uv`), install steps, and the Editor-running constraint.
- **Module version**: `engine-unity` bumped from 0.6.0 → 0.7.0; description updated to mention the unity-mcp integration.
- **Agent files**: 5 unity specialists (`unity-specialist`, `unity-dots-specialist`, `unity-shader-specialist`, `unity-addressables-specialist`, `unity-ui-specialist`) updated with new `## MCP Integration` sections referencing domain-specific unity-mcp tools.
- **opencode.json**: New `mcp.unity` block (HTTP, `http://localhost:8080/mcp`, disabled by default) — mirrors the `mcp.godot` pattern.

#### New dependency (optional)
The unity-mcp integration requires the CoplayDev unity-mcp package installed in your Unity project (via Unity Package Manager git URL). The integration itself is opt-in: users set `mcp.unity.enabled: true` in `opencode.json` after installing.

#### Safe to overwrite
- `.opencode/modules/engine-unity/modulefile.yaml`

#### Merge carefully
- `opencode.json` — new `mcp.unity` block; if you've customized this file, merge the new block into your existing `mcp` object
- `.opencode/skills/setup-engine/SKILL.md` — has new section 7.4 (and §7.4 SFML3/Raylib renumbered to §7.5 in the root monolith; core copy has just §7.4 with no §7.5 because SFML3/Raylib are optional modules)
- `.opencode/modules/core/skills/setup-engine/SKILL.md` — has new section 7.4 (mirror of the root change, no renumbering)
- `.opencode/modules/engine-unity/agents/unity-specialist.md` — new `## MCP Integration` section
- `.opencode/modules/engine-unity/agents/unity-dots-specialist.md` — new `## MCP Integration` section
- `.opencode/modules/engine-unity/agents/unity-shader-specialist.md` — new `## MCP Integration` section
- `.opencode/modules/engine-unity/agents/unity-addressables-specialist.md` — new `## MCP Integration` section
- `.opencode/modules/engine-unity/agents/unity-ui-specialist.md` — new `## MCP Integration` section
