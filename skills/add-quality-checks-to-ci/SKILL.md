---
name: add-quality-checks-to-ci
description: >-
  Add AI quality checks to continuous integration: run the agent on a fixed set of cases on every pull request, score each answer, send the runs to Uncoil, and fail the build when quality drops. Use when the user wants regression tests, evals in CI, or a quality gate for prompt or model changes.
allowed-tools:
  - WebFetch(domain:www.uncoil.dev)
  - Bash(curl *www.uncoil.dev/*)
  - Bash(npx @uncoil.dev/sdk doctor *)
---

# Add quality checks to CI

The plan: a small file of cases, a script that runs the real agent on each case, scores each answer, records runs and scores in Uncoil, and exits with an error when the pass rate is too low.

Follow the `uncoil` skill rules. Fetch `https://www.uncoil.dev/docs/feedback-and-scores.md` and `https://www.uncoil.dev/docs/costs.md` first.

## What Uncoil does and does not do

- Does: record every CI run as a trace (cost, latency, errors), and store scores you send with `client.score` on a run (TypeScript and Python). Tags, `environment` and `release` on the client separate CI runs from real traffic.
- Does: offer datasets, evaluators and evaluation suites in the dashboard. They run from the dashboard.
- Does not: expose an API-key endpoint to start those suites or to read scores back. The CI pass or fail decision is made inside your script from the scores it just computed. Say this to the user before they expect a pass or fail from the dashboard.

## 1. Interview, briefly

Ask only what the code cannot tell you:

- What is the agent's entry function, and can it run in CI without real user data?
- What counts as correct: exact text, contains a phrase, valid JSON, a tool was called, or "needs a judge"?
- Which model key will CI use, and what is the budget for one run?

## 2. Write the cases

Create `evals/cases.jsonl` (or similar), one case per line: `id`, `input`, and the expectation (`expected`, `mustContain`, `tool`, or a rubric). Start with 15 to 30 cases: the ones that broke before, a few typical ones, a few hostile ones. Use synthetic or scrubbed text only. Ask the user for real failures to add; never copy production data in without asking.

## 3. Write the check script

For each case:

1. Run the agent inside a traced function and keep the run id (`currentRunId()` / `current_run_id()`).
2. Apply cheap code checks first: not empty, valid JSON, contains text, right tool, under a cost or latency limit.
3. Use a judge model only for what code cannot decide. Give it the rubric, `temperature` 0, and ask for a score and a short reason. Keep the judge prompt in the repo and treat changing it as a change to the test.
4. Send each result: `client.score(runId, "contains_refund_policy", true, { dataType: "boolean" })`.
5. Collect pass or fail in memory.

At the end, call the SDK flush or shutdown method so nothing is lost when the process exits (check `typescript.md` / `python.md` for its name), print a table of failed cases, and `process.exit(1)` / `sys.exit(1)` if the pass rate is under the threshold.

Create the client with `environment: "ci"`, `release` set to the commit SHA and `tags: ["eval"]`.

```ts
const client = new UncoilClient({
  projectId: process.env.UNCOIL_PROJECT_ID,
  environment: "ci",
  release: process.env.GITHUB_SHA,
  tags: ["eval"],
});
```

```python
client = UncoilClient(project_id=os.environ["UNCOIL_PROJECT_ID"], environment="ci", release=os.environ.get("GITHUB_SHA"), tags=["eval"])
```

Confirm constructor option names in the SDK docs before writing code.

## 4. Pick a threshold that means something

Run the suite three times on the current main and note the lowest pass rate. Set the gate a little under that, so noise does not fail builds but a real drop does. Write the number in the script and in the pull request. Model output is not fully repeatable, so never gate on a single borderline case.

## 5. Wire it into the pipeline

Example for GitHub Actions. Add a separate job so it can be required or not.

```yaml
name: Quality checks
on: pull_request
jobs:
  evals:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npm run evals
        env:
          UNCOIL_API_KEY: ${{ secrets.UNCOIL_API_KEY }}
          UNCOIL_PROJECT_ID: ${{ vars.UNCOIL_PROJECT_ID }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

Rules:

- Secrets go in the CI secret store. Never write a key into the workflow file. Ask the user to add the secrets; do not ask for the values.
- Use a project (or key) meant for CI so test traffic does not mix with production. Fork pull requests get no secrets, so skip the job there instead of failing it.
- Run only when prompt, model or agent files change if the run is slow or costs money, using `paths:` filters. Add a nightly run for the full set.
- Set a hard cap on cost and time for the job.

## 6. Verify

1. Run the script locally with the agent unchanged and confirm it passes.
2. Break something on purpose (empty the system prompt) and confirm the script exits with an error and names the failed cases.
3. Open the traces in the dashboard, filter by the `eval` tag or `ci` environment, and confirm runs and scores arrived.
4. Tell the user how to see trends: open the project's scores view and filter by release.

## Report

Say how many cases, the checks used, the threshold, the run time and cost, and what is not covered. Offer the dashboard datasets and evaluators as the next step for judge-based scoring on live traffic.
