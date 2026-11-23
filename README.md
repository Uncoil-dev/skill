# Uncoil for coding agents

Skills and plugins for [Uncoil](https://www.uncoil.dev), the observability platform for AI agents.

| Tool | What you get | Folder |
| --- | --- | --- |
| Claude Code and Cursor | Skills that add tracing, debug traces and migrate from other tools | [`skills/`](skills) |
| Codex | A plugin that sends every Codex turn to Uncoil as a trace | [`codex/uncoil`](codex/uncoil) |
| OpenCode | A plugin that sends every OpenCode reply to Uncoil as a trace | [`opencode`](opencode) |

## Skills for Claude Code and other agents

Skills teach Claude Code (and other agents that read the Agent Skills format) how to work with Uncoil.

## Skills

| Skill | What it does |
| --- | --- |
| [`uncoil`](skills/uncoil/SKILL.md) | Main skill. Looks up current Uncoil docs and applies the SDK rules that every Uncoil task needs. |
| [`instrument-with-uncoil`](skills/instrument-with-uncoil/SKILL.md) | Adds tracing to an agent project, signs in from the terminal and verifies that a first trace arrives. |
| [`debug-uncoil-traces`](skills/debug-uncoil-traces/SKILL.md) | Finds out why runs are missing, steps are flat, cost is zero or calls appear twice. |
| [`migrate-to-uncoil`](skills/migrate-to-uncoil/SKILL.md) | Moves tracing from LangSmith, Helicone, an OpenTelemetry setup or another tool to Uncoil. |
| [`find-agent-failures`](skills/find-agent-failures/SKILL.md) | Finds where the agent fails, groups failures by cause and turns the biggest groups into fixes and test cases. |
| [`cut-ai-costs-with-uncoil`](skills/cut-ai-costs-with-uncoil/SKILL.md) | Finds where the agent spends money and shows the expected savings in a table. |
| [`write-prompts-with-uncoil`](skills/write-prompts-with-uncoil/SKILL.md) | Improves a prompt from real traces, tests it and ships it as a versioned prompt. |
| [`manage-prompts-with-uncoil`](skills/manage-prompts-with-uncoil/SKILL.md) | Moves hardcoded prompts into Uncoil managed prompts that change without a deploy. |
| [`build-test-dataset`](skills/build-test-dataset/SKILL.md) | Builds a small, balanced test dataset from real traces. |
| [`set-up-ai-quality-tests`](skills/set-up-ai-quality-tests/SKILL.md) | Sets up repeatable quality tests with scores and a pass bar. |
| [`tune-ai-judge`](skills/tune-ai-judge/SKILL.md) | Builds an AI judge and tunes it against answers a person has labeled. |
| [`add-quality-checks-to-ci`](skills/add-quality-checks-to-ci/SKILL.md) | Runs quality checks on every pull request and fails the build when quality drops. |

The plugin also registers the read-only Uncoil docs server (`https://www.uncoil.dev/api/docs/mcp`), so Claude can search and read the documentation.

## Install

In Claude Code:

```
/plugin marketplace add Uncoil-dev/skill
/plugin install uncoil@uncoil
```

In Cursor, open Customize in the sidebar, find the Uncoil plugin and select Install. Until the listing is live, add this repository as a team marketplace (Dashboard, Plugins & MCPs, Import from Repo), or copy the bundle to `~/.cursor/plugins/local/uncoil` and reload the window:

```bash
node scripts/bundle.mjs ~/.cursor/plugins/local/uncoil
```

Or install only the skills with the skills CLI:

```bash
npx skills add Uncoil-dev/skill
```

Or clone the repository and copy a folder from `skills/` into `~/.claude/skills/`.

## Codex plugin

Sends each finished Codex turn (model call, tool calls, token use, answer) to your Uncoil project.

```bash
codex plugin marketplace add Uncoil-dev/skill
```

Then turn on hooks and the plugin in `~/.codex/config.toml`:

```toml
[features]
hooks = true

[plugins."uncoil@uncoil"]
enabled = true
```

Set your project key where Codex runs, for example `export UNCOIL_API_KEY=uncoil_sk_live_...`, then restart Codex and trust the Uncoil `Stop` hook in `/hooks`. Nothing is sent before you trust it. Full settings are in [`codex/uncoil/README.md`](codex/uncoil/README.md).

## OpenCode plugin

Sends each finished OpenCode reply and its tool calls to your Uncoil project. Copy one file:

```bash
mkdir -p ~/.config/opencode/plugins
curl -fsSL https://raw.githubusercontent.com/Uncoil-dev/skill/main/opencode/uncoil.js -o ~/.config/opencode/plugins/uncoil.js
export UNCOIL_API_KEY=uncoil_sk_live_...
```

Restart OpenCode. Full settings are in [`opencode/README.md`](opencode/README.md).

## Use it

Ask in plain words. Claude picks the right skill:

- "Add Uncoil tracing to this project."
- "My traces do not show up. Check why."
- "Record thumbs up and down feedback on each run."
- "Move this app from LangSmith to Uncoil."

## Keys and data

Skills never ask you to paste an API key into chat. Sign in with `npx @uncoil.dev/sdk login`, which saves the key to `.env.local` for the folder. Keep that file out of git.

## Contribute

Edit the files in `skills/`, then run `node scripts/validate.mjs`. Plugin tests: `cd codex/uncoil && npm test` and `cd opencode && npm test`. The same checks run in CI.

## License

MIT
