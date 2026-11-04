/**
 * Harness targets for the OCGS module installer.
 *
 * One entry per coding-agent harness. Each entry says where module content is
 * installed, where the install state lives, and which file receives MCP
 * fragments. Content stays canonical in `.agents/`; harnesses that cannot read
 * it directly get an install target.
 *
 * Adding a harness here is the only place the installer learns about it.
 */

export const HARNESS_IDS = ['opencode', 'pi', 'omp', 'claude', 'codex'];

/** Convenience flags kept for backward compatibility (`--pi`) and symmetry. */
export const HARNESS_ALIASES = {
  '--opencode': 'opencode',
  '--pi': 'pi',
  '--omp': 'omp',
  '--claude': 'claude',
  '--codex': 'codex',
};

/**
 * Module subdirectories that each harness can consume.
 *
 * `null`/missing means the harness has no equivalent; the installer reports it
 * and skips the directory instead of writing inert files.
 */
export const HARNESS_TARGETS = {
  opencode: {
    id: 'opencode',
    label: 'OpenCode',
    sourceRoot: '.opencode/modules',
    contentRoot: '.opencode',
    stateFile: '.opencode/modules/installed.json',
    dirs: {
      agents: '.opencode/agents',
      skills: '.opencode/skills',
      commands: '.opencode/commands',
      rules: '.opencode/rules',
      plugins: '.opencode/plugins',
      docs: '.opencode/docs',
    },
    transforms: {},
    mcp: { kind: 'opencode-json', file: 'opencode.json' },
    limitations: [],
  },

  pi: {
    id: 'pi',
    label: 'Pi',
    sourceRoot: '.agents/modules',
    contentRoot: '.agents',
    stateFile: '.agents/modules/installed.json',
    dirs: {
      agents: '.agents/agents',
      skills: '.agents/skills',
      commands: '.agents/commands',
      rules: '.agents/rules',
      docs: '.agents/docs',
    },
    transforms: {},
    mcp: { kind: 'mcp-servers-json', file: '.pi/mcp.json' },
    limitations: ['Project MCP config loads only after the project is trusted.'],
  },

  omp: {
    id: 'omp',
    label: 'oh-my-pi (omp)',
    sourceRoot: '.agents/modules',
    contentRoot: '.agents',
    stateFile: '.omp/modules/installed.json',
    dirs: {
      agents: '.omp/agents',
      skills: '.agents/skills',
      commands: '.agents/commands',
      rules: '.agents/rules',
      docs: '.agents/docs',
    },
    transforms: {
      // omp reads project agents from `.omp/agents/`; it does not scan
      // `.agents/agents/`. Generate definitions with omp's required fields.
      agents: { transform: ompAgentMarkdown },
    },
    mcp: { kind: 'mcp-servers-json', file: '.omp/mcp.json' },
    limitations: [
      'Generated agent definitions omit tool restrictions; they inherit the session tool set.',
    ],
  },

  claude: {
    id: 'claude',
    label: 'Claude Code',
    sourceRoot: '.agents/modules',
    contentRoot: '.claude',
    stateFile: '.claude/modules/installed.json',
    dirs: {
      agents: '.claude/agents',
      skills: '.claude/skills',
      commands: '.claude/commands',
      rules: '.claude/rules',
    },
    transforms: {
      // Claude Code requires `name` in subagent frontmatter.
      agents: { transform: claudeAgentMarkdown },
    },
    mcp: { kind: 'mcp-servers-json', file: '.mcp.json' },
    limitations: ['Project .mcp.json servers need approval in an interactive session.'],
  },

  codex: {
    id: 'codex',
    label: 'Codex',
    sourceRoot: '.agents/modules',
    contentRoot: '.codex',
    stateFile: '.codex/modules/installed.json',
    dirs: {
      // Codex reads skills from `.agents/skills` natively; only agents need a
      // project-scoped target.
      agents: '.codex/agents',
      skills: '.agents/skills',
    },
    transforms: {
      agents: { transform: codexAgentToml, extension: '.toml' },
    },
    mcp: { kind: 'codex-toml', file: '.codex/config.toml' },
    limitations: [
      'Codex has no project-level slash commands; skills cover those workflows.',
      'Path-scoped rules do not map; Codex reads AGENTS.md instead.',
      'Project .codex/ config loads only after the project is trusted.',
    ],
  },
};

