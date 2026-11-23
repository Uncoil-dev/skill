---
name: manage-prompts-with-uncoil
description: >-
  Move hardcoded prompts out of application code into Uncoil managed prompts, so a prompt can be changed, labeled and rolled back without a deploy. Use when the user wants to version prompts, edit prompts without redeploying, or stop keeping prompt text in source files.
allowed-tools:
  - WebFetch(domain:www.uncoil.dev)
  - Bash(curl *www.uncoil.dev/*)
  - Bash(npx @uncoil.dev/sdk doctor *)
---

# Manage prompts with Uncoil

Uncoil keeps prompts as named, numbered versions. A label such as `production` points at one version. The app asks Uncoil for the version behind a label when it runs, so moving the label changes the app with no deploy.

Start with the `uncoil` skill rules. Fetch `https://www.uncoil.dev/docs/prompts.md` (use `search_docs` if the page is named differently) before writing code. Tracing must already work; if it does not, use `instrument-with-uncoil` first.

## What Uncoil does and does not do

- Does: store versions, labels per environment, `{{variables}}`, text or chat type, an optional model per version. Resolves a labeled version by name with the project API key.
- Does: show, in the dashboard prompt pages, which runs used which version when the call records the version id.
- Does not: write prompt text into your source for you, or run your tests. The dashboard (the prompt management page) is where versions are created and labels are moved. The API key only reads.

## 1. Find the prompts

Search the code for long string literals, template literals, f-strings, `system` or `developer` messages and prompt files. List each with its file, its variables and which model call uses it. Show the list and let the user pick which to move. Do not move prompts that are built from user data in ways that cannot be written as `{{variables}}`.

## 2. Rewrite each as a template

Replace interpolation with `{{name}}` variables (letters, digits, `_`, `.`, `-`). Keep the wording exactly as it is; the move must not change behavior. Note the original text so it can be used as the first version and as the fallback.

## 3. Ask the user to create the prompt

You cannot create versions with the API key. Tell the user, in dashboard words:

1. Open **Prompt management** in the project.
2. Create a prompt with a short name (for example `support-reply`), paste the template, save it as version 1.
3. Give that version the label `production`. Use another label, such as `staging`, for tryouts. Labels use letters, numbers, dots, dashes and underscores, up to 40 characters.

Wait for them to confirm the name and label before changing the app.

## 4. Resolve at run time, with a fallback

Keep the old text in code as the fallback so a network problem never stops the agent.

```ts
const resolved = await client.getPrompt("support-reply", "production", {
  cacheTtlMs: 60_000,
  fallback: LOCAL_FALLBACK, // same shape: { prompt, version }
});
const text = resolved.version.content.replace(/\{\{\s*(\w[\w.-]*)\s*\}\}/g, (_, key) => vars[key] ?? "");
```

```python
resolved = client.get_prompt("support-reply", "production", cache_ttl_seconds=60, fallback=LOCAL_FALLBACK)
text = resolved["version"]["content"]
```

Rules:

- Create the client once. The result is cached for 60 seconds by default, and a stale copy is used if a refresh fails.
- Fill every variable yourself and fail the check in a test if one is left over. An unfilled `{{name}}` must never reach the model.
- The result includes `version.id`, `version.version`, `version.model` and `version.variables`. If `version.model` is set, decide whether to honor it; do not switch models silently.
- Resolving needs the API key on the server. Never resolve prompts in browser code.

## 5. Link runs to the version

In TypeScript, pass `promptVersionId: resolved.version.id` in the `llmCall` data (or the span data of the call that used the prompt) so the dashboard can group runs by version. For Python, check `https://www.uncoil.dev/docs/python.md` for a matching argument; if the SDK has none, say so and skip linking rather than inventing a parameter. Record each call once (see the `uncoil` skill).

## 6. Verify

1. Run the app once. Confirm a trace arrives and its output matches the old behavior.
2. Turn the network off or use a wrong prompt name and confirm the fallback is used and the agent still answers.
3. Ask the user to move the `staging` label to a new version, run with that environment, and confirm the new text is used with no redeploy.
4. Remove the old prompt literal from the call site, keeping only the fallback constant.

## Report

List which prompts moved, their names and labels, where the fallbacks live, and anything left in code on purpose.
