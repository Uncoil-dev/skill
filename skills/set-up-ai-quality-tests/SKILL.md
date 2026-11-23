---
name: set-up-ai-quality-tests
description: >-
  Set up repeatable quality tests (evals) for an AI agent: find the gaps in current checks, add scores to Uncoil runs, run a dataset against the agent and set a pass bar before changes ship. Use when the user wants evals, quality checks, regression tests for prompts or models, or asks how to know an answer is good.
allowed-tools:
  - WebFetch(domain:www.uncoil.dev)
  - Bash(npx @uncoil.dev/sdk doctor *)
---

# Set up AI quality tests

Goal: before any prompt or model change ships, a fixed set of cases runs, each case gets scores, and a written bar says pass or fail. Work in the order below.

## 0. Read the current guides

Fetch `https://www.uncoil.dev/docs/evaluation.md`, `https://www.uncoil.dev/docs/feedback-and-scores.md` and `https://www.uncoil.dev/docs/release-gates.md`. Use only features those pages describe. Never guess dashboard button names; ask the user for a screenshot instead. Tracing must already work. If it does not, use `instrument-with-uncoil` first.

## 1. Find the gaps

Inspect the repository and ask the user. Mark each line yes or no:

| Question | If no |
| --- | --- |
| Does each run record a score or feedback in Uncoil? | Step 2 |
| Is there a saved dataset of real cases? | Use `build-test-dataset` |
| Can one command run the dataset against the agent? | Step 3 |
| Is there a written pass bar for quality, cost and latency? | Step 4 |
| Do runs carry `release` and `environment`, so test runs stay apart from production? | Step 3 |
| Is there a human check for cases that automated checks cannot judge? | Step 5 |

Report the gaps first, then fix them in order. Do not add checks nobody asked about.

## 2. Score runs

Use `client.score` for automated checks and `client.feedback` for people. Both need a client with the project id (`UNCOIL_PROJECT_ID`, written by `npx @uncoil.dev/sdk login`) and a run id from `currentRunId()` / `current_run_id()`.

Pick two to four scores. Each must answer one real question:

| Score | Type | Check with |
| --- | --- | --- |
| `followed_policy` | `boolean` | Plain code: required and forbidden phrases, JSON shape, tool called or not |
| `grounded` | `numeric` 0 to 1 | A judge model reading the answer and the evidence it was given |
| `task_done` | `boolean` | Code first; a judge only when code cannot decide |

Prefer plain code checks. Use a judge model only for what code cannot decide, and keep its prompt short, with one question and a fixed scale. Check the judge against 10 or more cases a human already marked before trusting it.

```ts
import { traceAgent, currentRunId, UncoilClient } from "@uncoil.dev/sdk";

const client = new UncoilClient({ projectId: process.env.UNCOIL_PROJECT_ID });

const runAgent = traceAgent(async (input: string) => {
  const answer = await answerQuestion(input);
  client.score(currentRunId(), "followed_policy", checkPolicy(answer), { dataType: "boolean" });
  return answer;
}, { name: "support-agent", environment: "eval", tags: ["eval"] });
```

```python
from uncoil import UncoilClient, trace_agent, current_run_id

client = UncoilClient(project_id=os.environ["UNCOIL_PROJECT_ID"])

@trace_agent(client=client, name="support-agent", environment="eval", tags=["eval"])
async def run_agent(text: str):
    answer = await answer_question(text)
    client.score(current_run_id(), "followed_policy", check_policy(answer), data_type="boolean")
    return answer
```

Confirm option names in the feedback page before writing code. Scoring never throws into the agent, so a delivery failure will not fail a test. Check scores locally as well as in Uncoil.

## 3. Run the dataset

Write one script, for example `evals/run.ts` or `evals/run.py`, that:

1. Reads `evals/dataset.jsonl`.
2. Calls the traced agent for each case, with `environment` set to `eval` and `release` set to the candidate version, so the runs can be filtered apart from production.
3. Applies the checks from step 2 and keeps the results in memory.
4. Prints a table: case id, each score, pass or fail, cost and time.
5. Exits with code 1 when the bar from step 4 is not met.

Run cases with small concurrency to stay under rate limits. Never run the script against production data stores or send real customer messages. Ask before running if the dataset would call paid tools or send email.

Run the baseline (current prompt and model) and the candidate on the same dataset, then compare score, cost and latency side by side. Cost is zero until the code supplies a rate card; never invent prices.

## 4. Write the pass bar

Put it in `evals/README.md` where the team will see it:

- Which dataset version and which scores.
- Minimum pass rate per score. Start at the baseline result, not at a hopeful number.
- Limits on cost and latency, for example no more than 10 percent above baseline.
- Cases that must never fail, whatever the average.

A candidate ships only when it meets the bar. Link the evaluation run to the release so a later regression has a starting point (see release gates in the docs).

## 5. Add a human check

For cases a code check or judge cannot settle, set up a human review queue as the docs describe. Store the reviewer score with the trace. When reviewers disagree, fix the written rule, not the score.

## 6. Run it where changes happen

Add the script to the project's test command, and to CI only if the user wants that. Pass the key through the CI secret store, never in the repository. Keep the run short; if it takes more than a few minutes, cut cases or run a small set on every change and the full set before release.

## Report

List the gaps found, what you added, the baseline numbers, and the command to run the tests. State what is still manual. Do not say the tests protect quality until a run has passed and a deliberately worse prompt has failed.
