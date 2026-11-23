---
name: build-test-dataset
description: >-
  Build a small, balanced test dataset for an AI agent from real Uncoil traces, with inputs, expected behavior and a label for why each case exists. Use when the user wants test cases, a golden set, regression examples, or says they have no way to check a prompt or model change.
allowed-tools:
  - WebFetch(domain:www.uncoil.dev)
---

# Build a test dataset

A dataset makes a quality decision repeatable. It is a short list of cases the agent must keep handling well. Aim for 30 to 100 cases that run in minutes, not thousands that nobody runs.

## 0. Read the current guides

Fetch `https://www.uncoil.dev/docs/datasets.md`, `https://www.uncoil.dev/docs/feedback-and-scores.md` and `https://www.uncoil.dev/docs/annotation-queues.md`. Dashboard buttons and menus change. Never guess a button name: if you cannot find a view in the docs, ask the user to describe or screenshot their screen.

## 1. Decide what the dataset protects

Ask one question: "What must this agent never get wrong?" Write the answer as one sentence at the top of the dataset file. Every case must serve it.

## 2. Pick cases from real traces

Traces are read in the dashboard. Project keys send data in; they do not read data back, so do not invent API calls to fetch traces. Ask the user to open the runs list and filter, then paste or export the chosen inputs.

Useful filters, using fields the SDKs already record:

| Bucket | Where to find it | Target share |
| --- | --- | --- |
| Common requests | Most frequent `tags` or trace names | 40% |
| Known failures | Runs with errors, low scores or thumbs down | 30% |
| Edge cases | Very long runs, many tool calls, high cost, unusual `metadata` | 20% |
| Must-not-break | Cases from past incidents or policy rules | 10% |

Spread cases over several `endUserId` and `sessionId` values. Do not take ten cases from one customer.

## 3. Remove private data first

Swap names, emails, account numbers and secrets for realistic fakes before a case is written to a file. Uncoil removes obvious secrets from stored traces, but that is a safety net, not a guarantee. Show the user three cleaned cases and get a yes before writing the rest. See `https://www.uncoil.dev/docs/redaction.md`.

## 4. Write each case

One JSON object per line in `evals/dataset.jsonl`. Keep the file in the repository so it is reviewed like code.

```json
{"id": "refund-late-001", "bucket": "known-failure", "input": "I want my money back for order 1234, it came late.", "expected": "Offers a refund path and quotes the 30 day policy. Does not promise a refund.", "must_include": ["30 days"], "must_not_include": ["guaranteed refund"], "source_run_id": "<run id from the dashboard>"}
```

Rules for `expected`:

- Describe behavior, not exact words. Models phrase things differently each run.
- One clear pass or fail question per case. Split cases that test two things.
- Add `must_include` and `must_not_include` only when a plain text check is reliable.
- Keep `source_run_id` so the case links back to the trace it came from.

## 5. Check the dataset itself

- No two cases test the same thing. Remove near duplicates.
- Each bucket has cases. An all-happy-path set hides regressions.
- Run every case through the current agent once. Look at the failures by hand: is the agent wrong, or is the `expected` wrong? Fix the case when the case is wrong.
- Where two people would disagree on pass or fail, send the case to a human review queue (see `annotation-queues`) and write down the rule they settle on.

## 6. Keep it alive

- Freeze the dataset while comparing a prompt or model candidate. Change cases only between comparisons, and note the date.
- After each production failure, add the failing run as a new case in the same change that fixes it.
- Record the dataset version (a date or git hash) in the `metadata` of eval runs so results can be compared later.

To run the dataset and read the results, use `set-up-ai-quality-tests`.

## Report

Give the user the file path, the number of cases per bucket, the sentence the dataset protects, and what you left out on purpose. Do not call the dataset finished until the agent has been run on it once.
