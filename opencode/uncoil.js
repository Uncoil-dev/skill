// Uncoil plugin for OpenCode: sends each finished reply, with its tool calls, to an Uncoil project.
// Single file with no dependencies. Put it in ~/.config/opencode/plugins/ or <project>/.opencode/plugins/.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const HOSTS = { eu: "https://eu.cloud.uncoil.dev", us: "https://us.cloud.uncoil.dev" };

const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return {};
  }
};

export function loadConfig({ env = process.env, home = homedir(), options = {} } = {}) {
  const file = readJson(join(home, ".config", "opencode", "uncoil.json"));
  const apiKey = env.UNCOIL_API_KEY || options.apiKey || file.apiKey || "";
  const region = env.UNCOIL_REGION || file.region || /^uncoil_sk_live_(eu|us)_/.exec(apiKey)?.[1] || "eu";
  const tags = options.tags ?? file.tags ?? [];
  return {
    apiKey,
    host: (env.UNCOIL_HOST || file.host || HOSTS[region] || HOSTS.eu).replace(/\/+$/, ""),
    enabled: String(env.UNCOIL_OPENCODE_ENABLED ?? file.enabled ?? "true") !== "false",
    environment: env.UNCOIL_ENVIRONMENT || file.environment,
    endUserId: env.UNCOIL_USER_ID || file.userId,
    tags: Array.isArray(tags) ? tags.map(String) : [],
    maxChars: Number(file.maxChars || 20000),
    stateFile: join(home, ".config", "opencode", "uncoil-state.json"),
  };
}

const hash = (...parts) => createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 32);

const clip = (value, max) => {
  if (value === undefined || value === null) return undefined;
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > max ? `${text.slice(0, max)}\n[cut: ${text.length - max} more characters]` : text;
};

const iso = (time) => new Date(typeof time === "number" ? time : Date.now()).toISOString();
const textOf = (parts = []) => parts.filter((p) => p.type === "text" && !p.synthetic).map((p) => p.text).join("\n");

/**
 * Turns a session's messages (as returned by client.session.messages) into spans.
 * Only replies that have finished are included. One run is one user prompt and all the replies it caused.
 */
export function buildSpans(sessionID, messages, config) {
  const prompts = new Map();
  for (const m of messages) if (m.info.role === "user") prompts.set(m.info.id, textOf(m.parts));

  const runs = new Map();
  for (const m of messages) {
    if (m.info.role !== "assistant" || !m.info.time?.completed) continue;
    const key = m.info.parentID ?? m.info.id;
    if (!runs.has(key)) runs.set(key, []);
    runs.get(key).push(m);
  }

  const out = [];
  for (const [promptId, replies] of runs) {
    const runId = hash(sessionID, promptId);
    const prompt = clip(prompts.get(promptId) ?? "", config.maxChars);
    const common = { runId, sessionId: sessionID, environment: config.environment, endUserId: config.endUserId, tags: ["opencode", ...config.tags], traceName: "OpenCode turn" };
    const spans = [];
    for (const { info, parts } of replies) {
      const modelSpanId = hash(runId, info.id);
      const answer = clip(textOf(parts), config.maxChars);
      const failed = info.error ? (info.error.data?.message ?? info.error.name ?? "error") : undefined;
      spans.push({
        ...common,
        spanId: modelSpanId,
        spanType: "llm_call",
        createdAt: iso(info.time.created),
        latencyMs: Math.max(0, info.time.completed - info.time.created),
        modelId: info.modelID,
        input: prompt || "(no prompt text)",
        output: answer || (failed ? "" : "(no text answer)"),
        inputTokens: info.tokens?.input,
        outputTokens: info.tokens?.output,
        costUsd: typeof info.cost === "number" && info.cost > 0 ? info.cost : undefined,
        metadata: { source: "opencode", provider: info.providerID, agent: info.mode },
        ...(failed ? { errorType: String(info.error.name ?? "error"), errorMessage: String(failed) } : {}),
      });
      for (const part of parts) {
        if (part.type !== "tool" || !["completed", "error"].includes(part.state?.status)) continue;
        const failedTool = part.state.status === "error";
        spans.push({
          ...common,
          spanId: hash(runId, info.id, part.callID ?? part.id),
          parentSpanId: modelSpanId,
          spanType: "tool_call",
          toolName: part.tool,
          createdAt: iso(part.state.time?.start),
          latencyMs: Math.max(0, (part.state.time?.end ?? 0) - (part.state.time?.start ?? 0)),
          input: clip(part.state.input, config.maxChars) ?? "",
          output: clip(failedTool ? part.state.error : part.state.output, config.maxChars) ?? "",
          ...(failedTool ? { errorType: "tool_error", errorMessage: String(part.state.error ?? "failed") } : {}),
        });
      }
    }
    const last = replies[replies.length - 1];
    spans.push({
      ...common,
      spanId: hash(runId, "end"),
      parentSpanId: hash(runId, last.info.id),
      spanType: "run_end",
      createdAt: iso(last.info.time.completed),
      latencyMs: Math.max(0, last.info.time.completed - replies[0].info.time.created),
      input: prompt || "(no prompt text)",
      output: clip(textOf(last.parts), config.maxChars) || "(no text answer)",
    });
    out.push({ key: `${promptId}:${replies.map((r) => r.info.id).join(",")}`, spans: spans.map((s) => Object.fromEntries(Object.entries(s).filter(([, v]) => v !== undefined))) });
  }
  return out;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function postSpan(config, span, { fetchImpl = fetch, retries = 2 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchImpl(`${config.host}/api/ingest`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify(span),
        signal: AbortSignal.timeout(8000),
      });
      if (response.ok) return true;
      if (response.status !== 429 && response.status < 500) return false;
    } catch {
      // network error: try again
    }
    await sleep(300 * (attempt + 1));
  }
  return false;
}

function loadSent(file) {
  const data = readJson(file);
  return new Set(Array.isArray(data.sent) ? data.sent : []);
}

function saveSent(file, sent) {
  try {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify({ sent: [...sent].slice(-2000) }));
  } catch {
    // losing this file only risks sending a reply twice
  }
}

/** Sends the finished replies of one session that were not sent yet. Never throws. */
export async function flushSession(sessionID, client, config, deps = {}) {
  try {
    const response = await client.session.messages({ path: { id: sessionID } });
    const messages = response?.data ?? response;
    if (!Array.isArray(messages)) return;
    const sent = loadSent(config.stateFile);
    for (const run of buildSpans(sessionID, messages, config)) {
      const key = `${sessionID}:${run.key}`;
      if (sent.has(key)) continue;
      const results = await Promise.all(run.spans.map((span) => postSpan(config, span, deps)));
      if (results.every(Boolean)) {
        sent.add(key);
        saveSent(config.stateFile, sent);
      }
    }
  } catch {
    // tracing must never break a session
  }
}

export const UncoilPlugin = async ({ client } = {}, options = {}) => {
  const config = loadConfig({ options });
  if (!config.enabled || !config.apiKey) return {};
  return {
    event: async ({ event }) => {
      if (event?.type === "session.idle" && event.properties?.sessionID) {
        await flushSession(event.properties.sessionID, client, config);
      }
    },
  };
};

export default UncoilPlugin;
