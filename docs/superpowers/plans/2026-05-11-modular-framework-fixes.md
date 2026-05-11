# Modular Framework Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve 5 issues from the modular framework code review: DRY parser, missing dependency declarations, missing `--force` flag, empty file lists in seeded install, and CI scope.

**Architecture:** Extract shared code to a lib file, update 18 YAML manifests, add a CLI flag to the installer, and fix the seed script to populate file lists. Each task is independent and can be done in order.

**Tech Stack:** Node.js (ESM), no external dependencies.

---

### Task 1: Extract shared YAML parser to `tools/lib/parse-modulefile.mjs`

**Files:**
- Create: `tools/lib/parse-modulefile.mjs`
- Modify: `.opencode/modules/install.mjs:30-109` (remove inline parser, add import)
- Modify: `tools/seed-installed.mjs:12-84` (remove inline parser, add import)

- [ ] **Step 1: Create shared parser module**

```js
// tools/lib/parse-modulefile.mjs

export function parseFlowList(str) {
  const items = [];
  let current = '';
  let depth = 0;
  let inQuote = false;
  let quoteChar = null;
  for (const ch of str) {
    if (inQuote) {
      if (ch === quoteChar) { inQuote = false; }
      else { current += ch; }
    } else if (ch === '"' || ch === "'") {
      inQuote = true;
      quoteChar = ch;
    } else if (ch === '[' || ch === '(') { depth++; current += ch; }
    else if (ch === ']' || ch === ')') { depth--; current += ch; }
    else if (ch === ',' && depth === 0) { items.push(current.trim()); current = ''; }
    else { current += ch; }
  }
  const last = current.trim();
  if (last) items.push(last);
  return items;
}

export function parseModulefile(text) {
  const lines = text.split(/\r?\n/);
  const result = {};
  const sectionStack = [];
  let continuedList = null;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const indent = raw.length - raw.trimStart().length;

    if (continuedList) {
      continuedList.buffer += ' ' + trimmed;
      if (trimmed.endsWith(']')) {
        continuedList.obj[continuedList.key] = parseFlowList(continuedList.buffer.slice(1, -1));
        continuedList = null;
      }
      continue;
    }

    while (sectionStack.length > 0 && indent <= sectionStack[sectionStack.length - 1].indent) {
      sectionStack.pop();
    }
    const parentObj = sectionStack.length > 0 ? sectionStack[sectionStack.length - 1].obj : result;
    const match = trimmed.match(/^([\w-]+):\s*(.*)/);
    if (!match) continue;

    const key = match[1];
    const value = match[2].trim();

    if (value === '') {
      const newObj = {};
      parentObj[key] = newObj;
      sectionStack.push({ indent, obj: newObj, key });
    } else if (value.startsWith('[')) {
      if (value.endsWith(']')) {
        parentObj[key] = parseFlowList(value.slice(1, -1));
      } else {
        continuedList = { obj: parentObj, key, buffer: value };
      }
    } else if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      parentObj[key] = value.slice(1, -1);
    } else {
      parentObj[key] = value;
    }
  }
  return result;
}
```

- [ ] **Step 2: Update `install.mjs` — remove inline parser, add import**

Remove lines 30-109 (the entire `// ── YAML Parser` section through the `readModulefile` function).

Replace with import at top of file (after line 6, before the constants):

```js
import { parseModulefile, parseFlowList } from '../../tools/lib/parse-modulefile.mjs';
```

Keep `readModulefile` function (lines 105-109) unchanged — it calls `parseModulefile` which is now imported.

- [ ] **Step 3: Update `seed-installed.mjs` — remove inline parser, add import**

Remove lines 12-84 (entire `// Inline YAML parser` section).

Add import at top (after line 5, before `const __dirname`):

```js
import { parseModulefile } from './lib/parse-modulefile.mjs';
```

`parseFlowList` isn't used directly in seed-installed.mjs — only `parseModulefile` is needed.

- [ ] **Step 4: Run both scripts to verify no regression**

```powershell
node tools\seed-installed.mjs
node .opencode\modules\install.mjs list
```

Expected: seed exits cleanly, `list` shows 19 modules with versions.

- [ ] **Step 5: Commit**

```bash
git add tools/lib/parse-modulefile.mjs .opencode/modules/install.mjs tools/seed-installed.mjs
git commit -m "refactor: extract shared YAML parser to tools/lib/parse-modulefile.mjs"
```

---

### Task 2: Add dependency declarations to all modulefiles

**Files:**
- Modify: 18 `modulefile.yaml` files in `.opencode/modules/*/`

- [ ] **Step 1: Update all 18 module manifests**

For each module, add or update the `depends:` line. The current content (from the PR) for all modules has `depends: []`.

Pattern for each file — open `modulefile.yaml` and change:

```yaml
depends: []
```

to the module-specific value from this table:

