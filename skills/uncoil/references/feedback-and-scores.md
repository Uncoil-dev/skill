# Feedback and scores

Attach quality signals to the run that produced an answer. They show on the trace and can be filtered.

Needs: the run id, and a client created with the project id (`UNCOIL_PROJECT_ID` is written by `npx @uncoil.dev/sdk login`). Without a project id nothing is sent.

## Steps

1. Get the run id inside the traced function: `currentRunId()` (TypeScript) or `current_run_id()` (Python). Return it with the response so the UI can send it back with the feedback.
2. Check on the server that the session owns that run id before accepting feedback. Never trust a run id from an end user as is.
3. Call `client.feedback(runId, value, ...)` for people's reactions and `client.score(runId, name, value, ...)` for automated checks.

## Options to know

- `kind` for feedback: `thumb`, `star`, `text`. Inferred from the value when omitted (boolean, number, string).
- `dataType` (`data_type` in Python) for scores: `numeric`, `boolean`, `categorical`, `text`.
- `dedupeKey` (`dedupe_key`): stops a double click or retry from recording twice.
- `spanId`: attach to one step instead of the whole run.

## Example

```ts
import { UncoilClient } from "@uncoil.dev/sdk";

const client = new UncoilClient({ projectId: process.env.UNCOIL_PROJECT_ID });
client.feedback(runId, true, { kind: "thumb", dedupeKey: `${sessionId}:${runId}` });
client.score(runId, "followed_policy", true, { dataType: "boolean" });
```

```python
import os
from uncoil import UncoilClient

client = UncoilClient(project_id=os.environ["UNCOIL_PROJECT_ID"])
client.feedback(run_id, True, kind="thumb", dedupe_key=f"{session_id}:{run_id}")
client.score(run_id, "followed_policy", True, data_type="boolean")
```

Confirm option names against `https://www.uncoil.dev/docs/feedback-and-scores.md` before writing code.
