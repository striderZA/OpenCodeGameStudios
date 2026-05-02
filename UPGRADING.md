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

### Strategy C — Manual file copy

Best when: you didn't use git to set up the template (just downloaded a zip).

1. Download or clone the new version alongside your repo.
2. Copy the files listed under **"Safe to overwrite"** directly.
3. For files under **"Merge carefully"**, open both versions side-by-side and manually merge the structural changes while keeping your content.
