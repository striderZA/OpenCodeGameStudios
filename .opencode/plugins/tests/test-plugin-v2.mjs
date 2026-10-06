import * as fs from "node:fs"
import * as path from "node:path"
import { tmpdir } from "node:os"
import { strict as assert } from "node:assert"
import { describe, it } from "node:test"
import { execSync } from "node:child_process"

const runtimePlugins = {
  "ccgs-hooks": await import("../ccgs-hooks.ts"),
  "drift-detector": await import("../drift-detector.ts"),
  "changelog-generator": await import("../changelog-generator.ts"),
}

const modulePlugins = {
  "ccgs-hooks": await import("../../modules/core/plugins/ccgs-hooks.ts"),
  "drift-detector": await import("../../modules/core/plugins/drift-detector.ts"),
  "changelog-generator": await import("../../modules/core/plugins/changelog-generator.ts"),
}

function definition(module) {
  return module.default?.default ?? module.default
}

function createContext(directory, events = [], sessionLocations = {}) {
  const handlers = new Map()
  let signal
  let resolveEventsConsumed
  const eventsConsumed = new Promise((resolve) => {
    resolveEventsConsumed = resolve
  })

  return {
    handlers,
    eventsConsumed,
    get signal() {
      return signal
    },
    context: {
      app: { name: "OpenCode", version: "2.0.23", channel: "stable" },
      location: { directory, project: { directory, canonical: directory } },
      event: {
        subscribe(options = {}) {
          signal = options.signal
          return (async function* () {
            for (const event of events) yield { location: { directory }, ...event }
            resolveEventsConsumed()
            await new Promise((resolve) => {
              if (signal?.aborted) return resolve()
              signal?.addEventListener("abort", resolve, { once: true })
            })
          })()
        },
      },
      session: {
        async get({ sessionID }) {
          const sessionDirectory = sessionLocations[sessionID] ?? directory
          return {
            id: sessionID,
            projectID: "test-project",
            cost: 0,
            tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
            time: { created: new Date(0).toISOString(), updated: new Date(0).toISOString() },
            location: { directory: sessionDirectory },
          }
        },
        async hook(name, handler) {
          handlers.set(`session:${name}`, handler)
          return { dispose: async () => {} }
        },
      },
      tool: {
        async hook(name, handler) {
          handlers.set(`tool:${name}`, handler)
          return { dispose: async () => {} }
        },
      },
    },
  }
}

function makeTempProject(prefix) {
  return fs.mkdtempSync(path.join(tmpdir(), prefix))
}

async function captureConsole(callback) {
  const levels = ["debug", "info", "log", "warn", "error"]
  const originals = Object.fromEntries(levels.map((level) => [level, console[level]]))
  const messages = []
  for (const level of levels) {
    console[level] = (...values) => messages.push(`${level}: ${values.map(String).join(" ")}`)
  }
  try {
    await callback()
  } finally {
    for (const level of levels) console[level] = originals[level]
  }
  return messages
}

async function deliverEvent(pluginModule, projectRoot, event, sessionLocations = {}) {
  const plugin = definition(pluginModule)
  const fixture = createContext(projectRoot, [event], sessionLocations)
  let dispose
  try {
    return await captureConsole(async () => {
      dispose = await plugin.setup(fixture.context)
      await fixture.eventsConsumed
    })
  } finally {
    await dispose?.()
  }
}

for (const [name, module] of Object.entries(runtimePlugins)) {
  it(`exports ${name} with the OpenCode V2 id/setup contract`, () => {
    const plugin = definition(module)
    assert.equal(plugin?.id, `ocgs.${name}`)
    assert.equal(typeof plugin?.setup, "function")
  })
}

for (const [name, module] of Object.entries(modulePlugins)) {
  it(`ships the V2 ${name} plugin from the core module`, () => {
    const plugin = definition(module)
    assert.equal(plugin?.id, `ocgs.${name}`)
    assert.equal(typeof plugin?.setup, "function")
  })
}

