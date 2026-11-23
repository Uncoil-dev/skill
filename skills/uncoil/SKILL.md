---
name: uncoil
description: >-
  Work with Uncoil, the tracing and evaluation platform for AI agents: look up Uncoil documentation, use the TypeScript (@uncoil.dev/sdk) or Python (uncoil-sdk) SDK correctly, record feedback and scores, and answer how traces, cost and regions work. Use for any Uncoil question, even if Uncoil is not set up yet.
allowed-tools:
  - WebFetch(domain:www.uncoil.dev)
  - Bash(curl *www.uncoil.dev/*)
  - Bash(npx @uncoil.dev/sdk doctor *)
---

# Uncoil

Uncoil records every model call and tool call of an AI agent as one trace, with cost, latency, errors and quality signals. This skill is the entry point for any Uncoil task.

## Tracing the coding agent itself

To see what Codex or OpenCode did in a session, use the plugins in this repository instead of the SDK: `codex/uncoil` (Codex) and `opencode/uncoil.js` (OpenCode). Both read the same `UNCOIL_API_KEY` and send each finished turn as one trace. Claude Code needs no plugin for this: use the SDK in the app you build.

## Rules for all Uncoil work

1. **Read current docs before writing code.** SDKs change. Fetch the page for the task (see "Find documentation") instead of working from memory.
2. **Use the real package names.** npm `@uncoil.dev/sdk`, PyPI `uncoil-sdk`. Do not use any other name.
3. **Keys stay on the server.** The key is `UNCOIL_API_KEY`, set where the agent runs. Never put it in browser code, never print it, never ask the user to paste it into chat. Use `npx @uncoil.dev/sdk login`, which writes it to `.env.local`.
4. **A key belongs to one region** (EU or US). If the region and the key disagree, the client refuses to start.
5. **Cost is never guessed.** Provider wrappers store token usage and leave cost at zero until the code supplies a rate card (`calculateCost` / `calculate_cost`). Never invent prices.
6. **Record each call once.** A wrapped provider client plus framework callbacks, or a wrapper plus a manual `llmCall`, records the call twice.
7. **Tracing must never break the agent.** The SDKs swallow delivery errors. Do not add code that makes the agent wait on or fail because of telemetry.
8. **Ask before sending real user data.** Inputs and outputs are capped at 10,000 characters and obvious secrets are removed, but that is a safety net. Offer `captureInput: false` / `capture_input=False` for sensitive steps.
9. **Never guess button, menu or page names.** When you tell the user where to click in the Uncoil dashboard or in another tool's screen, use only names you read in the docs or saw in a screenshot. If you are not sure, say so and ask the user for a screenshot of that screen, then describe the next step from what it shows. Do not make up labels, menu paths or setting names, and do not say "it should be under...".

## Pick the right skill

- Adding tracing to a project: use `instrument-with-uncoil`.
- Runs missing, steps flat, cost zero, duplicates: use `debug-uncoil-traces`.
- Coming from another tool: use `migrate-to-uncoil`.
- Where the agent fails, what goes wrong most, what to fix first: use `find-agent-failures`.
- Automated quality scoring, an LLM judge that disagrees with people: use `tune-ai-judge`.
- Feedback, scores, prompts or anything else: read [references/feedback-and-scores.md](references/feedback-and-scores.md), then the docs.

## Find documentation

All pages are public. In order of preference:

1. The `uncoil-docs` MCP server (registered by this plugin) has `list_docs`, `search_docs` and `read_doc`.
2. Fetch the index: `curl -s https://www.uncoil.dev/llms.txt`, then fetch a page as Markdown by adding `.md`, for example `https://www.uncoil.dev/docs/typescript.md`.
3. Browse `https://www.uncoil.dev/docs`.

Useful pages: `quickstart`, `typescript`, `python`, `provider-integrations`, `trace-anatomy`, `feedback-and-scores`, `troubleshooting`, `data-regions`, `redaction`, `costs`, `switching`, `api`.

## Reading traces

Today the trace viewer in the dashboard (`https://eu.cloud.uncoil.dev/dashboard` or the US equivalent) is where traces are read. Project keys send data in; they do not read data back. When the user needs to inspect a run, tell them which dashboard view to open and what to look for, using [trace-anatomy](https://www.uncoil.dev/docs/trace-anatomy). Do not invent API calls for reading traces.

## Feedback

If the user reports that this skill gave wrong or outdated guidance, suggest opening an issue at `https://github.com/Uncoil-dev/skill/issues`. Do not do this for problems in the Uncoil product itself.
