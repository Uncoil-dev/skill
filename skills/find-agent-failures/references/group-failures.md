# Group failures from a JSON lines export

Input: one step per line with the SDK field names (`runId`, `createdAt`, `traceName`, `toolName`, `modelId`, `errorType`, `errorMessage`, `timedOut`, `costUsd`, `latencyMs`). If the export uses snake case, such as `run_id`, rename the fields first. Python standard library only.

```python
import json
import sys
from collections import defaultdict, Counter

steps = [json.loads(line) for line in open(sys.argv[1]) if line.strip()]
runs = defaultdict(list)
for s in steps:
    runs[s["runId"]].append(s)

cost = Counter()
groups = defaultdict(list)
for run_id, items in runs.items():
    items.sort(key=lambda s: s.get("createdAt", ""))
    first_bad = next((s for s in items if s.get("errorType") or s.get("timedOut")), None)
    if not first_bad:
        continue
    step = first_bad.get("toolName") or first_bad.get("modelId") or first_bad.get("traceName") or "unknown"
    key = (step, first_bad.get("errorType") or "timeout")
    groups[key].append(run_id)
    cost[key] += sum(s.get("costUsd") or 0 for s in items)

print(f"runs: {len(runs)}, runs with a failing step: {sum(len(v) for v in groups.values())}")
for key, ids in sorted(groups.items(), key=lambda kv: (-len(kv[1]), -cost[kv[0]])):
    step, error = key
    print(f"{len(ids):>5} runs  ${cost[key]:.2f}  {step} / {error}  e.g. {', '.join(ids[:3])}")
```

Run it as `python3 group_failures.py steps.jsonl`.

Notes:

- It picks the **first** failing step in each run, which is usually closer to the cause than the last one.
- It counts runs that errored and then recovered too. To count only runs whose last step failed, check the final item of `items` instead of the first failing one, and report the two numbers separately.
- Cost shows `$0.00` when the code never supplied prices. Report that as unknown cost.
- This finds hard failures only. For soft failures, filter runs by low score or negative feedback and read them by hand, then add them as another group.
