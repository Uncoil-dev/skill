---
name: tune-ai-judge
description: >-
  Build and tune an AI judge (an LLM that scores agent answers) against examples a person has already labeled, measure how often it agrees with them, fix the rubric, and record its scores on Uncoil traces. Use when the user wants automated quality scoring, an LLM-as-judge, an evaluator they can trust, or says the judge scores do not match their own opinion.
allowed-tools:
  - WebFetch(domain:www.uncoil.dev)
---

# Tune an AI judge

A judge is only useful when it agrees with people on the cases that matter. Do not ship a judge on a hunch. Label first, measure agreement, fix the rubric, measure again, then switch it on.

Read `https://www.uncoil.dev/docs/feedback-and-scores.md` and `https://www.uncoil.dev/docs/evaluation.md` first. Option names come from there, not from memory.

## Ground rules

1. **Humans label, the judge is measured against them.** Never use the judge's own output as the answer key.
2. **One question per judge.** "Did the answer follow the refund policy?" is a judge. "Was the answer good?" is three judges. Split it.
3. **Prefer pass/fail or a short category list** over a 1 to 10 scale. Models and people both drift on wide scales.
4. **Keep a held-out set.** Tune on one part of the labels, report agreement on the other part. Never tune on the numbers you report.
5. **Do not invent API calls to read traces.** A project key sends data in. Examples come from the dashboard, from an export, or from a file the user gives you (see `export` and `datasets` in the docs).
6. **Never print or paste keys.** The judge model uses its own provider key from the environment of the code that runs it.

## Steps

### 1. Fix the question and the labels

Write the question in one sentence and the allowed answers (for example `pass`, `fail`). Then find labeled examples:

- End-user feedback already on traces (`thumb`, `star`).
- Scores a reviewer recorded, or a human review queue the team already uses.
- A spreadsheet the user keeps.

If fewer than about 30 labeled examples exist, say so and ask the user to label more before going on. Aim for 50 to 100, and make sure each answer has at least 10 examples; a judge tested on one class can look perfect and be useless. Include known failures and edge cases, not only easy ones.

Save each example with the fields: `runId`, `input`, `output`, `label`, and optionally a short `reason` from the person who labeled it. The `reason` is the best source for rubric wording.

### 2. Split the examples

Put about 60% in a tuning set and 40% in a held-out set, keeping the class mix the same in both. Write the split to disk so later runs use the same one.

### 3. Write the first judge prompt

The prompt has four parts: the question, the rule for each answer in plain words, two or three short labeled examples taken from the tuning set (one for each answer), and the output format. Ask for the reason first and the verdict last, as strict JSON, for example `{"reason": "...", "verdict": "pass"}`. Give the judge only what a reviewer would see: the input, the output, and any evidence the question needs. Leave out the human label.

Set the judge model's temperature to 0 if the provider allows it, and record which model and prompt version you used.

### 4. Measure agreement

Run the judge over the tuning set. Use [references/agreement.md](references/agreement.md) for a small script that prints:

- agreement rate,
- a confusion table (judge verdict against human label),
- precision and recall for the class that matters most (usually `fail`),
- Cohen's kappa, which corrects for guessing.

A rough guide: kappa above 0.6 is usable, above 0.8 is strong. Below 0.4 the judge is close to guessing; fix the rubric before anything else. If recall on `fail` is low, the judge is too kind and will hide problems.

### 5. Read the disagreements

Open every case where judge and human differ. For each one, decide which side is wrong:

| Cause | Fix |
| --- | --- |
| The judge missed a rule the human applied | Add that rule to the prompt in plain words. |
| The rule is vague and the judge guessed | Replace the vague word with a test the judge can check. |
| The human labels disagree with each other | Fix the labels and write down the rule that settles it. Do not tune the judge to noise. |
| The judge lacked evidence the human had | Give the judge that evidence, or narrow the question. |
| Style bias (prefers long or polished answers) | State that length and tone do not count. |

Change one thing at a time, then re-run step 4. Keep a short log: prompt version, kappa, what changed.

### 6. Check once on the held-out set

When tuning stops helping, run the judge on the held-out set once. Report agreement, kappa and the confusion table. If held-out kappa is much lower than tuning kappa, the prompt is fitted to the tuning examples; simplify it and go back to step 5 with fresh examples.

### 7. Turn it on

Record the verdict on the run the answer came from. Put the judge version in the score name so changes stay comparable:

```ts
client.score(runId, "followed_refund_policy_v2", verdict === "pass", { dataType: "boolean" });
```

```python
client.score(run_id, "followed_refund_policy_v2", verdict == "pass", data_type="boolean")
```

Rules for the call:

- The client needs `projectId`. Without it nothing is sent.
- Run the judge **after** the answer is returned to the user, in the background. Never make the user wait for it and never let a judge error break the agent.
- Do not wrap the judge model call in the agent's own `traceAgent` function, or its steps will show up inside the run it is grading. Keep judge calls outside that function.
- Use `dedupeKey` when a job can retry, so one answer gets one score.
- For a numeric score use `dataType: "numeric"`; for a category list use `"categorical"`.

### 8. Keep it honest

- **Spot-check weekly.** Have a person label 10 to 20 fresh runs the judge scored, and re-run step 4 on them. Judges drift when the agent, the model or the traffic changes.
- **Send uncertain cases to people.** Anything the judge marks as borderline, or any run with negative end-user feedback, should go to a human review queue. Use their labels to grow the example set.
- **Gate releases on it only after step 6.** A judge that passes held-out checks can be a condition in a release gate (see `release-gates` in the docs). Before that it is a hint, not a gate.

## Report

Give the user: the question, how many labeled examples, held-out agreement and kappa, the confusion table, the final prompt version, and what you did not verify (for example, no labels for a rare case). Do not call a judge "accurate" without the held-out numbers.
