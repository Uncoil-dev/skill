# Measure judge agreement

Save the labeled examples as JSON lines, one object per line, with `label` (human) and `verdict` (judge). This script uses only the Python standard library.

```python
import json
import sys
from collections import Counter

rows = [json.loads(line) for line in open(sys.argv[1]) if line.strip()]
positive = sys.argv[2] if len(sys.argv) > 2 else "fail"  # the class you most want to catch

classes = sorted({r["label"] for r in rows} | {r["verdict"] for r in rows})
table = Counter((r["label"], r["verdict"]) for r in rows)
total = len(rows)
agree = sum(table[(c, c)] for c in classes)

print(f"examples: {total}")
print(f"agreement: {agree / total:.2%}")
print("\nhuman \\ judge  " + "  ".join(f"{c:>8}" for c in classes))
for h in classes:
    print(f"{h:>14}  " + "  ".join(f"{table[(h, j)]:>8}" for j in classes))

tp = table[(positive, positive)]
judged = sum(table[(h, positive)] for h in classes)
actual = sum(table[(positive, j)] for j in classes)
print(f"\n'{positive}' precision: {tp / judged:.2%}" if judged else "\njudge never said '%s'" % positive)
print(f"'{positive}' recall:    {tp / actual:.2%}" if actual else "no human '%s' labels" % positive)

expected = sum(
    (sum(table[(c, j)] for j in classes) / total) * (sum(table[(h, c)] for h in classes) / total)
    for c in classes
)
kappa = (agree / total - expected) / (1 - expected) if expected < 1 else 1.0
print(f"kappa: {kappa:.2f}")
```

Run it as `python3 agreement.py tuning.jsonl fail`, then again on the held-out file.

Reading the output:

- **Agreement** alone misleads when one class is rare. A judge that always says `pass` scores 95% when 95% of answers pass. Look at recall and kappa.
- **Recall on the class that matters** says how many real problems the judge catches. **Precision** says how many of its alarms are real.
- If a class has fewer than about 10 labeled examples, treat its numbers as a rough hint and collect more labels.
