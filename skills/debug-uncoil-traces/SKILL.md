---
name: debug-uncoil-traces
description: >-
  Find out why Uncoil traces are missing, flat, cut off, rate limited, duplicated or show zero cost. Use when runs do not appear in the dashboard, steps are not nested, a cost shows as 0, a call is recorded twice, or the user says tracing is not working.
allowed-tools:
  - WebFetch(domain:www.uncoil.dev)
  - Bash(npx @uncoil.dev/sdk doctor *)
---

# Debug Uncoil traces

Start with facts, not guesses. Work through the checks in order and stop at the first one that explains the symptom.

## 0. Fetch the current guide

`https://www.uncoil.dev/docs/troubleshooting.md` is the source of truth for messages and fixes. Read it first; the list below is a map, not a replacement.

## 1. Run the doctor

`npx @uncoil.dev/sdk doctor` (Python: `uncoil-doctor`). Add `--no-send` to skip the test trace. It checks the key, region, host and network, and names the project the key belongs to. Exit code 1 means a check failed; fix that before anything else. Run it from the folder where the agent runs, because each folder has its own key.

## 2. Match the symptom

| Symptom | Look at |
| --- | --- |
| Nothing appears | `UNCOIL_API_KEY` missing in the environment where the agent really runs (the SDK warns `UNCOIL_API_KEY is not set`; Python raises `ValueError`). |
| `Uncoil API key region mismatch` | Key and `region` / `UNCOIL_REGION` disagree. Keys without a region marker count as EU. |
| `Uncoil rejected the API key` (401) or `not allowed to send data` (403) | Wrong or revoked key, or a key from another project than the one being viewed. |
| `Could not reach Uncoil` | Network, firewall or proxy. Check `host` / `UNCOIL_HOST`; a bad value fails with `bad_host`. |
| Short script or serverless handler, last runs missing | The TypeScript SDK sends in the background and has no flush. Keep the process alive until work settles. |
| Many one-step traces instead of one run | Calls happen outside a `traceAgent` / `@trace_agent` function. |
| Steps appear but are not nested | Work is not awaited inside the `span` callback or `with` block, or runs in a detached process or queue consumer. |
| Some runs missing | `sampleRate` / `sample_rate` below 1. Sampling is per run; errors are still kept unless `keepErrors` is false. Set it to 1 while debugging. |
| `Uncoil is receiving too much data` (429) | Lower volume with `sampleRate`, or upgrade the plan. Spans sent at that moment are lost. |
| Cost is 0 | Expected until the code passes `calculateCost` / `calculate_cost` or `costUsd`. Uncoil never guesses prices. |
| A model call twice | Two recording paths on one call: wrapper plus framework callbacks, or wrapper plus manual `llmCall`. Keep one. |
| Input or output cut off or redacted | By design: 10,000 character cap and secret removal. Use `captureInput` / `captureOutput` set to false for less. |

To see failures in the agent's own logs, pass `onError` to receive ingestion problems in code instead of a console warning.

## 3. Report

Say which check explained it, what you changed, and how you verified (for example, a doctor run that passed and the run id it printed). If the cause is outside the SDK (network policy, plan limits), say so and name who must act. Do not claim a fix works until a trace has arrived.
