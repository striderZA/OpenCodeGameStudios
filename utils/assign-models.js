#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const AGENTS_DIR = path.resolve(__dirname, "..", ".opencode", "agents");
const MODEL_RE = /^(model:\s*).+/m;

function usage() {
  console.log(`
Usage:  node utils/assign-models.js --map <json>   [--dry-run]
        node utils/assign-models.js --config <file> [--dry-run]

Map 49 agent models to your preferred providers in one shot.

Options:
  --map <json>      Inline mapping: {"old-model":"new-model",...}
  --config <file>   JSON config file with same structure
  --dry-run         Preview changes without writing files

Examples:
  node utils/assign-models.js --dry-run --map '{
    "opencode-go/kimi-k2.6":         "anthropic/claude-opus-4",
    "opencode-go/qwen3.6-plus":      "openai/gpt-4o",
    "opencode-go/deepseek-v4-flash": "ollama/llama3.2"
  }'

  node utils/assign-models.js --config my-models.json
`);
  process.exit(0);
}

function parseArgs() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) usage();
  const dryRun = args.includes("--dry-run");

  let raw;
  const mapIdx = args.indexOf("--map");
  const cfgIdx = args.indexOf("--config");

  if (mapIdx !== -1 && cfgIdx !== -1) {
    console.error("error: use --map OR --config, not both");
    process.exit(1);
  }

  if (mapIdx !== -1) {
    raw = args[mapIdx + 1];
    if (!raw) { console.error("error: --map requires a JSON argument"); process.exit(1); }
  } else if (cfgIdx !== -1) {
    const cfgPath = args[cfgIdx + 1];
    if (!cfgPath) { console.error("error: --config requires a file path"); process.exit(1); }
    raw = fs.readFileSync(path.resolve(cfgPath), "utf8");
  } else {
    console.error("error: provide --map or --config");
    process.exit(1);
  }

  let mapping;
  try { mapping = JSON.parse(raw); } catch {
    console.error("error: invalid JSON");
    process.exit(1);
  }

  return { mapping, dryRun };
}

function readAgentFiles() {
  const files = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith(".md"));
  const agents = [];

  for (const file of files) {
    const fullPath = path.join(AGENTS_DIR, file);
    const content = fs.readFileSync(fullPath, "utf8");
    const match = content.match(MODEL_RE);
    if (match) {
      const model = match[0].replace(/^model:\s*/, "").trim();
      agents.push({ file, fullPath, content, model, line: match[0] });
    }
  }

  return agents;
}

function groupByModel(agents) {
  const groups = {};
  for (const a of agents) {
    if (!groups[a.model]) groups[a.model] = [];
    groups[a.model].push(a.file);
  }
  return groups;
}

function applyMapping(agents, mapping, dryRun) {
  const changes = [];

  for (const agent of agents) {
    const newModel = mapping[agent.model];
    if (!newModel) continue;
    const newLine = agent.line.replace(MODEL_RE, `model: ${newModel}`);
    if (newLine === agent.line) continue;

    changes.push({
      file: agent.file,
      old: agent.model,
      new: newModel
    });

    if (!dryRun) {
      const updated = agent.content.replace(MODEL_RE, `model: ${newModel}`);
      fs.writeFileSync(agent.fullPath, updated, "utf8");
    }
  }

  return changes;
}

function main() {
  const { mapping, dryRun } = parseArgs();

  if (!fs.existsSync(AGENTS_DIR)) {
    console.error(`error: agents directory not found at ${AGENTS_DIR}`);
    process.exit(1);
  }

  const agents = readAgentFiles();
  const before = groupByModel(agents);
  const changes = applyMapping(agents, mapping, dryRun);

  console.log(`\nAgent files scanned: ${agents.length}`);
  console.log("\nBefore:");
  for (const [model, names] of Object.entries(before)) {
    console.log(`  ${model}  (${names.length})`);
  }

  if (changes.length === 0) {
    console.log("\nNo changes — mapping keys don't match any current models.");
    console.log("Current models:", [...new Set(agents.map(a => a.model))].join(", "));
    return;
  }

  console.log(`\n${dryRun ? "[DRY RUN] " : ""}Changes (${changes.length} files):`);
  for (const c of changes) {
    console.log(`  ${c.file.padEnd(32)} ${c.old.padEnd(35)} →  ${c.new}`);
  }

  const after = groupByModel(
    agents.map(a => ({
      ...a,
      model: mapping[a.model] || a.model
    }))
  );
  console.log("\nAfter:");
  for (const [model, names] of Object.entries(after)) {
    console.log(`  ${model}  (${names.length})`);
  }

  if (!dryRun) {
    console.log(`\nDone. Wrote ${changes.length} files.`);
    console.log("Run with --dry-run to preview before committing.");
  }
}

main();
