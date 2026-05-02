# Active Hooks

All 12 bash hooks from CCGS are ported to a single TypeScript plugin
at **`.opencode/plugins/ccgs-hooks.ts`**. Hooks fire automatically
via OpenCode's plugin event system:

| # | Original Hook | 🔌 OpenCode Event | 🧪 Tests |
|---|-----------|-------------------|:--------:|
| 1 | `session-start.sh` | `session.created` | **18** |
| 2 | `session-stop.sh` | `session.idle` / `server.instance.disposed` | **10** |
| 3 | `detect-gaps.sh` | `session.created` | **15** |
| 4 | `log-agent.sh` | `tool.execute.before` (task) | **5** |
| 5 | `log-agent-stop.sh` | `tool.execute.after` (task) | **4** |
| 6 | `validate-assets.sh` | `tool.execute.after` | **16** |
| 7 | `validate-commit.sh` | `tool.execute.before` (git commit) | **17** |
| 8 | `validate-push.sh` | `tool.execute.before` (git push) | **13** |
| 9 | `validate-skill-change.sh` | `tool.execute.after` | **12** |
| 10 | `pre-compact.sh` | `experimental.session.compacting` | **14** |
| 11 | `post-compact.sh` | `experimental.compaction.autocontinue` | **5** |
| 12 | `notify.sh` | Utility (`showNotification`) | — |

## Running Tests

Run a test suite against the hooks plugin:

```bash
node .opencode/plugins/tests/test-<name>.mjs
```

For example, to run the commit validation tests:

```bash
node .opencode/plugins/tests/test-validate-commit.mjs
```

For a complete list of test suites, see the [README](/README.md#-hooks-plugin) Hooks Plugin section.