| File | New `depends:` |
|------|---------------|
| `.opencode/modules/architecture/modulefile.yaml` | `depends: [core]` |
| `.opencode/modules/art/modulefile.yaml` | `depends: [core]` |
| `.opencode/modules/audio/modulefile.yaml` | `depends: [core]` |
| `.opencode/modules/data/modulefile.yaml` | `depends: [core]` |
| `.opencode/modules/design/modulefile.yaml` | `depends: [core]` |
| `.opencode/modules/engine-godot/modulefile.yaml` | `depends: [core]` |
| `.opencode/modules/engine-unity/modulefile.yaml` | `depends: [core]` |
| `.opencode/modules/engine-unreal/modulefile.yaml` | `depends: [core]` |
| `.opencode/modules/level-design/modulefile.yaml` | `depends: [core]` |
| `.opencode/modules/live-ops/modulefile.yaml` | `depends: [core]` |
| `.opencode/modules/localization/modulefile.yaml` | `depends: [core]` |
| `.opencode/modules/narrative/modulefile.yaml` | `depends: [core]` |
| `.opencode/modules/programming/modulefile.yaml` | `depends: [core]` |
| `.opencode/modules/prototyping/modulefile.yaml` | `depends: [core]` |
| `.opencode/modules/qa/modulefile.yaml` | `depends: [core]` |
| `.opencode/modules/release/modulefile.yaml` | `depends: [core]` |
| `.opencode/modules/stories/modulefile.yaml` | `depends: [core, design]` |
| `.opencode/modules/ui/modulefile.yaml` | `depends: [core]` |

`core/modulefile.yaml` stays as `depends: []` (already correct).

- [ ] **Step 2: Validate updated manifests**

```powershell
node tests\modules\validate-modules.mjs
```

Expected: all 19 modules PASS.

- [ ] **Step 3: Commit**

```bash
git add .opencode/modules/*/modulefile.yaml
git commit -m "fix: declare module dependencies in all modulefile.yaml manifests"
```

---

### Task 3: Add `--force` flag to `install.mjs add`

**Files:**
- Modify: `.opencode/modules/install.mjs`

- [ ] **Step 1: Add `--force` arg parsing in `cmdAdd`**

Replace `function cmdAdd(names)` signature to filter out `--force`:

```js
function cmdAdd(args) {
  const force = args.includes('--force');
  const names = args.filter(a => a !== '--force');
  // ... rest of function unchanged
```

- [ ] **Step 2: Add `filesMatch` helper after `walkAndCopy`**

Insert after the `walkAndCopy` function (after line 321):

```js
function filesMatch(a, b) {
  return Buffer.compare(readFileSync(a), readFileSync(b)) === 0;
}
```

- [ ] **Step 3: Update `walkAndCopy` to accept `force` parameter**

Change signature and add force logic. Replace lines 301-321:

```js
function walkAndCopy(srcDir, destDir, fileList, force = false) {
  const entries = readdirSync(srcDir);
  for (const entry of entries) {
    const srcPath = join(srcDir, entry);
    const destPath = join(destDir, entry);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      if (!existsSync(destPath)) mkdirSync(destPath, { recursive: true });
      walkAndCopy(srcPath, destPath, fileList, force);
    } else {
      if (existsSync(destPath)) {
        if (force) {
          if (filesMatch(srcPath, destPath)) {
            log('SAME', `${toForward(relative(MODULES_DIR, srcPath))}`);
          } else {
            copyFileSync(srcPath, destPath);
            log('UPDATE', `${toForward(relative(MODULES_DIR, srcPath))} → ${toForward(relative(ROOT, destPath))}`);
          }
        } else {
          log('SKIP', `${toForward(relative(MODULES_DIR, srcPath))} → ${toForward(relative(ROOT, destPath))}`);
        }
      } else {
        copyFileSync(srcPath, destPath);
        log('ADD', `${toForward(relative(MODULES_DIR, srcPath))} → ${toForward(relative(ROOT, destPath))}`);
        fileList.push(toForward(relative(join(ROOT, '.opencode'), destPath)));
      }
    }
  }
}
```

No change to `fileList.push` — we only track newly added files, not overwritten ones (consistent with existing behavior).

- [ ] **Step 4: Update call site to pass `force`**

In `cmdAdd`, change line 238:
```js
walkAndCopy(entryPath, join(ROOT, '.opencode', entry), addedFiles);
```
to:
```js
walkAndCopy(entryPath, join(ROOT, '.opencode', entry), addedFiles, force);
```

- [ ] **Step 5: Test without `--force` (should still skip existing)**

```powershell
node .opencode\modules\install.mjs add design
```

Expected: `[SKIP]` for each file that already exists.

- [ ] **Step 6: Test with `--force` (should UPDATE existing)**

```powershell
node .opencode\modules\install.mjs add --force design
```

Expected: `[UPDATE]` for each installed file (since modulefile.yaml hasn't changed between runs, they'll match and show `[SAME]`).

- [ ] **Step 7: Commit**

