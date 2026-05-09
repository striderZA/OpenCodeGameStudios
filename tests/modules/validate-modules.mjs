import { existsSync, readdirSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const MODULES_DIR = join(ROOT, ".opencode", "modules");

let passed = 0;
let failed = 0;

const PATH_MAP = {
  agents:   (name) => join(ROOT, ".opencode", "agents", `${name}.md`),
  skills:   (name) => join(ROOT, ".opencode", "skills", name, "SKILL.md"),
  commands: (name) => join(ROOT, ".opencode", "commands", `${name}.md`),
  rules:    (name) => join(ROOT, ".opencode", "rules", `${name}.md`),
};

function parseModulefile(filePath) {
  const content = readFileSync(filePath, "utf-8").replace(/\r\n/g, "\n");
  const result = { name: "", provides: {} };

  const nameMatch = content.match(/^name:\s*['"]?([^'"\n]+)['"]?\s*$/m);
  if (nameMatch) result.name = nameMatch[1].trim();

  const providesEndMatch = content.match(/^(?!\s)\w+:\s*/m);
  const providesStartIdx = content.indexOf("provides:");
  if (providesStartIdx === -1) return result;

  let providesEndIdx = content.length;
  if (providesEndMatch) {
    const afterProvides = content.slice(providesStartIdx + 9);
    const nextTopKey = afterProvides.match(/^(?!\s)\w+:\s*/m);
    if (nextTopKey) {
      providesEndIdx = providesStartIdx + 9 + nextTopKey.index;
    }
  }

  const providesSection = content.slice(providesStartIdx + 9, providesEndIdx);
  const catRegex = /(\w+):\s*(?:\[([\s\S]*?)\])/g;
  let catMatch;
  while ((catMatch = catRegex.exec(providesSection)) !== null) {
    const cat = catMatch[1];
    const raw = catMatch[2];
    const items = raw.split(",")
      .map(s => s.trim().replace(/['"]/g, ""))
      .filter(s => s.length > 0);
    result.provides[cat] = items;
  }

  return result;
}

function validate() {
  if (!existsSync(MODULES_DIR)) {
    console.log("FAIL: .opencode/modules/ not found");
    process.exit(1);
  }

  const moduleDirs = readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort();

  console.log(`\nValidating ${moduleDirs.length} modules...\n`);

  for (const moduleName of moduleDirs) {
    const modDir = join(MODULES_DIR, moduleName);
    const yamlPath = join(modDir, "modulefile.yaml");

    if (!existsSync(yamlPath)) {
      console.log(`  FAIL: ${moduleName} - missing modulefile.yaml`);
      failed++;
      continue;
    }

    let mod;
    try {
      mod = parseModulefile(yamlPath);
    } catch (e) {
      console.log(`  FAIL: ${moduleName} - cannot parse modulefile.yaml: ${e.message}`);
      failed++;
      continue;
    }

    if (mod.name !== moduleName) {
      console.log(`  FAIL: ${moduleName} - name mismatch: declared "${mod.name}"`);
      failed++;
      continue;
    }

    const moduleErrors = [];

    for (const cat of ["agents", "skills", "commands", "rules"]) {
      const items = mod.provides[cat] || [];
      const pathFn = PATH_MAP[cat];
      if (!pathFn) continue;

      for (const item of items) {
        const filePath = pathFn(item);
        if (!existsSync(filePath)) {
          moduleErrors.push(`    MISSING ${cat}/${item}`);
        }
      }
    }

    if ("core" === moduleName) {
      const plugins = mod.provides.plugins || [];
      if (plugins.length > 0) {
        const pluginsDir = join(ROOT, ".opencode", "plugins");
        if (!existsSync(pluginsDir)) {
          moduleErrors.push(`    MISSING .opencode/plugins/ directory`);
        } else {
          for (const plugin of plugins) {
            const pluginPath = join(pluginsDir, `${plugin}.ts`);
            if (!existsSync(pluginPath)) {
              moduleErrors.push(`    MISSING plugins/${plugin}.ts`);
            }
          }
        }
      }

      const docs = mod.provides.docs || [];
      if (docs.length > 0) {
        const docsDir = join(ROOT, "docs");
        if (!existsSync(docsDir)) {
          moduleErrors.push(`    MISSING docs/ directory`);
        }
      }
    }

    if (moduleErrors.length === 0) {
      console.log(`  PASS: ${moduleName}`);
      passed++;
    } else {
      console.log(`  FAIL: ${moduleName}`);
      moduleErrors.forEach(e => console.log(e));
      failed++;
    }
  }

  const total = passed + failed;
  console.log(`\n${total} modules: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) process.exit(1);
}

validate();
