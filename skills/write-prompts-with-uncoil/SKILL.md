---
name: write-prompts-with-uncoil
description: >-
  Write or improve an agent's prompt using real Uncoil traces, test it against a dataset or the playground, and ship it with versioned prompts so every trace shows which version ran. Use when the user wants a better system prompt, a prompt keeps failing on some inputs, or prompts should move out of code.
allowed-tools:
  - WebFetch(domain:www.uncoil.dev)
---

# Write prompts with Uncoil

Goal: a prompt change that is based on real failures, tested before release and traceable afterwards. Do not rewrite a prompt from taste alone.

## 0. Read the current guides

Fetch as Markdown: `https://www.uncoil.dev/docs/prompts.md`, `https://www.uncoil.dev/docs/playground.md`, `https://www.uncoil.dev/docs/datasets.md`, `https://www.uncoil.dev/docs/evaluation.md`.

## 1. Start from evidence

Traces are read in the dashboard. Ask the user to open the trace viewer and share:

- three to five runs where the answer was bad, with input, output and the steps in between
- two or three runs where it was good
- any feedback or scores on those runs (`feedback-and-scores`)

Name the pattern in one sentence per failure (for example, "ignores the refund limit when the question is long"). If the cause is a wrong tool result or missing context, a prompt change will not fix it; say so and point to that step.

## 2. Write the change

- Keep the old prompt. Change one thing per version so the effect is clear.
- Put the task first, then the rules, then the format of the answer.
- Write each rule as an instruction the model can follow, with the reason when it is not obvious.
- Show one short example for any format that is easy to get wrong.
- Use variables for values that change per request. Keep them out of the fixed text so the fixed part can be cached by the provider.
- Remove instructions that no failure supports.

## 3. Test before release

1. Try the new version on the failing inputs in the prompt playground. Keep model and tools fixed.
2. Run old and new on a dataset built from real traces, including the failures and normal cases (`datasets`, `evaluation`).
3. Compare quality, cost, latency and failures. A better answer that doubles the cost is a decision to make, not a free win.

If there is no dataset, offer to build a small one from the runs in step 1 before comparing.

## 4. Move the prompt out of code

Versioned prompts let a label move without a code release. With the SDK on the server (never in browser code):

```ts
const deployed = await client.getPrompt("support-agent", "production", {
  fallback: lastKnownGoodPrompt,
});
const content = deployed.version.content;
// record the call with promptVersionId: deployed.version.id
```

```python
deployed = client.get_prompt("support-agent", "production", fallback=last_known_good_prompt)
content = deployed["version"]["content"]
# record the call with promptVersionId=deployed["version"]["id"]
```

Notes:

- Prompt responses are cached for 60 seconds by default. Use `cacheTtlMs: 0` (`cache_ttl_seconds=0`) in development to see edits at once.
- Use development, staging and production labels. Promote by moving the label.
- Give a `fallback` when the agent must work even if the prompt service cannot be reached.
- Confirm option names against `https://www.uncoil.dev/docs/prompts.md` before writing code.

## 5. Check after release

Ask the user to compare runs by prompt version in the trace viewer after real traffic has arrived: quality signals, cost, latency, errors. If the new version is worse, move the label back; no code change is needed.

## 6. Report

Give the failure pattern, the diff between old and new prompt, the test results and what is still unverified. Do not claim an improvement until the comparison shows one.
