---
name: migrate-to-uncoil
description: >-
  Move tracing from another tool (LangSmith, Helicone, an OpenTelemetry exporter or similar) to Uncoil, including old traces with their original dates. Use when the user wants to switch, replace or compare tracing tools, send existing OpenTelemetry data to Uncoil, or keep their history.
allowed-tools:
  - WebFetch(domain:www.uncoil.dev)
  - Bash(npx @uncoil.dev/sdk doctor *)
---

# Migrate to Uncoil

New traces come first: run both tools side by side, compare, then remove the old one. Old traces can follow through the ingestion API with their original timestamps (see "Move history").

Fetch `https://www.uncoil.dev/docs/switching.md`, `https://www.uncoil.dev/docs/integrations.md` and `https://www.uncoil.dev/docs/api.md` first.

## 1. Interview, briefly

Ask only what the code cannot tell you:

- Which tool is in use today, and through what (SDK, callbacks, OpenTelemetry, gateway)?
- Should the old tool stay on during a trial week?
- Is there history the user wants in Uncoil? If so, how far back, and can they export it from the old tool (file or API)?

## 2. Inventory the current setup

Search the code and config for the old tool's package imports, environment variables, callbacks and exporters. List every place that records or sends traces. Show the list before changing anything.

## 3. Add Uncoil next to the old tool

Use the `instrument-with-uncoil` skill for sign-in, install and first trace.

- **OpenTelemetry:** keep the exporter and change only the destination to `https://eu.cloud.uncoil.dev/api/otel` (OTLP HTTP JSON) with the project API key as the bearer token. Use the US host for US projects. Confirm the exact headers in the integrations page.
- **LangChain / LangGraph:** keep the graph code, replace the old callback with `UncoilLangGraphHandler` / `uncoil.langgraph_callback()`.
- **A gateway such as Helicone:** keep routing and fallbacks; remove only the logging that Uncoil replaces.

## 4. Move history (only if the user asked for it)

Use only the paths that are documented. Do not invent import endpoints or SDK calls.

1. **Export first.** The user exports from the old tool (file or API). Work on a copy. Never delete anything in the old tool.
2. **Map each old record to spans.** Send them with `POST /api/ingest` on the project's region host, one span per request, bearer key from `UNCOIL_API_KEY`. Fields are in the ingestion API page. Keep these rules:
   - `createdAt` is the original time, as an ISO 8601 string. Never use the import time.
   - `spanId` and `runId` are stable ids derived from the old record id (for example a hash). Running the import twice must not create duplicates.
   - Keep a run's spans under one `runId`, with `parentSpanId` for tool calls under their model call.
   - Copy model name, token counts, latency and errors as they were. Leave cost at zero unless the user supplies a rate card. Do not invent prices.
   - Add a tag such as `imported` and the old tool's name, so imported runs can be filtered out.
3. **Redaction still applies.** Inputs and outputs are capped and obvious secrets removed. Ask before sending real user data, and offer to leave inputs out.
4. **Mind the plan's retention.** Uncoil keeps the `createdAt` you send (it only checks that it is a valid ISO date), so runs show on their original dates. A nightly job then deletes data older than the project's plan keeps (7, 30 or 90 days, by plan). Imported runs older than that are removed the next night. Check the project's plan first and tell the user which part of the history will survive.
5. **Try 20 runs first.** Open the dashboard, set the time range to the original dates and check that the runs sit on those dates with the right model, tokens and errors. If something is wrong, stop and tell the user.
6. **Then send the rest in small batches.** Respect rate limits: slow down on HTTP 429 and retry server errors, never loop without a delay. Write down which old ids were accepted so a failed import can resume.
7. **Datasets, prompts and scores.** There is no documented bulk import for these. Tell the user which ones will not move and suggest recreating the important ones in the dashboard. Check the datasets and feedback docs before offering anything else.

## 5. Compare

Run the agent and check in the dashboard that each run shows model calls, tool calls, cost and errors. Cost will read zero until a rate card is supplied. After about a week of matching results, remove the old tool's code, keys and variables in a separate change.

## 6. Report

List what was added, what was imported (count and date range) and what was not, what was left running on purpose, and what the user still has to do (remove the old keys, keep the export file). Do not call the migration finished before a trace from the real agent has been seen in Uncoil.
