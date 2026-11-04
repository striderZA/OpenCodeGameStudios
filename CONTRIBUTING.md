# Contributing

Thanks for your interest in OpenCode Game Studios!

OpenCode Game Studios runs on [OpenCode](https://opencode.ai), [Pi](https://github.com/earendil-works/pi-coding-agent), and [oh-my-pi](https://omp.sh/) (`omp`).

## Quick Start

### OpenCode
```bash
opencode
```

### Pi
```bash
pi
```

### oh-my-pi (omp)
```bash
omp
```

## How to Contribute

1. **Open an issue** first — bug report or feature request
2. Discuss the approach with maintainers
3. Fork the repo and create a branch
4. Make your changes
5. Run the plugin tests: `npm run test:plugins` (needs the `tsx` ESM loader — a plain `node .opencode/plugins/tests/test-<name>.mjs` will fail, since the tests import `.ts` sources)
6. Submit a pull request

## Commit Conventions

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <imperative summary>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `build`, `ci`
Scope: the affected system (e.g., `plugin`, `agents`, `docs`)

Examples:
- `feat(plugin): add session-start time tracking`
- `fix(agents): correct delegation map for a specialist`
- `docs: explain harness-neutral frontmatter`

### Git hooks

These rules are enforced locally by tracked hooks in `.githooks/`:

- **`commit-msg`** — rejects non-conventional messages: unknown or uppercase type,
  empty or malformed scope, trailing period, header over 100 characters, and a `!`
  header without a `BREAKING CHANGE:` footer. Git-generated `Merge …`, `Revert "…"`,
  `fixup!`/`squash!` and `Initial commit` messages are exempt.
- **`pre-commit`** — blocks staged credentials, unresolved conflict markers and files
  over 20 MB, checks that the `.opencode/*` redirect stubs still resolve, and runs
  `tests/agents/validate.mjs --no-report` plus `tests/workflow/run-all.mjs` when
  `.agents/`, `tests/agents/` or `AGENTS.md` is staged — or `npm run test:plugins`
  when `.opencode/plugins/` is staged.

Install once per clone (also runs on `npm install` via `prepare`):

```bash
npm run hooks:install   # sets core.hooksPath=.githooks
```

Bypass a single commit with `git commit --no-verify`. Skip only the framework/plugin
gates with `OCGS_SKIP_HOOK_CHECKS=1 git commit …`; the secret scan always runs.
Hook behavior is covered by `npm run test:hooks`.

## Pull Request Process

- Keep PRs focused — one feature/fix per PR
- Update tests if changing plugin behavior
- Update README if changing public interface
- All tests must pass before merge

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).
