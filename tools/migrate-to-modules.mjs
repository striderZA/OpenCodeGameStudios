import { copyFileSync, mkdirSync, readdirSync, existsSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OPC = join(ROOT, ".opencode");
const DST = join(OPC, "modules");

const ORIGINALS = {
  agents: { src: join(OPC, "agents"), dst: (m) => join(DST, m, "agents") },
  skills: { src: join(OPC, "skills"), dst: (m) => join(DST, m, "skills") },
  commands: { src: join(OPC, "commands"), dst: (m) => join(DST, m, "commands") },
  rules: { src: join(OPC, "rules"), dst: (m) => join(DST, m, "rules") },
  plugins: { src: join(OPC, "plugins"), dst: (m) => join(DST, m, "plugins") },
  docs: { src: join(OPC, "docs"), dst: (m) => join(DST, m, "docs") },
};

// Module -> item mappings
const AGENT_MAP = {
  "creative-director": "core", "technical-director": "core", "producer": "core",
  "art-director": "art", "technical-artist": "art",
  "game-designer": "design", "systems-designer": "design", "economy-designer": "design",
  "lead-programmer": "architecture",
  "gameplay-programmer": "programming", "ai-programmer": "programming",
  "engine-programmer": "programming", "network-programmer": "programming",
  "tools-programmer": "programming",
  "ux-designer": "ui", "ui-programmer": "ui", "accessibility-specialist": "ui",
  "audio-director": "audio", "sound-designer": "audio",
  "narrative-director": "narrative", "writer": "narrative", "world-builder": "narrative",
  "level-designer": "level-design",
  "qa-lead": "qa", "qa-tester": "qa", "performance-analyst": "qa", "security-engineer": "qa",
  "release-manager": "release", "devops-engineer": "release", "analytics-engineer": "release",
  "prototyper": "prototyping",
  "live-ops-designer": "live-ops", "community-manager": "live-ops",
  "localization-lead": "localization",
  "godot-specialist": "engine-godot", "godot-gdscript-specialist": "engine-godot",
  "godot-csharp-specialist": "engine-godot", "godot-shader-specialist": "engine-godot",
  "godot-gdextension-specialist": "engine-godot",
  "unity-specialist": "engine-unity", "unity-dots-specialist": "engine-unity",
  "unity-shader-specialist": "engine-unity", "unity-addressables-specialist": "engine-unity",
  "unity-ui-specialist": "engine-unity",
  "unreal-specialist": "engine-unreal", "ue-blueprint-specialist": "engine-unreal",
  "ue-gas-specialist": "engine-unreal", "ue-replication-specialist": "engine-unreal",
  "ue-umg-specialist": "engine-unreal",
  "babylonjs-specialist": "engine-babylonjs", "babylonjs-physics-specialist": "engine-babylonjs",
  "babylonjs-network-specialist": "engine-babylonjs", "babylonjs-gui-specialist": "engine-babylonjs",
  "babylonjs-perf-specialist": "engine-babylonjs",
};

const SKILL_MAP = {
  "start": "core", "help": "core", "brainstorm": "core", "setup-engine": "core",
  "init-template": "core", "map-systems": "core", "project-stage-detect": "core",
  "gate-check": "core", "create-architecture": "core", "architecture-decision": "core",
  "art-bible": "art", "art-generate": "art", "asset-audit": "art", "asset-spec": "art",
  "design-system": "design", "design-review": "design", "review-all-gdds": "design",
  "quick-design": "design", "balance-check": "design", "consistency-check": "design",
  "content-audit": "design", "scope-check": "design", "estimate": "design",
  "playtest-report": "design", "team-combat": "design",
  "architecture-review": "architecture", "create-control-manifest": "architecture",
  "propagate-design-change": "architecture",
  "create-epics": "stories", "create-stories": "stories", "story-readiness": "stories",
  "dev-story": "stories", "story-done": "stories", "code-review": "stories",
  "tech-debt": "stories", "reverse-document": "stories", "adopt": "stories", "onboard": "stories",
  "team-ui": "ui", "ux-design": "ui", "ux-review": "ui",
  "team-audio": "audio",
  "team-narrative": "narrative",
  "team-level": "level-design",
  "team-qa": "qa", "qa-plan": "qa", "smoke-check": "qa", "soak-test": "qa",
  "regression-suite": "qa", "test-setup": "qa", "test-helpers": "qa",
  "test-flakiness": "qa", "test-evidence-review": "qa", "automated-smoke-test": "qa",
  "bug-report": "qa", "bug-triage": "qa", "security-audit": "qa", "perf-profile": "qa",
  "team-polish": "qa", "skill-test": "qa", "skill-improve": "qa",
  "team-release": "release", "release-checklist": "release", "launch-checklist": "release",
  "milestone-review": "release", "sprint-plan": "release", "sprint-status": "release",
  "retrospective": "release", "changelog": "release", "patch-notes": "release",
  "hotfix": "release", "day-one-patch": "release",
  "prototype": "prototyping", "hybrid-prototype": "prototyping", "explore": "prototyping",
  "team-live-ops": "live-ops",
  "localize": "localization",
};

const COMMAND_MAP = {
  "start": "core", "help": "core", "brainstorm": "core", "setup-engine": "core",
  "init-template": "core", "map-systems": "core", "project-stage-detect": "core",
  "create-architecture": "core", "architecture-decision": "core",
  "art-generate": "art",
  "design-system": "design", "design-review": "design", "review-all-gdds": "design",
  "quick-design": "design", "team-combat": "design",
  "architecture-review": "architecture", "create-control-manifest": "architecture",
  "create-epics": "stories", "create-stories": "stories", "story-readiness": "stories",
  "dev-story": "stories", "story-done": "stories", "code-review": "stories",
  "reverse-document": "stories",
  "team-ui": "ui",
  "team-audio": "audio",
  "team-narrative": "narrative",
  "team-level": "level-design",
  "team-qa": "qa", "qa-plan": "qa", "smoke-check": "qa", "soak-test": "qa",
  "regression-suite": "qa", "test-setup": "qa", "test-helpers": "qa",
  "test-flakiness": "qa", "test-evidence-review": "qa",
  "bug-report": "qa", "bug-triage": "qa", "security-audit": "qa", "team-polish": "qa",
  "team-release": "release", "release-checklist": "release", "launch-checklist": "release",
  "milestone-review": "release", "sprint-plan": "release", "sprint-status": "release",
  "retrospective": "release", "hotfix": "release", "day-one-patch": "release",
  "prototype": "prototyping", "explore": "prototyping",
};

const RULE_MAP = {
  "design-docs": "architecture",
  "gameplay-code": "programming", "ai-code": "programming",
  "engine-code": "programming", "network-code": "programming", "shader-code": "programming",
  "ui-code": "ui",
  "narrative": "narrative",
  "test-standards": "qa",
  "prototype-code": "prototyping",
  "data-files": "data",
};

let totalCopied = 0;

function copyItem(map, category) {
  const srcDir = ORIGINALS[category].src;
  const isSkill = category === "skills";

  for (const [item, module] of Object.entries(map)) {
    let srcPath;
    if (isSkill) {
      srcPath = join(srcDir, item, "SKILL.md");
    } else {
      srcPath = join(srcDir, `${item}.md`);
    }

    if (!existsSync(srcPath)) {
      console.warn(`  MISSING: ${category}/${item}`);
      continue;
    }

    const dstDir = ORIGINALS[category].dst(module);

    if (isSkill) {
      mkdirSync(join(dstDir, item), { recursive: true });
      copyFileSync(srcPath, join(dstDir, item, "SKILL.md"));
    } else {
      mkdirSync(dstDir, { recursive: true });
      copyFileSync(srcPath, join(dstDir, `${item}.md`));
    }
    totalCopied++;
  }
  console.log(`  ${category}: ${Object.keys(map).length} items`);
}

console.log("=== Migrating Agents ===");
copyItem(AGENT_MAP, "agents");

console.log("\n=== Migrating Skills ===");
copyItem(SKILL_MAP, "skills");

console.log("\n=== Migrating Commands ===");
copyItem(COMMAND_MAP, "commands");

console.log("\n=== Migrating Rules ===");
copyItem(RULE_MAP, "rules");

console.log("\n=== Migrating Core Plugins ===");
const plugins = readdirSync(ORIGINALS.plugins.src).filter(f => f.endsWith(".ts"));
for (const f of plugins) {
  copyFileSync(join(ORIGINALS.plugins.src, f), join(ORIGINALS.plugins.dst("core"), f));
  totalCopied++;
}
console.log(`  plugins: ${plugins.length}`);

console.log("\n=== Migrating Core Docs ===");
const coreDocs = ["workflow-catalog.yaml", "director-gates.md", "coordination-rules.md", "context-management.md"];
for (const d of coreDocs) {
  const s = join(ORIGINALS.docs.src, d);
  if (existsSync(s)) {
    copyFileSync(s, join(ORIGINALS.docs.dst("core"), d));
    totalCopied++;
  }
}
console.log(`  docs: ${coreDocs.length}`);

console.log("\n=== Creating MCP Fragment ===");
const mcpDst = join(DST, "art", "mcp", "aseprite.json");
writeFileSync(mcpDst, JSON.stringify({
  aseprite: {
    type: "local",
    command: ["uv", "--directory", "tools/aseprite-mcp", "run", "-m", "aseprite_mcp"],
    enabled: true,
    environment: { ASEPRITE_PATH: "{env:ASEPRITE_PATH}" },
  },
}, null, 2) + "\n");
console.log("  art/mcp/aseprite.json created");

console.log(`\nTotal: ${totalCopied} files migrated.`);
