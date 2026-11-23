import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadConfig } from "./config.mjs";
import { parseTranscript } from "./parse.mjs";
import { id, postSpan, turnSpans } from "./send.mjs";

function stateFile(config, transcriptPath) {
  return join(config.stateDir, `${id(transcriptPath)}.json`);
}

function readState(file) {
  try {
    return new Set(JSON.parse(readFileSync(file, "utf8")));
  } catch {
    return new Set();
  }
}

/** Sends every finished turn that has not been sent yet. Never throws. */
export async function run(input, config = loadConfig(), deps = {}) {
  const log = (...args) => config.debug && console.error("[uncoil-codex]", ...args);
  if (!config.enabled) return log("turned off");
  if (!config.apiKey) return log("no UNCOIL_API_KEY; skipping");
  if (!input?.transcript_path) return log("hook input has no transcript_path; skipping");

  let session;
  try {
    session = parseTranscript(readFileSync(input.transcript_path, "utf8"));
  } catch (error) {
    return log("cannot read transcript:", error.message);
  }

  const file = stateFile(config, input.transcript_path);
  const sent = readState(file);
  for (const turn of session.turns) {
    if (!turn.done || sent.has(turn.id)) continue;
    const results = await Promise.all(turnSpans(session, turn, config).map((span) => postSpan(config, span, deps)));
    if (results.every(Boolean)) {
      sent.add(turn.id);
      try {
        mkdirSync(config.stateDir, { recursive: true });
        writeFileSync(file, JSON.stringify([...sent]));
      } catch (error) {
        log("cannot save state:", error.message);
      }
    } else {
      log(`turn ${turn.id} was not fully accepted; it will be retried after the next turn`);
    }
  }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  let raw = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) raw += chunk;
  let input = {};
  try {
    input = JSON.parse(raw);
  } catch {
    // no usable hook input
  }
  await run(input).catch(() => {});
}
