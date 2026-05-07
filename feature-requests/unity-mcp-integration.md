---
name: Unity MCP integration
about: Add Unity Engine support alongside existing Godot setup
title: 'feat: Unity MCP integration'
labels: enhancement
assignees: ''
---

**Is your feature request related to a problem?**
The project is currently locked to Godot 4. Unity developers cannot contribute or prototype within this repo's agent framework. The `.opencode/agents/` directory has dedicated Unity specialist agents (`unity-specialist`, `unity-dots-specialist`, etc.) but no tooling, MCP server, or engine reference docs to back them up.

**Describe the solution you'd like**

1. **Unity MCP server** — Install and configure a Unity MCP server (e.g., `unity-mcp`) so agents can inspect scenes, assets, and project state directly from conversation.
2. **Engine reference docs** — Populate `docs/engine-reference/unity/` with version-pinned API snapshots for the target Unity version (determine via `hub` or project file).
3. **Agent wiring** — Configure the existing Unity specialist agents in `.opencode/agents/` to use the MCP server and reference docs.
4. **Template documentation** — Add Unity-specific sections to `setup-engine` skill and onboarding flow (`/start`, `/setup-engine unity <version>`).

**Describe alternatives you've considered**

- Dual-repo setup (Godot + Unity in separate repos) — loses cross-studio coordination and shared agent config.
- Unreal-only + Godot — doesn't cover the Unity use case.
- Manual Unity workflows without MCP — agents can't inspect project state, severely limiting automated dev-story and code-review.

**Additional context**

The OCGS template already ships Unity specialist agents at `.opencode/agents/unity-specialist.md`, `unity-dots-specialist.md`, `unity-shader-specialist.md`, `unity-addressables-specialist.md`, and `unity-ui-specialist.md`. This FR activates them.