it("uses the plural V2 plugin key and registers all three local plugins", () => {
  const config = JSON.parse(fs.readFileSync(new URL("../../../opencode.json", import.meta.url), "utf8"))
  assert.deepEqual(config.plugins, [
    "./.opencode/plugins/ccgs-hooks.ts",
    "./.opencode/plugins/drift-detector.ts",
    "./.opencode/plugins/changelog-generator.ts",
  ])
  assert.equal(Object.hasOwn(config, "plugin"), false)
})

describe("OpenCode V2 hook behavior", () => {
  it("injects session recovery context through the V2 compaction hook", async () => {
    const root = makeTempProject("ocgs-v2-compaction-")
    const stateDir = path.join(root, "production", "session-state")
    fs.mkdirSync(stateDir, { recursive: true })
    fs.writeFileSync(path.join(stateDir, "active.md"), "Recovery marker: keep this task in context.\n")
    const plugin = definition(runtimePlugins["ccgs-hooks"])
    const fixture = createContext(root)
    let dispose

    try {
      assert.equal(typeof plugin?.setup, "function")
      await captureConsole(async () => {
        dispose = await plugin.setup(fixture.context)
        const hook = fixture.handlers.get("session:compaction")
        assert.equal(typeof hook, "function")
        const event = { system: [] }
        await hook(event)
        assert.ok(event.system.some((part) => part.text.includes("Recovery marker: keep this task in context.")))
      })
      assert.ok(fixture.signal instanceof AbortSignal)
      assert.equal(fs.existsSync(path.join(root, "production", "session-logs", "compaction-log.txt")), true)
    } finally {
      await dispose?.()
      fs.rmSync(root, { recursive: true, force: true })
    }
    assert.equal(fixture.signal.aborted, true)
  })

  it("ignores foreign session-idle events before archiving state in both plugin copies", async () => {
    const root = makeTempProject("ocgs-v2-foreign-idle-")
    const stateDir = path.join(root, "production", "session-state")
    const otherProject = path.join(root, "other-project")
    fs.mkdirSync(stateDir, { recursive: true })
    fs.writeFileSync(path.join(stateDir, "active.md"), "Keep this state in its own project.\\n")
    const plugins = [runtimePlugins["ccgs-hooks"], modulePlugins["ccgs-hooks"]]

    try {
      for (const plugin of plugins) {
        await deliverEvent(
          plugin,
          root,
          { type: "session.idle", location: undefined, data: { sessionID: "foreign-session" } },
          { "foreign-session": otherProject },
        )
        assert.equal(fs.existsSync(path.join(root, "production", "session-logs", "session-log.md")), false)
      }
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  it("resolves owner-routed session-idle events without envelope locations", async () => {
    const root = makeTempProject("ocgs-v2-owner-idle-")
    const stateDir = path.join(root, "production", "session-state")
    const sessionLog = path.join(root, "production", "session-logs", "session-log.md")
    fs.mkdirSync(stateDir, { recursive: true })
    fs.writeFileSync(path.join(stateDir, "active.md"), "This owner-routed state must be archived.\\n")
    const plugins = [runtimePlugins["ccgs-hooks"], modulePlugins["ccgs-hooks"]]

    try {
      for (const plugin of plugins) {
        await deliverEvent(plugin, root, {
          type: "session.idle",
          location: undefined,
          data: { sessionID: "owner-session" },
        })
        assert.equal(fs.existsSync(sessionLog), true)
        fs.rmSync(sessionLog, { force: true })
      }
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  it("ignores foreign session-created events in both drift-detector copies", async () => {
    const root = makeTempProject("ocgs-v2-foreign-drift-")
    const agentDir = path.join(root, ".agents", "agents")
    fs.mkdirSync(agentDir, { recursive: true })
    fs.writeFileSync(path.join(agentDir, "broken.md"), "Missing required frontmatter\\n")
    const plugins = [runtimePlugins["drift-detector"], modulePlugins["drift-detector"]]

    try {
      for (const plugin of plugins) {
        const messages = await deliverEvent(plugin, root, {
          type: "session.created",
          location: undefined,
          data: { location: { directory: path.join(root, "other-project") } },
        })
        assert.equal(messages.some((message) => message.includes("Running drift detection scan")), false)
      }
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  it("ignores foreign session-idle events in both changelog-generator copies", async () => {
    const root = makeTempProject("ocgs-v2-foreign-changelog-")
    execSync("git init -q", { cwd: root, stdio: "ignore" })
    execSync("git config user.name Tester", { cwd: root, stdio: "ignore" })
    execSync("git config user.email tester@example.invalid", { cwd: root, stdio: "ignore" })
    fs.writeFileSync(path.join(root, "README.md"), "Project change.\\n")
    execSync("git add README.md", { cwd: root, stdio: "ignore" })
    execSync('git commit -m "feat: add project change"', { cwd: root, stdio: "ignore" })
    const plugins = [runtimePlugins["changelog-generator"], modulePlugins["changelog-generator"]]

    try {
      for (const plugin of plugins) {
        const messages = await deliverEvent(plugin, root, {
          type: "session.idle",
          location: { directory: path.join(root, "other-project") },
        })
        assert.equal(messages.some((message) => message.includes("Changelog generated with unreleased changes")), false)
        assert.equal(fs.existsSync(path.join(root, "CHANGELOG.md")), false)
        assert.equal(fs.existsSync(path.join(root, "CHANGELOG_INTERNAL.md")), false)
      }
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  it("reports invalid V2 asset output without throwing from the after hook", async () => {
    const root = makeTempProject("ocgs-v2-asset-")
    const relativePath = `assets/data/${path.basename(root)}.json`
    const absolutePath = path.join(root, ...relativePath.split("/"))
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true })
    fs.writeFileSync(absolutePath, "not valid JSON\\n")
    const plugin = definition(runtimePlugins["ccgs-hooks"])
    const fixture = createContext(root)
    let dispose

    try {
      assert.equal(typeof plugin?.setup, "function")
      await captureConsole(async () => {
        dispose = await plugin.setup(fixture.context)
        const hook = fixture.handlers.get("tool:execute.after")
        assert.equal(typeof hook, "function")
        const event = {
          tool: "write",
          status: "completed",
          input: { filePath: relativePath },
          result: { content: "File written." },
        }
        await hook(event)
        assert.ok(Array.isArray(event.result.content))
        assert.ok(event.result.content.some((part) => part.type === "text" && part.text.includes("not valid JSON")))
      })
    } finally {
      await dispose?.()
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  it("reads V2 bash input when checking protected-branch pushes", async () => {
    const root = makeTempProject("ocgs-v2-push-")
    execSync("git init -q", { cwd: root, stdio: "ignore" })
    execSync("git checkout -b feature/plugin-v2", { cwd: root, stdio: "ignore" })
    const plugin = definition(runtimePlugins["ccgs-hooks"])
    const fixture = createContext(root)
    let dispose
    let messages

    try {
      assert.equal(typeof plugin?.setup, "function")
      messages = await captureConsole(async () => {
        dispose = await plugin.setup(fixture.context)
        const hook = fixture.handlers.get("tool:execute.before")
        assert.equal(typeof hook, "function")
        await hook({ tool: "bash", input: { command: "git push origin master" } })
      })
    } finally {
      await dispose?.()
      fs.rmSync(root, { recursive: true, force: true })
    }
    assert.ok(messages.some((message) => message.includes("Push to protected branch 'master'")))
  })

  it("blocks invalid data-file commits from V2 bash input", async () => {
    const root = makeTempProject("ocgs-v2-commit-")
    const dataDir = path.join(root, "assets", "data")
    fs.mkdirSync(dataDir, { recursive: true })
    fs.writeFileSync(path.join(dataDir, "broken.json"), "not valid JSON\\n")
    execSync("git init -q", { cwd: root, stdio: "ignore" })
    execSync("git add assets/data/broken.json", { cwd: root, stdio: "ignore" })
    const plugin = definition(runtimePlugins["ccgs-hooks"])
    const fixture = createContext(root)
    let dispose

    try {
      assert.equal(typeof plugin?.setup, "function")
      await captureConsole(async () => {
        dispose = await plugin.setup(fixture.context)
        const hook = fixture.handlers.get("tool:execute.before")
        assert.equal(typeof hook, "function")
        assert.throws(
          () => hook({ tool: "bash", input: { command: "git commit -m 'fix: invalid data'" } }),
          /not valid JSON/,
        )
      })
    } finally {
      await dispose?.()
      fs.rmSync(root, { recursive: true, force: true })
    }
  })


  it("runs the drift scan for a V2 session-created event", async () => {
    const root = makeTempProject("ocgs-v2-event-")
    const agentDir = path.join(root, ".agents", "agents")
    fs.mkdirSync(agentDir, { recursive: true })
    fs.writeFileSync(path.join(agentDir, "broken.md"), "Missing required frontmatter\\n")
    const plugin = definition(runtimePlugins["drift-detector"])
    const fixture = createContext(root, [{
      type: "session.created",
      location: undefined,
      data: { location: { directory: root } },
    }])
    let dispose
    let messages

    try {
      assert.equal(typeof plugin?.setup, "function")
      messages = await captureConsole(async () => {
        dispose = await plugin.setup(fixture.context)
        await fixture.eventsConsumed
      })
    } finally {
      await dispose?.()
      fs.rmSync(root, { recursive: true, force: true })
    }
    assert.ok(messages.some((message) => message.includes("Drift detected: 1 HIGH severity issues")))
  })

  it("passes V2 tool input to drift detection after a successful edit", async () => {
    const root = makeTempProject("ocgs-v2-drift-")
    const agentDir = path.join(root, ".agents", "agents")
    fs.mkdirSync(agentDir, { recursive: true })
    fs.writeFileSync(path.join(agentDir, "broken.md"), "Missing required frontmatter\n")
    const plugin = definition(runtimePlugins["drift-detector"])
    const fixture = createContext(root)
    let dispose
    let messages

    try {
      assert.equal(typeof plugin?.setup, "function")
      messages = await captureConsole(async () => {
        dispose = await plugin.setup(fixture.context)
        const hook = fixture.handlers.get("tool:execute.after")
        assert.equal(typeof hook, "function")
        await hook({
          tool: "edit",
          status: "completed",
          input: { filePath: ".agents/agents/broken.md" },
          result: { output: "updated" },
        })
      })
    } finally {
      await dispose?.()
      fs.rmSync(root, { recursive: true, force: true })
    }
    assert.ok(messages.some((message) => message.includes("HIGH issues")))
  })

  it("reads the V2 tool input when detecting changelog commands", async () => {
    const root = makeTempProject("ocgs-v2-changelog-")
    const plugin = definition(runtimePlugins["changelog-generator"])
    const fixture = createContext(root)
    let dispose
    let messages

    try {
      assert.equal(typeof plugin?.setup, "function")
      messages = await captureConsole(async () => {
        dispose = await plugin.setup(fixture.context)
        const hook = fixture.handlers.get("tool:execute.before")
        assert.equal(typeof hook, "function")
        await hook({ tool: "bash", input: { command: "npm run changelog" } })
      })
    } finally {
      await dispose?.()
      fs.rmSync(root, { recursive: true, force: true })
    }
    assert.ok(messages.some((message) => message.includes("Changelog-related command detected")))
  })
})
