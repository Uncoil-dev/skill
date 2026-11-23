#!/usr/bin/env node
// Checks the plugin manifests and every skill's frontmatter.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const fail = (message) => errors.push(message);
const json = (path) => {
  try {
    return JSON.parse(readFileSync(join(root, path), "utf8"));
  } catch (error) {
    fail(`${path}: ${error.message}`);
    return {};
  }
};

const plugin = json(".claude-plugin/plugin.json");
for (const key of ["name", "description", "version", "license"]) {
  if (!plugin[key]) fail(`plugin.json: missing "${key}"`);
}
if (plugin.version && !/^\d+\.\d+\.\d+$/.test(plugin.version)) fail("plugin.json: version must be x.y.z");

const market = json(".claude-plugin/marketplace.json");
const listed = (market.plugins ?? []).find((entry) => entry.name === plugin.name);
if (!listed) fail("marketplace.json: plugin is not listed");

const cursor = json(".cursor-plugin/plugin.json");
if (cursor.name !== plugin.name) fail("cursor plugin.json: name must match the Claude plugin");
if (cursor.version !== plugin.version) fail("cursor plugin.json: version must match the Claude plugin");
if (!(json(".cursor-plugin/marketplace.json").plugins ?? []).some((entry) => entry.name === cursor.name)) {
  fail("cursor marketplace.json: plugin is not listed");
}
if (JSON.stringify(json("mcp.json")) !== JSON.stringify(json(".mcp.json"))) fail("mcp.json must match .mcp.json");

const mcp = json(".mcp.json");
if (!mcp.mcpServers || !Object.keys(mcp.mcpServers).length) fail(".mcp.json: no servers");

const codex = json("codex/uncoil/.codex-plugin/plugin.json");
for (const key of ["name", "version", "description", "hooks"]) {
  if (!codex[key]) fail(`codex plugin.json: missing "${key}"`);
}
const codexMarket = json(".agents/plugins/marketplace.json");
if (!(codexMarket.plugins ?? []).some((entry) => entry.name === codex.name)) fail("codex marketplace.json: plugin is not listed");
if (!existsSync(join(root, "codex/uncoil", codex.hooks ?? "missing"))) fail("codex plugin: hooks file not found");

const skillsDir = join(root, "skills");
for (const name of readdirSync(skillsDir)) {
  const file = join(skillsDir, name, "SKILL.md");
  if (!existsSync(file)) { fail(`skills/${name}: missing SKILL.md`); continue; }
  const text = readFileSync(file, "utf8");
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) { fail(`skills/${name}: missing frontmatter`); continue; }
  const frontmatter = match[1];
  const fieldName = frontmatter.match(/^name:\s*(.+)$/m)?.[1].trim();
  if (fieldName !== name) fail(`skills/${name}: name "${fieldName}" must match the folder`);
  if (!/^description:/m.test(frontmatter)) fail(`skills/${name}: missing description`);
  for (const link of text.matchAll(/\]\((references\/[^)#]+)\)/g)) {
    if (!existsSync(join(skillsDir, name, link[1]))) fail(`skills/${name}: broken link ${link[1]}`);
  }
}

if (errors.length) {
  console.error(errors.map((line) => `- ${line}`).join("\n"));
  process.exit(1);
}
console.log("Plugin is valid.");
