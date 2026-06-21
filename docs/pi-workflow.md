# OCGS Workflow with Pi

This guide covers the day-to-day workflow differences between using OCGS with OpenCode vs Pi.

## Quick Comparison

| Aspect | OpenCode | Pi |
|--------|----------|----|
| **Session start** | `opencode` | `pi` |
| **Skills** | Auto-discovered from `.opencode/skills/` (junction → `.agents/skills/`) | Registered via `ocgs-core` `resources_discover` handler |
| **Commands** | Slash commands via `.opencode/commands/` | Prompt templates + extension commands |
| **Delegation** | Built-in `Task` tool + OCGS plugin | `ocgs-delegation` extension |
| **Decision capture** | OCGS plugin (`question` tool) | `ocgs-question` extension with TUI |
| **Path-scoped rules** | OpenCode rule loading | `ocgs-path-guard` extension |
| **Audit log** | `ccgs-hooks.ts` plugin | `ocgs-audit` extension (byte-identical) |
| **Drift detection** | `drift-detector.ts` plugin | `ocgs-drift-detector` extension (richer — inline tool_result mutation) |
| **Changelog** | `changelog-generator.ts` plugin | `ocgs-changelog` extension (TUI modal) |
| **Content validation** | `validate.mjs` CI script | `ocgs-validate` extension + CI script |
| **Model routing** | `opencode.json` agent config | `.pi/settings.json` scopedModels |
| **Config location** | `opencode.json` + `.opencode/plugins/` | `.pi/extensions/` + `.pi/settings.json` |
| **Extensions/plugins** | TypeScript plugins (OpenCode API) | TypeScript extensions (Pi ExtensionAPI) |

## Starting a Session

```bash
# Instead of:
opencode

# Use:
pi
```

All OCGS skills are available via `/command-name` (same as OpenCode). Pi's `enableSkillCommands: true` setting handles the routing.

## Using Agents

### Delegation (Task tool)

Agent prompts reference the `Task` tool identically in both harnesses:

> "Use the `Task` tool to delegate to `game-designer`: 'Review the combat system GDD'"

In Pi, `ocgs-delegation` registers this tool with all 51 agent names discovered from `.agents/agents/`. The subagent runs in-memory and returns the result.

### Peer Review (/consult)

> "Consult `qa-tester` about: 'Review the current test coverage'"

In Pi, `/consult` spawns a read-only subagent session. The consultant can inspect files but cannot write or execute commands.

## Path-Scoped Rules

Pi's `ocgs-path-guard` injects rules dynamically based on the LLM's working context. Unlike OpenCode which loads rules by directory convention, Pi tracks the last 20 file paths the LLM has touched and matches them against rule globs.

Check which rules are active by looking at Pi's status bar: `rules: ai-code, engine-code`.

## Audit Log

The audit log at `production/session-logs/agent-audit.log` is identical between OpenCode and Pi. This means you can switch harnesses mid-project without losing audit history.

## Pi-Only Enhancements

Pi provides several features that go beyond what OpenCode's plugin API supports:

### 1. Inline Drift Warnings

When `ocgs-drift-detector` finds a missing section after a `write`/`edit`, it appends the warning directly to the tool result. The LLM sees the warning immediately and can respond to it. In OpenCode, the same warning is only recorded in the audit log — the LLM never sees it.

### 2. Question Tool TUI

The `question` tool renders as a full-screen TUI picker with option descriptions, recommended defaults, and custom input. In OpenCode, the `question` tool is text-only.

### 3. Changelog TUI Modal

`/changelog` shows a preview modal with Accept/Edit/Cancel actions. OpenCode's version outputs plain text.

### 4. Real-Time Status Indicators

Pi extensions use `ctx.ui.setStatus()` to show real-time status in the footer:
- `rules: ai-code, engine-code` — active path-guard rules
- `drift: 3 files` — drift detector findings
- `validation: 2 issues` — validate extension findings

## Migration Notes

### Agent Frontmatter

Agent files in `.agents/agents/` do not include `model:`, `mode:`, or `permission:` fields. In Pi, model assignment and tool permissions are configured through `.pi/settings.json`:

```json
{
  "enableSkillCommands": true,
  "packages": []
}
```

For per-agent model routing (future), Pi supports `scopedModels` in settings.

### OpenCode-to-Pi Transition

If you've been using OCGS with OpenCode and want to try Pi:

1. The `.agents/` directory already exists (canonical content)
2. The `.pi/extensions/` directory has all extensions ready
3. Your `.opencode/` configurations remain unchanged — OpenCode still works
4. Start `pi` — the `ocgs-core` barrel loads everything

To switch back, just run `opencode` instead. Both harnesses share the same `.agents/` content.

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Skills not showing in Pi | `ocgs-core` not loading | Check `.pi/extensions/ocgs-core/index.ts` exists |
| `Task` tool not recognized | `ocgs-delegation` failed to load | Check for console errors at Pi startup |
| No rules being injected | Path patterns don't match | Check rule `paths:` globs match actual file paths |
| Audit log empty | `ocgs-audit` not registered | Verify barrel imports `ocgs-audit` |
| `question` tool shows no TUI | Pi running in non-TUI mode | Use interactive mode or check `ctx.mode` |
