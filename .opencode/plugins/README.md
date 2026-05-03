# Plugin Architecture

OpenCode plugins are TypeScript modules that register lifecycle hooks with the
OpenCode runtime. Each plugin is a self-contained `.ts` file in `.opencode/plugins/`.

## Available Plugins

| Plugin | Purpose | Hooks |
|--------|---------|-------|
| `ccgs-hooks.ts` | Session lifecycle, commit validation, asset checks, agent logging, gap detection | `session.created`, `session.idle`, `experimental.session.compacting`, `experimental.compaction.autocontinue`, `tool.execute.before`, `tool.execute.after` |
| `drift-detector.ts` | Detects agent/skill/command template drift | `session.created` (scan), `tool.execute.after` (single-file check) |
| `changelog-generator.ts` | Generates CHANGELOG.md from conventional commits | `session.idle` (preview), `tool.execute.before` (command detection) |

## Plugin Structure

Every plugin follows this pattern:

```typescript
import type { Plugin } from "@opencode-ai/plugin"

export const MyPlugin: Plugin = async ({ project, client, directory, worktree }) => {
  const projectRoot = directory || worktree || process.cwd()

  return {
    // Lifecycle hooks
    event: async ({ event }) => {
      if (event.type === "session.created") { /* ... */ }
    },

    // Tool hooks (before execution)
    "tool.execute.before": async (input, output) => {
      // Modify output.args to change tool behavior
      // Throw to block the tool from executing
    },

    // Tool hooks (after execution)
    "tool.execute.after": async (input, output) => {
      // React to completed tool calls
    },

    // Compaction hooks
    "experimental.session.compacting": async (input, output) => {
      // Feed context into the compaction event
      output.context.push("Additional context for the compacted session")
    },

    "experimental.compaction.autocontinue": async (input, output) => {
      // Add instructions for the auto-continued session
    },
  }
}
```

## Hook Types

### `event`
Fires on session lifecycle events: `session.created`, `session.idle`, `server.instance.disposed`.

### `tool.execute.before`
Fires before any tool executes. Use to:
- Validate input parameters
- Block dangerous operations (push to protected branches)
- Log agent invocations
- Modify tool arguments

Throw an Error to prevent the tool from executing.

### `tool.execute.after`
Fires after tool completion. Use to:
- Validate output/result files
- Detect file pattern changes (skill modifications)
- Log agent completions

### `experimental.session.compacting`
Fires when context compression is about to occur. Use to inject recovery context:
```typescript
"experimental.session.compacting": async (input, output) => {
  output.context.push("Current task: implementing player movement system...")
}
```

### `experimental.compaction.autocontinue`
Fires after compaction when the session auto-continues. Use to guide the session to recover state.

## Logger Pattern

All plugins should use a structured logger:

```typescript
function createPluginLogger(client: any, service: string) {
  const log = (level: string, message: string, extra?: any) => {
    client?.app?.log({ body: { service, level, message, extra } }).catch(() => {})
  }
  return {
    debug: (m: string, x?: any) => log("debug", m, x),
    info: (m: string, x?: any) => log("info", m, x),
    warn: (m: string, x?: any) => log("warn", m, x),
    error: (m: string, x?: any) => log("error", m, x),
  }
}
```

## Adding a New Plugin

1. Create `{plugin-name}.ts` in `.opencode/plugins/`
2. Export a `Plugin` instance (`export const MyPlugin: Plugin = ...`)
3. Register the plugin in `opencode.json` under the `plugins` array
4. Write tests in `.opencode/plugins/tests/` following the `test-*.mjs` naming convention
5. Document the plugin in this README

## Error Handling Guidelines

- Always wrap hook handlers in try/catch
- Log errors via the plugin logger (don't throw from `event` handlers)
- Throw from `tool.execute.before` only to block a tool from executing
- Use `logAudit()` for persistent audit trail (ccgs-hooks utility)
- Never throw from `tool.execute.after` (tool already completed)

## Testing

Tests are Node.js ESM scripts in `.opencode/plugins/tests/`. Each test:
- Imports the plugin's exported functions
- Passes simulated project context
- Asserts expected output

Run all plugin tests:
```bash
node .opencode/plugins/tests/test-*.mjs
```

## Plugin Configuration

Plugins are configured in `opencode.json`:

```json
{
  "plugins": [
    ".opencode/plugins/ccgs-hooks.ts",
    ".opencode/plugins/drift-detector.ts",
    ".opencode/plugins/changelog-generator.ts"
  ]
}
```

Plugins load in order. The first plugin's hooks fire first.
