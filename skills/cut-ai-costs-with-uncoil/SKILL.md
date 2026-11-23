---
name: cut-ai-costs-with-uncoil
description: >-
  Find where an AI agent spends money using Uncoil cost data, propose changes (cheaper model on easy steps, shorter prompts, prompt caching, fewer retries) and show the expected savings in a table. Use when the user wants to lower model cost, asks why a bill is high, or wants to know what a change would save.
allowed-tools:
  - WebFetch(domain:www.uncoil.dev)
---

# Cut AI costs with Uncoil

Goal: a short list of changes, each with a real before and after number. Never promise savings that are not backed by the user's own data.

## 0. Read the current guides

Fetch these as Markdown first: `https://www.uncoil.dev/docs/costs.md`, `https://www.uncoil.dev/docs/prompt-caching.md`, `https://www.uncoil.dev/docs/evaluation.md`.

## 1. Check that cost is recorded

Uncoil never guesses prices. If cost shows as 0, the code has no rate card yet. Add `calculateCost` / `calculate_cost` (wrapped provider clients) or pass `costUsd` / `cost_usd` with `step.set` on the model span, using the provider's current published rates. Ask the user for the rates or read them from the provider's price page; do not invent them. If cost is still 0 after that, use the `debug-uncoil-traces` skill.

## 2. Get the numbers

Traces are read in the dashboard, not through project keys. Ask the user to open the cost view and the trace viewer for a representative period and share, per model and per step name:

- total cost and number of calls
- input and output tokens
- average latency
- the five most expensive runs

A screenshot or a copied table is enough. Do not invent API calls for reading traces. If the user wants a copy of the data, see `https://www.uncoil.dev/docs/export.md`.

## 3. Find the biggest lever

Sort by total cost, not by price per call. A cheap step called often can cost more than a rare expensive one. Check in this order:

| Lever | Look for | Change |
| --- | --- | --- |
| Model too large for the step | Classification, routing, extraction or formatting steps on the largest model | Try a smaller model on that step only |
| Long repeated input | Same system prompt or documents at the start of every call | Order the prompt so the stable part comes first and use the provider's prompt caching |
| Bloated context | Input tokens far above what the answer needs | Trim history, retrieve fewer chunks, drop unused tool descriptions |
| Long output | Output tokens high for short answers | Ask for a shorter format, set a maximum output length |
| Retries and loops | The same step many times in one run, or runs that end in an error after many calls | Fix the cause, cap the loop |
| Duplicate calls | A call recorded twice | Keep one recording path (see `debug-uncoil-traces`) |

## 4. Prove quality does not drop

A cheaper run that is wrong is not a saving. Before any change reaches production:

1. Run the old and the new version on the same inputs, ideally a dataset built from real traces (`https://www.uncoil.dev/docs/datasets.md`).
2. Compare quality signals, cost, latency and failures side by side (`evaluation`).
3. If the prompt changed, record `promptVersionId` so the trace viewer can compare runs by version.

If the user has no test set yet, say so and suggest a small one before changing models.

## 5. Show the savings

Compute from the user's numbers and mark every row as measured or estimated. Template:

| Change | Steps affected | Cost before | Cost after | Saving | Basis | Quality check |
| --- | --- | --- | --- | --- | --- | --- |
| Smaller model for routing step | `route` | measured from traces | measured on test set | difference | measured | dataset run, passed |
| Stable prompt first, caching on | `answer` | measured | estimate from cached share | estimate | estimated | not yet run |

Rules for the table:

- Use the period's real totals. State the period.
- An estimate says what it assumes (for example, the share of input tokens that would be cached).
- Put the monthly figure last, as `saving per period x periods`, and say how it was derived.
- Do not add a row without a number behind it.

## 6. Report

Give the table, the order to ship the changes in (largest verified saving first), and what is still unverified. After shipping, ask the user to compare the cost view for the same length of time and report the real result against the estimate.
