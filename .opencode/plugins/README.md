# Plugin Architecture

OpenCode V2 plugins are TypeScript modules with a stable `id` and a `setup(ctx)`
entrypoint. `setup` registers hooks through the plugin context; each hook is
removed when the plugin unloads. These project plugins are listed in
`opencode.json` under the plural `plugins` key.

## Available Plugins

| Plugin | Purpose | V2 events and hooks |
|--------|---------|---------------------|
| `ccgs-hooks.ts` | Session lifecycle, commit validation, asset checks, agent logging, gap detection | Events: `session.created`, `session.idle`, `session.compacted`; `session.compaction`; `tool.execute.before`, `tool.execute.after` |
| `drift-detector.ts` | Detects agent/skill/command template drift | Event: `session.created`; `tool.execute.after` |
| `changelog-generator.ts` | Generates and previews CHANGELOG.md from conventional commits | Event: `session.idle`; `tool.execute.before` |

## Plugin Structure

The V2 SDK exposes `Plugin.define`, which returns the plugin definition. The
definition is the default export:

```typescript
import { Plugin } from "@opencode/plugin"

export default Plugin.define({
  id: "ocgs.example",
  async setup(ctx) {
    const controller = new AbortController()

    await ctx.tool.hook("execute.before", (event) => {
      if (event.tool === "bash") {
        const input = event.input as { command?: string }
        console.info("[example] command", input.command)
      }
    })

    await ctx.session.hook("compaction", (event) => {
      event.system.push({ type: "text", text: "Recovery context for compaction." })
    })

    void (async () => {
      for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
        if (event.type === "session.idle") console.info("[example] session idle")
      }
    })()

    return () => controller.abort()
  },
})
```

Use `ctx.location.directory` as the plugin's project directory. V2 tool hooks
receive one event object: `event.tool` identifies the tool and `event.input`
contains its arguments. `execute.after` also includes a `status` and either a
`result` or an `error`.

## V2 Hook APIs

### Events

Subscribe to public server events with `ctx.event.subscribe()`. The returned
async iterable accepts an `AbortSignal`; abort it in the cleanup function
returned by `setup`.

Use `event.location?.directory` when the envelope includes a location.
`session.created` also carries its location in `event.data.location`. For
locationless session events, resolve `event.data.sessionID` with
`ctx.session.get()` and ignore events whose location cannot be resolved.

### `ctx.tool.hook("execute.before", handler)`

Runs before a tool executes. Inspect or modify `event.input`. Throw an error
when the tool must be blocked.

### `ctx.tool.hook("execute.after", handler)`

Runs after tool completion or failure. Inspect `event.input` and
`event.status`; successful calls have `event.result`, failed calls have
`event.error`. This hook cannot undo an operation that has already completed.

### `ctx.session.hook("compaction", handler)`

Runs before a checkpoint summary is generated. Add recovery instructions to
`event.system` as text parts:

```typescript
await ctx.session.hook("compaction", (event) => {
  event.system.push({ type: "text", text: "Read the active session state after compaction." })
})
```

OpenCode V2 has no direct equivalent of the V1
`experimental.compaction.autocontinue` hook. Use the public
`session.compacted` event for post-compaction notifications.

## Logging and Errors

The V2 context does not expose the V1 `client.app.log` method. Use the
supported console methods for plugin diagnostics:

```typescript
console.info("[example] plugin loaded", { directory: ctx.location.directory })
```

Catch and report failures inside background event subscriptions. Throw from
`execute.before` only when blocking a tool is intentional. Do not rely on an
`execute.after` error to roll back completed side effects. Use `logAudit()` in
CCGSHooks when a persistent audit record is required.

## Adding a New Plugin

1. Create `{plugin-name}.ts` in `.opencode/plugins/`.
2. Default-export a V2 plugin definition with a stable ID and `setup(ctx)`.
3. Add its local path to the `plugins` array in `opencode.json`.
4. Add behavior tests in `.opencode/plugins/tests/` using the `test-*.mjs` naming convention.
5. Document the plugin in this README.

## Testing

Tests are Node.js ESM scripts in `.opencode/plugins/tests/`. They import
plugin helpers or default definitions, pass V2-shaped context values, and
assert behavior.

Run the plugin tests with:

```bash
npm run test:plugins
```

## Plugin Configuration

The three core plugins are explicitly configured in `opencode.json`:

```json
{
  "plugins": [
    "./.opencode/plugins/ccgs-hooks.ts",
    "./.opencode/plugins/drift-detector.ts",
    "./.opencode/plugins/changelog-generator.ts"
  ]
}
```

Plugins load in configuration order.
