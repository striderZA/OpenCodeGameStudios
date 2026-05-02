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

## Recommended

| Tool | Used By | Purpose | Install |
| ---- | ---- | ---- | ---- |
| **Node.js 18+** | Hooks plugin | Runtime for the CCGS TypeScript hooks plugin | [nodejs.org](https://nodejs.org/) |

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

## What Happens Without Optional Tools

| Missing Tool | Effect |
| ---- | ---- |
| **Node.js** | The hooks plugin (`ccgs-hooks.ts`) cannot execute. All hook events silently pass through. Commits, pushes, and all other operations still work. |

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
