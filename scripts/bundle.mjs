#!/usr/bin/env node
// Bundles the Cursor plugin (manifest, skills, rules, MCP config) into dist/cursor-plugin.
// Usage: node scripts/bundle.mjs [outDir]
import { cpSync, rmSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = process.argv[2] ?? join(root, "dist", "cursor-plugin");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const item of [".cursor-plugin/plugin.json", "skills", "rules", "mcp.json", "README.md", "LICENSE"]) {
  cpSync(join(root, item), join(out, item), { recursive: true });
}
console.log(`Bundled Cursor plugin to ${out}`);
