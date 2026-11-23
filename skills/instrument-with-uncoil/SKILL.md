---
name: instrument-with-uncoil
description: >-
  Add Uncoil tracing to an AI agent project and verify that a first trace arrives. Use when the user wants to set up, add or install Uncoil, trace an agent, or record model and tool calls in a TypeScript/JavaScript or Python project.
allowed-tools:
  - WebFetch(domain:www.uncoil.dev)
  - Bash(npx @uncoil.dev/sdk login *)
  - Bash(npx @uncoil.dev/sdk doctor *)
---

# Instrument a project with Uncoil

Work in this order. Stop and tell the user if a step fails.

## 1. Look at the project

Find the language (TypeScript/JavaScript or Python), the package manager, and the model SDK or framework in use: `openai`, `@anthropic-ai/sdk`, Vercel AI SDK, LangChain/LangGraph, or none. Find the single place where one agent run starts (request handler, queue worker, `main`). Tell the user what you found in one line.

Fetch the current guide before writing code: `https://www.uncoil.dev/docs/typescript.md` or `https://www.uncoil.dev/docs/python.md`, and `https://www.uncoil.dev/docs/provider-integrations.md`.

## 2. Install

- TypeScript/JavaScript: `@uncoil.dev/sdk` with the project's own package manager. Node.js is required.
- Python: `uncoil-sdk` with the project's own tool (pip, uv, poetry). For providers add extras, for example `uncoil-sdk[openai,anthropic,langgraph]`.

## 3. Sign in

Run `npx @uncoil.dev/sdk login`. It prints a web address and a short code; show both to the user and wait for the command to finish. The user signs in, picks or creates a project, and the command saves `UNCOIL_API_KEY` and `UNCOIL_PROJECT_ID` to `.env.local`.

- Never ask the user to paste a key. Never invent or hard-code one.
- Use `--no-browser` when no browser is available and `--region us` for US data storage.
- Check that `.env.local` is in `.gitignore`. Do not print or commit it.
- Plain Node does not read `.env.local` by itself: use `node --env-file=.env.local <file>`. Python needs python-dotenv or exported variables.

## 4. Add tracing, with the smallest change that works

| Situation | Change |
| --- | --- |
| TypeScript with `openai` or `@anthropic-ai/sdk` | Call `init()` once at startup, before the first model call. |
| Vercel AI SDK | Wrap the model with `uncoilMiddleware()`. |
| LangChain / LangGraph | Pass `callbacks: [new UncoilLangGraphHandler()]` (TypeScript) or `uncoil.langgraph_callback()` (Python). |
| Python with OpenAI or Anthropic | `uncoil.wrap_openai(client)` / `uncoil.wrap_anthropic(client)`. |
| Anything else | Wrap the run entry point with `traceAgent` / `@trace_agent`, and record steps with `span` / `observe`. |

Rules:

- One run = one traced function call. Put `traceAgent` / `@trace_agent` at the run boundary, not around every helper.
- Step `type` is one of `agent`, `llm`, `tool`, `retrieval`, `span`.
- Use either provider wrappers or framework callbacks for a given model call, never both.
- Cost stays zero until a rate card is supplied (`calculateCost` / `calculate_cost`). Offer to add one with the user's own prices; never guess them.
- For steps with sensitive input or output set `captureInput: false` / `capture_input=False`.
- Do not add tracing twice, and do not change unrelated code.

## 5. Verify

Run `npx @uncoil.dev/sdk doctor` (Python projects can use `uncoil-doctor`). It checks the key, region and network and sends one test trace. If it fails, read the message, fix the cause and run it again. If it says the key and project do not match, repeat step 3 in this folder.

Then run the agent once for real and tell the user: which files changed, the project name doctor printed, and where to look: the project's Tracing page in the dashboard (`https://eu.cloud.uncoil.dev/dashboard` for EU, the US host for US). If nothing shows after a minute, use the `debug-uncoil-traces` skill.
