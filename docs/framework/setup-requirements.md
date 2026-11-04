# Setup Requirements

This template requires a few tools to be installed for full functionality.
All hooks fail gracefully if tools are missing — nothing will break, but
you'll lose validation features.

> **New projects:** After cloning this template, run `/init-template` before anything else. It customizes the template with your game name, engine choice, and team preferences, and cleans out example files.

## Required

| Tool | Purpose | Install |
| ---- | ---- | ---- |
| **Git** | Version control, branch management | [git-scm.com](https://git-scm.com/) |
| **OpenCode** | AI agent CLI (via OpenCode) | `npm install -g opencode` |
| **Pi** | AI agent CLI (via Pi) | `npm install -g @earendil-works/pi-coding-agent` |
| **Node.js 18+** | Module CLI + hooks | Runtime for `install.mjs` and the CCGS TypeScript hooks plugin | [nodejs.org](https://nodejs.org/) |

## Recommended

| Tool | Used By | Purpose | Install |
| ---- | ---- | ---- | ---- |
| *(none beyond required)* | | |

### Installing Node.js

**Windows** (any of these):
```
winget install OpenJS.NodeJS.LTS
choco install nodejs-lts
scoop install nodejs
```

**macOS**:
```
brew install node
```

**Linux**:
```
sudo apt install nodejs npm     # Debian/Ubuntu
sudo dnf install nodejs         # Fedora
sudo pacman -S nodejs npm       # Arch
```

## Platform Notes

### Windows
- Git for Windows includes **Git Bash**, which provides `bash`
- Ensure Git Bash is on your PATH (default if installed via the Git installer)
- OpenCode runs natively in PowerShell, CMD, Git Bash, and Windows Terminal

### macOS / Linux
- Node.js and npm are available via your package manager
- OpenCode works in any standard terminal

## Verifying Your Setup

Run these commands to check prerequisites:

```bash
git --version          # Should show git version
node --version         # Should show Node.js 18+
npx opencode --version # Should show OpenCode version
```

## What Happens Without Required Tools

| Missing Tool | Effect |
| ---- | ---- |
| **Git** | No version control — all / commands, hooks, and template tooling assume a git repository. |
| **OpenCode** | The framework cannot run — agents, skills, and commands are all OpenCode-native. |
| **Node.js** | The module CLI (`install.mjs`) and hooks plugin cannot execute. Without Node.js, module installation and commit/push validation are unavailable. |

## Recommended IDE

OpenCode works with any editor:
- **VS Code** with the OpenCode CLI
- **Cursor** (OpenCode compatible)
- **Terminal** — `opencode` CLI directly in any shell
- **JetBrains IDEs** — via the terminal

## Optional Engine Dependencies

### Godot-MCP (Optional — Godot Only)

The [godot-mcp](https://github.com/Coding-Solo/godot-mcp) server provides runtime tools for AI-driven testing and debugging of Godot projects. It enables agents to launch the editor, run projects, and capture debug output automatically.

**Installation:**
```bash
npx @coding-solo/godot-mcp
```

**Configuration:**
The MCP server is configured via `opencode.json` or editor MCP settings. See `/setup-engine` for full setup guidance.

**Tools provided:**
- `launch_editor`, `run_project`, `stop_project` — runtime control
- `get_debug_output` — live debug feedback
- `create_scene`, `add_node`, `save_scene` — scene manipulation
- `get_godot_version`, `get_project_info`, `list_projects` — project introspection

### Unity CLI (Recommended — Unity Only)

Unity's official agent integration is the [Unity CLI](https://docs.unity.com/unity-cli). When an agent can run shell commands, it drives a running Unity 6+ Editor directly through the project's `com.unity.pipeline` package. Unity deprecated the in-Editor MCP server in `com.unity.ai.assistant`; the CLI is its supported replacement. This replaces the community CoplayDev `unity-mcp` package the framework previously recommended.

**Prerequisites:**
- Unity 6.0 (6000.0) or newer for Editor control.
- The Unity CLI — the Hub installs and updates it by default. Verify with `unity --version`; install with `irm https://unity.com/install.ps1 | iex` (Windows PowerShell) or `curl -fsSL https://unity.com/install.sh | bash` (macOS/Linux).
- The `com.unity.pipeline` package in the project — `unity pipeline install --project-path <project>`.

**Setup:**
1. Open the project in Unity 6+.
2. Run `unity status --project-path <project>` and confirm `state: ready`.
3. Run `unity command --project-path <project>` to list the commands the Editor exposes.
4. Optional: install Unity's own skills for supported clients (`unity skill install --list`, then `unity skill install opencode`; OpenCode also has `unity setup opencode`). Pi and omp are not supported by `unity skill install`.

**Usage:** `unity command scene get_hierarchy`, `unity command console get`, `unity command script eval`, `unity recompile`, `unity test`, `unity command editor.playmode start`.

### Unity MCP (Optional — Unity Only)

`unity mcp` (Unity CLI 0.1.0-beta.8 or later) is the CLI's built-in stdio MCP server. Use it only for clients that cannot run shell commands; the CLI itself exposes more commands than the MCP server. It replaces the deprecated in-Editor MCP server and does not use the old relay or port 8080.

**Configure:**
- `unity mcp configure --list` lists supported clients and config paths; `unity mcp configure <client>` writes the entry. Add `--replace-legacy` to remove an old relay entry, but note it only handles Unity's deprecated in-Editor AI Assistant relay and only in the 16 clients it supports. If you followed the framework's previous CoplayDev integration, delete the old `"unity"` entry pointing at `http://localhost:8080/mcp` from each harness config by hand.
- OpenCode (`opencode.json`, `mcp.servers`):

  ```json
  "unity": {
    "type": "local",
    "command": ["unity", "mcp"],
    "disabled": true,
    "codemode": false
  }
  ```

- Pi (`~/.pi/agent/mcp.json`; `exposure: "direct"` is required):

  ```json
  {
    "mcpServers": {
      "unity": {
        "command": "unity",
        "args": ["mcp"],
        "enabled": false,
        "exposure": "direct"
      }
    }
  }
  ```

- omp (`.omp/mcp.json`):

  ```json
  {
    "mcpServers": {
      "unity": {
        "type": "stdio",
        "command": "unity",
        "args": ["mcp"],
        "enabled": false
      }
    }
  }
  ```

- Pass `--project-path <project>` in `args` when the client starts outside the project or multiple Editors are open.

**Tools provided (selection):** `unity-cli-status` (no Editor), `scene_get_hierarchy`, `console_get`, `script_eval`, `editor_playmode_start`, `test_run`, plus the Editor's other commands. Tool names replace spaces and dots with underscores; check `tools/list`, because an older Pipeline package may use flat names. `--cli-tools` adds six read-only CLI tools; `--tools` / `--exclude-tools` trim the list.

> ⚠ **Unity Editor must be running** for Editor commands. Without one, MCP sessions expose only `unity-cli-status`; start Unity and open the project.

**Older Unity:** the CLI drives Unity 6.0+ only. On Unity 2021.3–5.x, the community [MCP for Unity](https://github.com/CoplayDev/unity-mcp) package still works and is unaffected by the deprecation, but it is no longer the framework default.

### Autopilot (Optional — Godot 4.7+ Only)

The [Autopilot](https://github.com/ramenvr/autopilot) addon, by the developers of Aura (Apache-2.0), plays your game open in the Godot editor and reports what it finds. Its results are automated evidence, never a human playtest.

**Requirements:**
- Godot 4.7 or later. Autopilot's addon README documents this and tests on 4.7.2. The addon has no runtime version check.
- OpenCode 2.2.5, Pi 1.x or omp 18.16.0. Autopilot's MCP wiring is verified on all three. Other harnesses are not verified.
- Autopilot's agent service and Bun.
- Your own keys: a TypeSafe decision key and an LLM key, in Autopilot's `autopilot.env`.

**Installation:**
- Install the addon from Autopilot's download into your game project's `addons/autopilot/`. Do not copy it into this repository.
- Enable it in Project > Project Settings > Plugins, then commit the `project.godot` changes it makes.

**Configuration:**
- Add the `autopilot` server to your harness's MCP config, disabled by default. OpenCode: `opencode.json`. Pi: your user-level `~/.pi/agent/mcp.json`, with `exposure` set to `direct`. omp: `.omp/mcp.json` in the project. `/setup-engine` shows the block for your harness. Enable it for a session when you want to run `/autopilot-playtest`, then restart omp if you use it.
- In the Autopilot dock's Privacy step, turn sharing off. It is on by default.
- Exclude `addons/autopilot/*` from export presets.

**Notes:**
- The editor must be open with the Autopilot dock connected, so runs are not CI-ready.
- Full steps: the Setup section of `/autopilot-playtest`.
