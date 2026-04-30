# Contributing

Thanks for your interest in OpenCode Game Studios!

## Quick Start

```bash
git clone https://github.com/striderZA/OpenCodeGameStudios.git
cd OpenCodeGameStudios
opencode
```

## How to Contribute

1. **Open an issue** first — bug report or feature request
2. Discuss the approach with maintainers
3. Fork the repo and create a branch
4. Make your changes
5. Run the plugin tests: `node .opencode/plugins/tests/test-<name>.mjs`
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
- `fix(agents): correct model prefix for director agents`
- `docs: add model assignment strategy section`

## Pull Request Process

- Keep PRs focused — one feature/fix per PR
- Update tests if changing plugin behavior
- Update README if changing public interface
- All tests must pass before merge

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).
