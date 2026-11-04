import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  cpSync,
  rmSync,
  readdirSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import {
  HARNESS_IDS,
  HARNESS_TARGETS,
  parseHarnessArgs,
  claudeAgentMarkdown,
  codexAgentToml,
  ompAgentMarkdown,
} from '../../tools/lib/harness-targets.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '..', '..');
const INSTALLER = join(REPO, '.opencode', 'modules', 'install.mjs');

const AGENT_MD = `---
description: "Demo agent for installer tests."
maxTurns: 10
---

You are the Demo Agent. Follow the test instructions.
`;

const MODULEFILE = `name: demo
version: "1.0.0"
description: "Installer test module."
depends: []
`;

function harnessFragment(harness) {
  const args = ['--directory', 'tools/aseprite-mcp', 'run', '-m', 'aseprite_mcp'];
  switch (harness) {
    case 'opencode':
      return {
        demo: {
          type: 'local',
          command: ['uv', ...args],
          codemode: false,
          environment: { ASEPRITE_PATH: '{env:ASEPRITE_PATH}' },
        },
      };
    case 'pi':
      return {
        demo: {
          command: 'uv',
          args,
          env: { ASEPRITE_PATH: '${ASEPRITE_PATH}' },
          exposure: 'direct',
        },
      };
    case 'omp':
      return {
        demo: {
          type: 'stdio',
          command: 'uv',
          args,
          env: { ASEPRITE_PATH: '${ASEPRITE_PATH}' },
        },
      };
    case 'claude':
      return {
        demo: {
          command: 'uv',
          args,
          env: { ASEPRITE_PATH: '${ASEPRITE_PATH}' },
        },
      };
    case 'codex':
      return {
        demo: {
          command: 'uv',
          args,
          env_vars: ['ASEPRITE_PATH'],
          enabled: true,
        },
      };
    default:
      throw new Error(`Unknown harness ${harness}`);
  }
}

function writeModule(root, modulesRoot) {
  const dir = join(root, modulesRoot, 'demo');
  mkdirSync(join(dir, 'agents'), { recursive: true });
  mkdirSync(join(dir, 'skills', 'demo'), { recursive: true });
  mkdirSync(join(dir, 'commands'), { recursive: true });
  mkdirSync(join(dir, 'rules'), { recursive: true });
  mkdirSync(join(dir, 'plugins'), { recursive: true });
  mkdirSync(join(dir, 'docs'), { recursive: true });
  mkdirSync(join(dir, 'mcp'), { recursive: true });

  writeFileSync(join(dir, 'modulefile.yaml'), MODULEFILE);
  writeFileSync(join(dir, 'agents', 'demo-agent.md'), AGENT_MD);
  writeFileSync(join(dir, 'skills', 'demo', 'SKILL.md'), '---\nname: demo\ndescription: "Demo skill."\n---\n\nDemo body.\n');
  writeFileSync(join(dir, 'commands', 'demo.md'), '---\nname: demo\ndescription: "Demo command."\n---\n\nDemo command.\n');
  writeFileSync(join(dir, 'rules', 'demo-rule.md'), '---\npaths:\n  - "src/**"\n---\n\n# Demo rule\n');
  writeFileSync(join(dir, 'plugins', 'demo.ts'), 'export const demo = true;\n');
  writeFileSync(join(dir, 'docs', 'demo.md'), '# Demo docs\n');

  for (const harness of HARNESS_IDS) {
    writeFileSync(
      join(dir, 'mcp', `${harness}.json`),
      JSON.stringify(harnessFragment(harness), null, 2) + '\n',
    );
  }
}

function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), 'ocgs-harness-'));
  mkdirSync(join(root, 'tools', 'lib'), { recursive: true });
  mkdirSync(join(root, '.opencode', 'modules'), { recursive: true });
  mkdirSync(join(root, '.agents', 'modules'), { recursive: true });

  cpSync(join(REPO, 'tools', 'lib', 'parse-modulefile.mjs'), join(root, 'tools', 'lib', 'parse-modulefile.mjs'));
  cpSync(join(REPO, 'tools', 'lib', 'harness-targets.mjs'), join(root, 'tools', 'lib', 'harness-targets.mjs'));
  cpSync(join(REPO, 'tools', 'lib', 'mcp-targets.mjs'), join(root, 'tools', 'lib', 'mcp-targets.mjs'));
  cpSync(join(REPO, '.opencode', 'modules', 'install.mjs'), join(root, '.opencode', 'modules', 'install.mjs'));

  writeModule(root, '.opencode/modules');
  writeModule(root, '.agents/modules');

  writeFileSync(join(root, 'opencode.json'), JSON.stringify({
    mcp: { servers: { existing: { type: 'local', command: ['keep'] } } },
    permissions: [],
  }, null, 2) + '\n');

  mkdirSync(join(root, '.omp'), { recursive: true });
  writeFileSync(join(root, '.omp', 'mcp.json'), JSON.stringify({
    mcpServers: { existing: { type: 'stdio', command: 'keep' } },
  }, null, 2) + '\n');

  mkdirSync(join(root, '.codex'), { recursive: true });
  writeFileSync(join(root, '.codex', 'config.toml'), '# keep this comment\n\n[agents]\nmax_concurrent_threads_per_session = 4\n');

  return root;
}

