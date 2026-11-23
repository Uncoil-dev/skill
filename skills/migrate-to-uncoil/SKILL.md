---
name: migrate-to-uncoil
description: >-
  Move tracing from another tool (LangSmith, Helicone, an OpenTelemetry exporter or similar) to Uncoil. Use when the user wants to switch, replace or compare tracing tools, or send existing OpenTelemetry data to Uncoil.
allowed-tools:
  - WebFetch(domain:www.uncoil.dev)
  - Bash(npx @uncoil.dev/sdk doctor *)
---

# Migrate to Uncoil

Uncoil only receives new traces. History does not move across, so the safe plan is to run both tools side by side, compare, then remove the old one.

Fetch `https://www.uncoil.dev/docs/switching.md` and `https://www.uncoil.dev/docs/integrations.md` first.

## 1. Interview, briefly

Ask only what the code cannot tell you:

- Which tool is in use today, and through what (SDK, callbacks, OpenTelemetry, gateway)?
- Should the old tool stay on during a trial week?
- Is there history the user must keep? If so, tell them to export it from the old tool before turning it off.

## 2. Inventory the current setup

Search the code and config for the old tool's package imports, environment variables, callbacks and exporters. List every place that records or sends traces. Show the list before changing anything.

## 3. Add Uncoil next to the old tool

Use the `instrument-with-uncoil` skill for sign-in, install and first trace.

- **OpenTelemetry:** keep the exporter and change only the destination to `https://eu.cloud.uncoil.dev/api/otel` (OTLP HTTP JSON) with the project API key as the bearer token. Use the US host for US projects. Confirm the exact headers in the integrations page.
- **LangChain / LangGraph:** keep the graph code, replace the old callback with `UncoilLangGraphHandler` / `uncoil.langgraph_callback()`.
- **A gateway such as Helicone:** keep routing and fallbacks; remove only the logging that Uncoil replaces.

## 4. Compare

Run the agent and check in the dashboard that each run shows model calls, tool calls, cost and errors. Cost will read zero until a rate card is supplied. After about a week of matching results, remove the old tool's code, keys and variables in a separate change.

## 5. Report

List what was added, what was left running on purpose, and what the user still has to do (remove the old keys, export history). Do not call the migration finished before a trace from the real agent has been seen in Uncoil.