```bash
git add .opencode/modules/install.mjs
git commit -m "feat: add --force flag to install.mjs add command"
```

---

### Task 4: Fix seed-installed.mjs to populate file lists

**Files:**
- Modify: `tools/seed-installed.mjs`

- [ ] **Step 1: Rewrite seed script to walk files**

Replace the file-discover-and-write section (lines 86-106) with a version that computes file paths:

```js
const INSTALL_SUBDIRS = ['agents', 'skills', 'commands', 'rules', 'plugins', 'docs'];
const SKIP_DIRS = new Set(['mcp']);

function walkModuleFiles(modDir, moduleName) {
  const files = [];
  const entries = readdirSync(modDir);
  for (const entry of entries) {
    if (entry === 'modulefile.yaml') continue;
    if (SKIP_DIRS.has(entry)) continue;
    const entryPath = join(modDir, entry);
    if (!statSync(entryPath).isDirectory()) continue;
    if (!INSTALL_SUBDIRS.includes(entry)) continue;
    collectFiles(entryPath, join('.opencode', entry), files);
  }
  return files;
}

function collectFiles(srcDir, relPrefix, fileList) {
  const entries = readdirSync(srcDir);
  for (const entry of entries) {
    const srcPath = join(srcDir, entry);
    if (statSync(srcPath).isDirectory()) {
      collectFiles(srcPath, join(relPrefix, entry), fileList);
    } else {
      fileList.push(toForward(join(relPrefix, entry)));
    }
  }
}

function toForward(p) {
  return p.split(sep).join('/');
}

// Discover all modules
const moduleDirs = readdirSync(MODULES_DIR).filter(d => {
  const p = join(MODULES_DIR, d);
  try { return statSync(p).isDirectory() && existsSync(join(p, 'modulefile.yaml')); }
  catch { return false; }
}).sort();

// Build installed.json with populated file lists
const installed = {};
for (const name of moduleDirs) {
  const mf = parseModulefile(readFileSync(join(MODULES_DIR, name, 'modulefile.yaml'), 'utf-8'));
  const modDir = join(MODULES_DIR, name);
  const files = walkModuleFiles(modDir, name);
  installed[name] = {
    version: mf.version || '0.1.0',
    status: 'installed',
    timestamp: new Date().toISOString(),
    files,
  };
}

writeFileSync(INSTALLED_PATH, JSON.stringify(installed, null, 2) + '\n');
console.log(`Seeded installed.json with ${Object.keys(installed).length} modules at ${INSTALLED_PATH}`);
console.log(`Total files tracked: ${Object.values(installed).reduce((s, m) => s + m.files.length, 0)}`);
```

Need to also add `sep` to the import from `path`:
```js
import { join, resolve, dirname, sep } from 'path';
```

- [ ] **Step 2: Run seed script and verify file lists**

```powershell
node tools\seed-installed.mjs
```

Expected output shows total files tracked (should be 196+).

Verify installed.json now has non-empty `files` arrays:
```powershell
node -e "const j=require('./.opencode/modules/installed.json'); Object.entries(j).forEach(([k,v])=>console.log(k+': '+v.files.length+' files'))"
```

Expected: each module shows files > 0 (except modules that only have modulefile.yaml with no other content).

- [ ] **Step 3: Commit**

```bash
git add tools/seed-installed.mjs .opencode/modules/installed.json
git commit -m "fix: populate file lists in seeded installed.json"
```

---

### Task 5 (Optional): CI optimization

**Files:**
- Modify: `.github/workflows/agent-validation.yml`

- [ ] **Step 1: Add path filter to `validate-modules` job**

Change the `on` trigger to add a `paths` filter for the new job, or skip this entirely per the design decision (Option A: accept fast validation on every push).

Add to the workflow file inside the `validate-modules` job:

```yaml
  validate-modules:
    if: |
      github.event_name == 'push' && (
        startsWith(github.ref, 'refs/heads/development') ||
        startsWith(github.ref, 'refs/heads/feat/') ||
        startsWith(github.ref, 'refs/heads/fix/')
      )
    runs-on: ubuntu-latest
    name: Module Integrity
```

Or use `paths` filter on the push event (requires restructuring `on`):

```yaml
on:
  push:
    branches: [development]
    paths:
      - '.opencode/modules/**'
      - 'tests/modules/**'
  pull_request:
    branches: [development, master]
```

This second approach is simpler and more standard. Note that this affects ALL jobs in the workflow, not just validate-modules.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/agent-validation.yml
git commit -m "ci: scope module validation to module-related paths"
```

---

## Self-Review Checklist

| Spec Requirement | Task(s) Covering It |
|-----------------|-------------------|
| Extract shared YAML parser | Task 1 |
| Update depends in modulefiles | Task 2 |
| Add --force flag to install.mjs add | Task 3 |
| Fix seeded installed.json file lists | Task 4 |
| CI optimization (optional) | Task 5 |
