// Turns a Codex session transcript (one JSON object per line) into a list of turns.

function textOf(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => (part && typeof part.text === "string" ? part.text : ""))
    .filter(Boolean)
    .join("\n");
}

function tryJson(value) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function ms(timestamp) {
  const value = Date.parse(timestamp);
  return Number.isNaN(value) ? undefined : value;
}

export function parseTranscript(text) {
  const lines = [];
  for (const raw of text.split("\n")) {
    if (!raw.trim()) continue;
    try {
      lines.push(JSON.parse(raw));
    } catch {
      // A partly written last line is skipped and read on the next run.
    }
  }

  let sessionId;
  let provider;
  const turns = [];
  let turn;
  let lastTotal = 0;

  for (const line of lines) {
    const p = line.payload ?? {};
    const at = ms(line.timestamp);
    if (line.type === "session_meta") {
      sessionId = p.id;
      provider = p.model_provider;
      continue;
    }
    if (line.type === "event_msg" && p.type === "task_started") {
      turn = { id: p.turn_id ?? `turn-${turns.length + 1}`, startedAt: at, endedAt: at, model: undefined, prompt: "", answer: "", tools: [], inputTokens: 0, outputTokens: 0, done: false };
      turns.push(turn);
      continue;
    }
    if (!turn) continue;
    turn.endedAt = at ?? turn.endedAt;

    if (line.type === "turn_context" && p.model) turn.model = p.model;
    else if (line.type === "event_msg") {
      if (p.type === "user_message" && !turn.prompt) turn.prompt = String(p.message ?? "");
      else if (p.type === "agent_message") turn.answer = String(p.message ?? turn.answer);
      else if (p.type === "task_complete") turn.done = true;
      else if (p.type === "token_count" && p.info?.last_token_usage) {
        const total = p.info.total_token_usage?.total_tokens ?? 0;
        if (total === 0 || total !== lastTotal) {
          turn.inputTokens += p.info.last_token_usage.input_tokens ?? 0;
          turn.outputTokens += p.info.last_token_usage.output_tokens ?? 0;
        }
        lastTotal = total;
      } else if (/_end$/.test(p.type ?? "") && p.call_id) {
        const tool = turn.tools.find((t) => t.callId === p.call_id);
        if (tool) {
          tool.endedAt = at;
          if (typeof p.exit_code === "number" && p.exit_code !== 0) tool.error = `exit code ${p.exit_code}`;
          else if (p.status === "failed" || p.status === "error") tool.error = String(p.status);
          tool.output ??= p.aggregated_output ?? p.stdout;
        }
      }
    } else if (line.type === "response_item") {
      if (p.type === "function_call" || p.type === "custom_tool_call" || p.type === "local_shell_call") {
        turn.tools.push({ callId: p.call_id, name: p.name ?? p.type, input: tryJson(p.arguments ?? p.input ?? p.action), startedAt: at, endedAt: at });
      } else if (p.type === "function_call_output" || p.type === "custom_tool_call_output") {
        const tool = turn.tools.find((t) => t.callId === p.call_id);
        if (tool) {
          tool.output = typeof p.output === "string" ? p.output : JSON.stringify(p.output);
          tool.endedAt ??= at;
        }
      } else if (p.type === "message" && p.role === "assistant") {
        turn.answer ||= textOf(p.content);
      }
    }
  }
  return { sessionId, provider, turns };
}
