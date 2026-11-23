import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../src/config.mjs";
import { parseTranscript } from "../src/parse.mjs";
import { turnSpans } from "../src/send.mjs";
import { run } from "../src/hook.mjs";

const fixture = join(import.meta.dirname, "fixtures", "basic.jsonl");
const base = { apiKey: "uncoil_sk_live_x", host: "https://eu.cloud.uncoil.dev", enabled: true, tags: [], maxChars: 100, debug: false };

test("parses turns, tool calls and token use without double counting", () => {
  const { sessionId, turns } = parseTranscript(readFileSync(fixture, "utf8"));
  assert.equal(sessionId, "sess-1");
  assert.equal(turns.length, 2);
  assert.equal(turns[0].done, true);
  assert.equal(turns[1].done, false);
  assert.equal(turns[0].model, "gpt-5.4");
  assert.deepEqual([turns[0].inputTokens, turns[0].outputTokens], [100, 20]);
  assert.equal(turns[0].tools[0].error, "exit code 2");
  assert.deepEqual(turns[0].tools[0].input, { command: ["ls"] });
});

test("builds model, tool and end spans that share one run", () => {
  const session = parseTranscript(readFileSync(fixture, "utf8"));
  const spans = turnSpans(session, session.turns[0], { ...base, environment: "dev" });
  assert.deepEqual(spans.map((s) => s.spanType), ["llm_call", "tool_call", "run_end"]);
  assert.equal(new Set(spans.map((s) => s.runId)).size, 1);
  assert.equal(spans[1].parentSpanId, spans[0].spanId);
  assert.equal(spans[1].errorType, "tool_error");
  assert.equal(spans[0].environment, "dev");
});

test("sends only finished turns, and never sends a turn twice", async () => {
  const dir = mkdtempSync(join(tmpdir(), "uncoil-"));
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, auth: init.headers.authorization, body: JSON.parse(init.body) });
    return { ok: true, status: 200 };
  };
  const config = { ...base, stateDir: dir };
  await run({ transcript_path: fixture }, config, { fetchImpl });
  assert.equal(calls.length, 3);
  assert.equal(calls[0].url, "https://eu.cloud.uncoil.dev/api/ingest");
  assert.equal(calls[0].auth, "Bearer uncoil_sk_live_x");
  await run({ transcript_path: fixture }, config, { fetchImpl });
  assert.equal(calls.length, 3);
});

test("a rejected turn is retried on the next run", async () => {
  const dir = mkdtempSync(join(tmpdir(), "uncoil-"));
  let status = 400;
  let count = 0;
  const fetchImpl = async () => ({ ok: status === 200, status, count: count++ });
  const config = { ...base, stateDir: dir };
  await run({ transcript_path: fixture }, config, { fetchImpl });
  status = 200;
  const before = count;
  await run({ transcript_path: fixture }, config, { fetchImpl });
  assert.equal(count - before, 3);
});

test("config reads the project file and lets env win; region comes from the key", () => {
  const home = mkdtempSync(join(tmpdir(), "home-"));
  const cwd = mkdtempSync(join(tmpdir(), "proj-"));
  writeFileSync(join(home, "x"), "");
  const env = { UNCOIL_API_KEY: "uncoil_sk_live_us_abc" };
  assert.equal(loadConfig({ env, cwd, home }).host, "https://us.cloud.uncoil.dev");
  assert.equal(loadConfig({ env: { ...env, UNCOIL_CODEX_ENABLED: "false" }, cwd, home }).enabled, false);
  assert.equal(loadConfig({ env: { UNCOIL_HOST: "https://x.test/" }, cwd, home }).host, "https://x.test");
});
