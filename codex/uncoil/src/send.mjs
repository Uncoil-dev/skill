import { createHash } from "node:crypto";

export const id = (...parts) => createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 32);

export function clip(value, max) {
  if (value === undefined || value === null) return undefined;
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > max ? `${text.slice(0, max)}\n[cut: ${text.length - max} more characters]` : text;
}

const sleep = (time) => new Promise((resolve) => setTimeout(resolve, time));

/** Posts one span. Retries rate limits and server errors; returns true when Uncoil accepted it. */
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

/** Spans for one finished turn. Every span of a turn shares one run id. */
export function turnSpans(session, turn, config) {
  const runId = id(session.sessionId, turn.id);
  const modelSpanId = id(runId, "model");
  const common = { runId, sessionId: session.sessionId, environment: config.environment, endUserId: config.endUserId, tags: ["codex", ...config.tags], traceName: "Codex turn" };
  const prompt = clip(turn.prompt, config.maxChars) ?? "";
  const answer = clip(turn.answer, config.maxChars) ?? "";
  const latency = Math.max(0, (turn.endedAt ?? 0) - (turn.startedAt ?? 0));
  const spans = [
    {
      ...common,
      spanId: modelSpanId,
      spanType: "llm_call",
      createdAt: new Date(turn.startedAt ?? Date.now()).toISOString(),
      latencyMs: latency,
      modelId: turn.model,
      input: prompt,
      output: answer || "(no text answer)",
      inputTokens: turn.inputTokens,
      outputTokens: turn.outputTokens,
      metadata: { source: "codex", provider: session.provider },
    },
  ];
  turn.tools.forEach((tool, index) => {
    spans.push({
      ...common,
      spanId: id(runId, "tool", tool.callId ?? index),
      parentSpanId: modelSpanId,
      spanType: "tool_call",
      toolName: tool.name,
      createdAt: new Date(tool.startedAt ?? turn.startedAt ?? Date.now()).toISOString(),
      latencyMs: Math.max(0, (tool.endedAt ?? 0) - (tool.startedAt ?? 0)),
      input: clip(tool.input, config.maxChars) ?? "",
      output: clip(tool.output, config.maxChars) ?? (tool.error ? "" : "(no output)"),
      ...(tool.error ? { errorType: "tool_error", errorMessage: tool.error } : {}),
    });
  });
  spans.push({
    ...common,
    spanId: id(runId, "end"),
    parentSpanId: modelSpanId,
    spanType: "run_end",
    createdAt: new Date(turn.endedAt ?? Date.now()).toISOString(),
    latencyMs: latency,
    input: prompt,
    output: answer || "(no text answer)",
  });
  return spans.map((span) => Object.fromEntries(Object.entries(span).filter(([, value]) => value !== undefined)));
}