function runInstaller(root, args) {
  return spawnSync(process.execPath, [join(root, '.opencode', 'modules', 'install.mjs'), ...args], {
    cwd: root,
    encoding: 'utf-8',
  });
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf-8'));
}

test('parseHarnessArgs defaults to opencode and consumes aliases', () => {
  assert.deepEqual(parseHarnessArgs(['list']), { harness: 'opencode', rest: ['list'] });
  assert.deepEqual(parseHarnessArgs(['list', '--pi']), { harness: 'pi', rest: ['list'] });
  assert.deepEqual(
    parseHarnessArgs(['add', 'core', '--harness', 'codex', '--force']),
    { harness: 'codex', rest: ['add', 'core', '--force'] },
  );
  assert.throws(() => parseHarnessArgs(['list', '--harness', 'nope']), /Unknown harness/);
});

test('every harness installs its own content and MCP file', async (t) => {
  const cases = {
    opencode: {
      file: '.opencode/skills/demo/SKILL.md',
      mcp: 'opencode.json',
      check: (root) => {
        const config = readJson(join(root, 'opencode.json'));
        assert.equal(config.mcp.servers.demo.type, 'local');
        assert.equal(config.mcp.servers.existing.command[0], 'keep');
        assert.ok(existsSync(join(root, '.opencode/agents/demo-agent.md')));
        assert.ok(existsSync(join(root, '.opencode/plugins/demo.ts')));
      },
    },
    pi: {
      file: '.agents/skills/demo/SKILL.md',
      mcp: '.pi/mcp.json',
      check: (root) => {
        const config = readJson(join(root, '.pi/mcp.json'));
        assert.equal(config.mcpServers.demo.exposure, 'direct');
        assert.ok(existsSync(join(root, '.agents/agents/demo-agent.md')));
      },
    },
    omp: {
      file: '.agents/skills/demo/SKILL.md',
      mcp: '.omp/mcp.json',
      check: (root) => {
        const config = readJson(join(root, '.omp/mcp.json'));
        assert.equal(config.mcpServers.demo.type, 'stdio');
        assert.equal(config.mcpServers.existing.command, 'keep');

        const agent = readFileSync(join(root, '.omp/agents/demo-agent.md'), 'utf-8');
        assert.match(agent, /^name: demo-agent$/m);
        assert.match(agent, /^description: "Demo agent for installer tests\."$/m);
        assert.match(agent, /Follow the test instructions\./);
        assert.doesNotMatch(agent, /^maxTurns:/m);
        assert.ok(!existsSync(join(root, '.agents/agents/demo-agent.md')));
      },
    },
    claude: {
      file: '.claude/skills/demo/SKILL.md',
      mcp: '.mcp.json',
      check: (root) => {
        const config = readJson(join(root, '.mcp.json'));
        assert.ok(config.mcpServers.demo);
        const agent = readFileSync(join(root, '.claude/agents/demo-agent.md'), 'utf-8');
        assert.match(agent, /^name: demo-agent$/m);
        assert.ok(existsSync(join(root, '.claude/commands/demo.md')));
        assert.ok(existsSync(join(root, '.claude/rules/demo-rule.md')));
      },
    },
    codex: {
      file: '.agents/skills/demo/SKILL.md',
      mcp: '.codex/config.toml',
      check: (root) => {
        const toml = readFileSync(join(root, '.codex/config.toml'), 'utf-8');
        assert.match(toml, /# keep this comment/);
        assert.match(toml, /\[agents\]/);
        assert.match(toml, /\[mcp_servers\.demo\]/);
        assert.match(toml, /env_vars = \["ASEPRITE_PATH"\]/);
        const agent = readFileSync(join(root, '.codex/agents/demo-agent.toml'), 'utf-8');
        assert.match(agent, /^name = "demo-agent"$/m);
        assert.match(agent, /^developer_instructions = """$/m);
        assert.ok(!existsSync(join(root, '.codex/commands')));
      },
    },
  };

  for (const [harness, spec] of Object.entries(cases)) {
    await t.test(harness, () => {
      const root = makeFixture();
      try {
        const result = runInstaller(root, ['add', 'demo', '--harness', harness]);
        assert.equal(result.status, 0, result.stderr || result.stdout);
        assert.ok(existsSync(join(root, spec.file)), `${spec.file} missing`);
        assert.ok(existsSync(join(root, spec.mcp)), `${spec.mcp} missing`);
        spec.check(root);

        const remove = runInstaller(root, ['remove', 'demo', '--harness', harness]);
        assert.equal(remove.status, 0, remove.stderr || remove.stdout);
        assert.ok(!existsSync(join(root, spec.file)), `${spec.file} not removed`);
        if (harness === 'omp') {
          assert.ok(!existsSync(join(root, '.omp/agents/demo-agent.md')), 'omp agent not removed');
        }
        if (harness === 'codex') {
          const toml = readFileSync(join(root, '.codex/config.toml'), 'utf-8');
          assert.doesNotMatch(toml, /\[mcp_servers\.demo\]/);
          assert.match(toml, /\[agents\]/);
        }
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });
  }
});

test('remove keeps user-modified files', () => {
  const root = makeFixture();
  try {
    assert.equal(runInstaller(root, ['add', 'demo', '--harness', 'claude']).status, 0);
    const skill = join(root, '.claude/skills/demo/SKILL.md');
    writeFileSync(skill, 'user changed this\n');

    assert.equal(runInstaller(root, ['remove', 'demo', '--harness', 'claude']).status, 0);
    assert.ok(existsSync(skill), 'modified file should be kept');
    assert.equal(readFileSync(skill, 'utf-8'), 'user changed this\n');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('legacy string install records still remove', () => {
  const root = makeFixture();
  try {
    assert.equal(runInstaller(root, ['add', 'demo', '--harness', 'pi']).status, 0);

    const statePath = join(root, '.agents/modules/installed.json');
    const state = readJson(statePath);
    state.demo.files = ['skills/demo/SKILL.md', 'agents/demo-agent.md'];
    writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n');

    assert.equal(runInstaller(root, ['remove', 'demo', '--harness', 'pi']).status, 0);
    assert.ok(!existsSync(join(root, '.agents/skills/demo/SKILL.md')));
    assert.ok(!existsSync(join(root, '.agents/agents/demo-agent.md')));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('malformed MCP fragment aborts before copying files', () => {
  const root = makeFixture();
  try {
    writeFileSync(join(root, '.agents/modules/demo/mcp/claude.json'), '{ not json');
    const result = runInstaller(root, ['add', 'demo', '--harness', 'claude']);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Invalid JSON/);
    assert.ok(!existsSync(join(root, '.claude/skills/demo/SKILL.md')));
    assert.ok(!existsSync(join(root, '.claude/modules/installed.json')));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('unknown harness exits non-zero with a clear message', () => {
  const root = makeFixture();
  try {
    const result = runInstaller(root, ['list', '--harness', 'nope']);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Unknown harness 'nope'/);
    assert.match(result.stderr, /opencode, pi, omp, claude, codex/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('claude transform injects name only when missing', () => {
  const withName = '---\nname: x\ndescription: "d"\n---\n\nbody\n';
  assert.equal(claudeAgentMarkdown(withName, 'x.md'), withName);
  const withoutName = '---\ndescription: "d"\n---\n\nbody\n';
  assert.match(claudeAgentMarkdown(withoutName, 'x.md'), /^name: x$/m);
});

test('omp transform emits required frontmatter and drops maxTurns', () => {
  const md = ompAgentMarkdown(AGENT_MD, 'demo-agent.md');
  assert.match(md, /^name: demo-agent$/m);
  assert.match(md, /^description: "Demo agent for installer tests\."$/m);
  assert.doesNotMatch(md, /^maxTurns:/m);
  assert.match(md, /Follow the test instructions\./);
});

test('codex transform emits required TOML fields', () => {
  const toml = codexAgentToml(AGENT_MD, 'demo-agent.md');
  assert.match(toml, /^name = "demo-agent"$/m);
  assert.match(toml, /^description = "Demo agent for installer tests\."$/m);
  assert.match(toml, /^developer_instructions = """$/m);
  assert.match(toml, /Follow the test instructions\./);
});

test('registry declares a target and MCP file for every harness', () => {
  for (const id of HARNESS_IDS) {
    const target = HARNESS_TARGETS[id];
    assert.equal(target.id, id);
    assert.ok(target.sourceRoot);
    assert.ok(target.stateFile);
    assert.ok(target.mcp.file);
  }
});

test('art MCP fragments are mirrored in both module source trees', () => {
  const canonical = join(REPO, '.agents', 'modules', 'art', 'mcp');
  const mirror = join(REPO, '.opencode', 'modules', 'art', 'mcp');
  const files = readdirSync(canonical).sort();

  assert.deepEqual(files, HARNESS_IDS.map((id) => `${id}.json`).sort());
  for (const file of files) {
    assert.equal(
      readFileSync(join(mirror, file), 'utf-8'),
      readFileSync(join(canonical, file), 'utf-8'),
      `${file} differs between module source trees`,
    );
  }
});
