# Setup Requirements

This template requires a few tools to be installed for full functionality.
All hooks fail gracefully if tools are missing — nothing will break, but
you'll lose validation features.

> **New projects:** After cloning this template, run `/init-template` before anything else. It customizes the template with your game name, engine choice, and team preferences, and cleans out example files.

## Required

| Tool | Purpose | Install |
| ---- | ---- | ---- |
| **Git** | Version control, branch management | [git-scm.com](https://git-scm.com/) |
| **OpenCode** | AI agent CLI | `npm install -g opencode` |
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

### Unity-MCP (Optional — Unity Only)

The [unity-mcp](https://github.com/CoplayDev/unity-mcp) server (by CoplayDev) provides runtime tools for AI-assisted interaction with a running Unity Editor. It enables agents to manage assets, control scenes, edit scripts, and read the Editor console during development sessions.

**Prerequisites:**
- Unity 2021.3 LTS or newer
- Python 3.10+ with `uv` (install via `pip install uv` or `winget install astral-sh.uv`)

**Installation:**

The unity-mcp server runs as a package inside Unity Editor (not a standalone CLI). Install via the Unity Package Manager:

```
# In Unity: Window → Package Manager → + → Add package from git URL
# Paste: https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#main
```

Then click **Window → MCP for Unity → "Configure All Detected Clients"** to auto-configure detected MCP clients. OpenCode may require manual config — see below.

**Configuration:**

Add this block to the `mcp` object in your `opencode.json` (the wizard may auto-configure, but manual is the reliable fallback):

```json
"unity": {
  "type": "local",
  "url": "http://localhost:8080/mcp",
  "enabled": false
}
```

Flip `enabled` to `true` once Unity Editor is running.

> ⚠ **Unity Editor must be running** before OCGS agents can use unity-mcp tools. If the Editor is closed, MCP calls will fail with a connection error. Open your project in Unity, then continue.

**Tools provided (selection):**
- `manage_gameobject`, `manage_scene`, `find_gameobjects` — scene and GameObject management
- `create_script`, `script_apply_edits`, `validate_script` — script creation and editing
- `manage_material`, `manage_asset` — material and asset management
- `manage_ui` — UI Toolkit workflows
- `read_console` — Editor console output (errors, warnings, compile status)
- `run_tests` — async test execution (EditMode / PlayMode)
- `batch_execute` — multiple MCP commands in a single batch (10-100x faster)
