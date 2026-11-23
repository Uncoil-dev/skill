import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { UncoilPlugin, buildSpans, flushSession, loadConfig } from "../uncoil.js";

const config = (extra = {}) => ({ apiKey: "uncoil_sk_live_k", host: "https://eu.cloud.uncoil.dev", enabled: true, tags: ["app"], maxChars: 50, stateFile: join(mkdtempSync(join(tmpdir(), "oc-")), "state.json"), ...extra });

const messages = [
  { info: { id: "u1", role: "user" }, parts: [{ type: "text", text: "fix the bug" }] },
  {
    info: { id: "a1", role: "assistant", parentID: "u1", modelID: "claude-x", providerID: "anthropic", cost: 0.02, tokens: { input: 10, output: 5 }, time: { created: 1000, completed: 3000 } },
    parts: [
      { type: "tool", tool: "bash", callID: "t1", state: { status: "completed", input: { cmd: "ls" }, output: "a.txt", time: { start: 1100, end: 1500 } } },
      { type: "tool", tool: "edit", callID: "t2", state: { status: "error", input: {}, error: "no such file", time: { start: 1600, end: 1700 } } },
      { type: "text", text: "Done." },
    ],
  },
  { info: { id: "a2", role: "assistant", parentID: "u1", time: { created: 3100 } }, parts: [] },
];

test("groups replies by prompt and builds model, tool and end spans", () => {
  const [run] = buildSpans("s1", messages, config());
  assert.deepEqual(run.spans.map((s) => s.spanType), ["llm_call", "tool_call", "tool_call", "run_end"]);
  assert.equal(run.spans[0].modelId, "claude-x");
  assert.equal(run.spans[0].costUsd, 0.02);
  assert.equal(run.spans[2].errorMessage, "no such file");
  assert.equal(run.spans[1].parentSpanId, run.spans[0].spanId);
  assert.ok(run.spans.every((s) => s.runId === run.spans[0].runId));
  assert.ok(run.spans[0].tags.includes("opencode"));
});

test("an unfinished reply is not sent", () => {
  const unfinished = [messages[0], messages[2]];
  assert.equal(buildSpans("s1", unfinished, config()).length, 0);
});

test("session.idle sends the new replies once", async () => {
  const calls = [];
  const fetchImpl = async (_url, init) => (calls.push(JSON.parse(init.body)), { ok: true, status: 200 });
  const client = { session: { messages: async () => ({ data: messages }) } };
  const cfg = config();
  await flushSession("s1", client, cfg, { fetchImpl });
  assert.equal(calls.length, 4);
  await flushSession("s1", client, cfg, { fetchImpl });
  assert.equal(calls.length, 4);
});

test("stays off without a key and honours the off switch", async () => {
  const home = mkdtempSync(join(tmpdir(), "h-"));
  assert.equal(loadConfig({ env: {}, home }).apiKey, "");
  assert.equal(loadConfig({ env: { UNCOIL_API_KEY: "uncoil_sk_live_us_z", UNCOIL_OPENCODE_ENABLED: "false" }, home }).enabled, false);
  assert.equal(loadConfig({ env: { UNCOIL_API_KEY: "uncoil_sk_live_us_z" }, home }).host, "https://us.cloud.uncoil.dev");
  const saved = process.env.UNCOIL_API_KEY;
  delete process.env.UNCOIL_API_KEY;
  assert.deepEqual(await UncoilPlugin({}, {}), {});
  if (saved) process.env.UNCOIL_API_KEY = saved;
});
