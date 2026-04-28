# OpenCode Game Studios

Port of [Claude Code Game Studios (CCGS)](https://github.com/Donchitos/Claude-Code-Game-Studios) to [OpenCode](https://opencode.ai).

## Status: Complete ✓

| Component | Original (CCGS) | Ported (OpenCode) | Status |
|-----------|-----------------|-------------------|--------|
| Commands | 72 skills (`.claude/skills/`) | 72 commands (`.opencode/commands/`) | ✓ |
| Agents | 49 agents (`.claude/agents/`) | 49 agents (`.opencode/agents/`) | ✓ |
| Hooks | 12 bash hooks (`.claude/hooks/`) | 1 TypeScript plugin (`.opencode/plugins/`) | ✓ |
| Rules | 11 rule files (`.claude/rules/`) | 11 rule files (`.opencode/rules/`) | ✓ |
| Config | `CLAUDE.md` + `.claude/settings.json` | `AGENTS.md` + `opencode.json` | ✓ |

## Quick Start

```bash
opencode
```

Type `/` to see all 72 commands, or try `/start` for onboarding.

## Key Mappings

| CCGS (Claude Code) | OpenCode |
|--------------------|----------|
| `.claude/skills/*.md` | `.opencode/commands/*.md` |
| `.claude/agents/*.md` | `.opencode/agents/*.md` |
| `.claude/hooks/*.sh` | `.opencode/plugins/ccgs-hooks.ts` |
| `.claude/rules/*.md` | `.opencode/rules/*.md` |
| `CLAUDE.md` | `AGENTS.md` |
| `.claude/settings.json` | `opencode.json` |

## Model Mapping

| CCGS Model | OpenCode Model |
|------------|---------------|
| `opus` | `kimi-k2.6` |
| `sonnet` | `qwen3.6-plus` |
| `haiku` | `deepseek-v4-flash` |

## Directory Structure

```
/
├── AGENTS.md                    # Project configuration
├── opencode.json                # OpenCode config (permissions, plugins)
├── .opencode/
│   ├── commands/                # 72 slash commands
│   ├── agents/                  # 49 agent definitions
│   ├── plugins/                 # CCGS hooks plugin
│   └── rules/                   # Coding standards
├── .claude/docs/                # CCGS documentation (referenced by commands)
├── design/                      # Game design documents
├── docs/                        # Technical documentation
├── production/                  # Sprint plans, session logs
└── ...                          # Standard game project directories
```
