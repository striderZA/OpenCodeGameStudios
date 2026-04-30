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

### Strategy C — Manual file copy

Best when: you didn't use git to set up the template (just downloaded a zip).

1. Download or clone the new version alongside your repo.
2. Copy the files listed under **"Safe to overwrite"** directly.
3. For files under **"Merge carefully"**, open both versions side-by-side and manually merge the structural changes while keeping your content.
