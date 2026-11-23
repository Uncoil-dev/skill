---
name: find-agent-failures
description: >-
  Find where an AI agent fails, group the failures by cause, rank them by how many runs and how much money they affect, and turn the biggest groups into fixes and test cases. Use when the user asks why the agent fails, what goes wrong most, where to start improving quality, or wants a failure report from Uncoil traces.
allowed-tools:
  - WebFetch(domain:www.uncoil.dev)
---

# Find where the agent fails

The goal is a short ranked list of failure groups, each with example runs, a likely cause and a fix to try. Do not fix single runs one by one until the groups are known.

Read `https://www.uncoil.dev/docs/trace-anatomy.md` first so field names are right. If tracing is not working at all, use `debug-uncoil-traces` instead.

## Ground rules

1. **Define "failure" with the user before counting.** Hard failures are visible in the data. Soft failures need a quality signal. Say which one each number covers.
2. **Group by cause, not by message text.** Two different error messages can have one cause; one message can hide two.
3. **Rank by impact.** Count failed runs and add the cost of those runs. A rare failure that burns a lot of money can outrank a common cheap one.
4. **Do not invent API calls to read traces.** A project key sends data in; it does not read it back. Work from the dashboard, an export, or a file the user gives you (see `export` and `health-report` in the docs). If you need rows and have none, ask the user for a file.
5. **Never paste keys, and keep prompts out of reports** unless the user asks. Use run ids and short quotes.

## Steps

### 1. Pick the window and the slice

Ask for, or infer from the data: a time range (a week or more, so rare failures show up), the environment (`production`, not `staging`), and the `release` or `deploymentId` if the question is about one change. These are real filter fields (see `tags-and-metadata`).

### 2. Collect the failures

Three sources, usually in this order:

| Kind | Where it shows | What counts |
| --- | --- | --- |
| Hard | Span fields `errorType`, `errorMessage`, `timedOut`; a run is failed when its last step ended in an error | A run that errored and recovered is a separate, softer group (look at `retryCount`) |
| Scored | Low values for a score recorded with `client.score` | Use the threshold the score was designed for |
| Reported | Negative end-user feedback (`thumb` down, low `star`, text comments) | Comments are the fastest way to learn the cause |

If there are no scores or feedback yet, say so, and suggest recording them (see `feedback-and-scores`) after this pass. Do not stop; hard failures alone are a useful start.

If the user has no export, the dashboard trace list can be filtered by environment, release and score. Tell the user which filter to apply and what to copy out. For a quick one-off summary from a file, the agent health report accepts JSON, JSON lines or CSV with the same field names as the SDK (see `health-report`).

### 3. Find the step where it went wrong

For each failed run, follow the trace order from `trace-anatomy`: start at the root, follow the waterfall to the first failed or slow child span, then look at the input and output at that step. Write one line per run: **which step** (span name, `toolName` or `modelId`), **what happened** (error type, empty output, wrong tool, loop, timeout), and **run id**.

The first bad step matters more than the last one. A tool that returned nothing at step 2 can look like a model error at step 6.

For many runs, use the script in [references/group-failures.md](references/group-failures.md) to count failures by step and `errorType` from a JSON lines export, then read three to five runs from each of the top groups by hand.

### 4. Group by cause

Use these common causes as a checklist, and add your own when none fit:

- **Tool errors**: bad arguments, timeouts, empty results, rate limits from a third-party service.
- **Retrieval misses**: the retrieval step returned nothing useful and the model answered anyway.
- **Model refusals or cut-off output**: very short or truncated answers, token limits.
- **Wrong tool or loop**: the same step repeated many times, or a tool called that should not be.
- **Instruction misses**: no error at all, but a score or feedback says the answer broke a rule.
- **Slow steps**: timeouts and the retries they trigger.
- **Platform limits**: HTTP 429 from Uncoil or from a provider; these are capacity, not quality.

Split a group when its runs need different fixes. Merge groups that share one fix.

### 5. Rank

For each group record: failed runs, share of all failed runs, total cost of those runs (`costUsd` summed per run; if cost is zero the code never supplied a rate card, so say "cost unknown" instead of guessing), typical latency, and whether it is growing or shrinking by day. Order by runs first, then cost. Note groups that appear only after one `release` as likely regressions.

### 6. Write the report

For each of the top five groups:

1. Name in plain words ("Order lookup returns nothing for guest checkouts").
2. Numbers: runs, share, cost, release or environment pattern.
3. Two or three example run ids.
4. Likely cause, and how sure you are. Say "hypothesis" when it is one.
5. One fix to try first and how you will know it worked.

End with what you did not check, such as runs outside the window or failures with no score.

### 7. Make the fixes testable

- Save two or three runs from each top group to a dataset (see `datasets`) so the fix can be tried on the same examples and compared against the baseline.
- For soft failures that keep recurring, write a judge for that one question and tune it with `tune-ai-judge` so the group can be counted automatically.
- After a fix ships, look at the same filters for the next window. The group's run count should fall. A group that moves to a different step has a second cause underneath.

## Report back

Give the user the ranked list, the definition of failure used, the window and slice, and what is still unknown. Do not say a fix worked until the next window shows the group shrinking.