export function resolveHarness(name) {
  const value = String(name || '').replace(/^--/, '').toLowerCase();
  if (!HARNESS_IDS.includes(value)) {
    throw new Error(
      `Unknown harness '${name}'. Supported: ${HARNESS_IDS.join(', ')}`,
    );
  }
  return HARNESS_TARGETS[value];
}

/**
 * Pull `--harness <id>` and the convenience aliases out of argv.
 * Returns the resolved harness id plus the remaining arguments.
 */
export function parseHarnessArgs(args) {
  const rest = [];
  let harness = 'opencode';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--harness') {
      const value = args[++i];
      if (!value) {
        throw new Error(`--harness requires a value: ${HARNESS_IDS.join(', ')}`);
      }
      harness = value;
    } else if (arg.startsWith('--harness=')) {
      harness = arg.slice('--harness='.length);
    } else if (HARNESS_ALIASES[arg]) {
      harness = HARNESS_ALIASES[arg];
    } else {
      rest.push(arg);
    }
  }

  return { harness: resolveHarness(harness).id, rest };
}

export function describeHarness(id) {
  const target = HARNESS_TARGETS[id];
  return `${target.label} (${target.sourceRoot} → ${Object.values(target.dirs).join(', ')})`;
}

// ── Content transforms ─────────────────────────────────────────────────────

/**
 * Claude Code requires `name` in subagent frontmatter. OCGS agents are named by
 * filename, so inject it when absent and leave the rest of the file untouched.
 */
export function claudeAgentMarkdown(content, filename) {
  if (/^---\r?\n/.test(content) && /^name:/m.test(content.split(/\r?\n---/)[0])) {
    return content;
  }
  const name = filename.replace(/\.[^.]+$/, '');
  return content.replace(/^---\r?\n/, `---\nname: ${name}\n`);
}

/**
 * omp custom agents live in `.omp/agents/<name>.md`. Only `name` and
 * `description` are required; the body is the agent's instructions. OCGS agents
 * omit harness-owned tool and model fields, so neither is emitted.
 */
export function ompAgentMarkdown(content, filename) {
  const { frontmatter, body } = splitFrontmatter(content);
  const meta = parseFrontmatter(frontmatter);
  const name = meta.name || filename.replace(/\.[^.]+$/, '');
  const description = meta.description || '';

  return [
    '---',
    `name: ${name}`,
    `description: ${JSON.stringify(description)}`,
    '---',
    '',
    body.trim(),
    '',
  ].join('\n');
}

/**
 * Codex custom agents are TOML files with `name`, `description`, and
 * `developer_instructions`. The Markdown body becomes the instructions.
 */
export function codexAgentToml(content, filename) {
  const { frontmatter, body } = splitFrontmatter(content);
  const meta = parseFrontmatter(frontmatter);
  const name = meta.name || filename.replace(/\.[^.]+$/, '');
  const description = meta.description || '';

  return [
    `name = ${tomlString(name)}`,
    `description = ${tomlString(description)}`,
    `developer_instructions = ${tomlMultiline(body.trim())}`,
    '',
  ].join('\n');
}

function splitFrontmatter(content) {
  const normalized = content.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) return { frontmatter: '', body: normalized };
  const end = normalized.indexOf('\n---', 4);
  if (end === -1) return { frontmatter: '', body: normalized };
  return {
    frontmatter: normalized.slice(4, end),
    body: normalized.slice(end + 4).replace(/^\n/, ''),
  };
}

function parseFrontmatter(raw) {
  const out = {};
  for (const line of raw.split('\n')) {
    const match = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!match) continue;
    const value = match[2].trim();
    out[match[1]] = /^(['"]).*\1$/.test(value) ? value.slice(1, -1) : value;
  }
  return out;
}

function tomlString(value) {
  return JSON.stringify(String(value));
}

function tomlMultiline(value) {
  const escaped = String(value)
    .replace(/\\/g, '\\\\')
    .replace(/"""/g, '\\"\\"\\"');
  return `"""\n${escaped}\n"""`;
}
