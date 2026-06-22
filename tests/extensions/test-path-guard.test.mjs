import { describe, it } from "node:test";
import assert from "node:assert";

// Import the module's pure functions (or reimplement for testing)
// These test the core matching logic independently of Pi

async function matchRules(paths, rules) {
  // Same logic as in ocgs-path-guard/index.ts
  const { minimatch } = await import("minimatch");
  const matched = new Map();
  for (const filePath of paths) {
    for (const rule of rules) {
      if (rule.paths.some(glob => minimatch(filePath, glob))) {
        matched.set(rule.name, rule);
      }
    }
  }
  return Array.from(matched.values());
}

describe("ocgs-path-guard rule matching", () => {
  const rules = [
    { name: "ai-code", paths: ["src/ai/**"] },
    { name: "engine-code", paths: ["src/core/**"] },
    { name: "test-standards", paths: ["tests/**"] },
    { name: "prototype-code", paths: ["prototypes/**"] },
  ];

  it("matches single path to one rule", async () => {
    const result = await matchRules(["src/ai/patrol.gd"], rules);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, "ai-code");
  });

  it("matches multiple paths to multiple rules", async () => {
    const result = await matchRules(["src/ai/patrol.gd", "tests/test_patrol.gd"], rules);
    assert.strictEqual(result.length, 2);
    assert.deepStrictEqual(result.map(r => r.name).sort(), ["ai-code", "test-standards"]);
  });

  it("returns empty for non-matching paths", async () => {
    const result = await matchRules(["README.md"], rules);
    assert.strictEqual(result.length, 0);
  });

  it("deduplicates when same rule matches multiple paths", async () => {
    const result = await matchRules(["src/ai/patrol.gd", "src/ai/combat.gd"], rules);
    assert.strictEqual(result.length, 1);
  });
});
