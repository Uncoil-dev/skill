# Uncoil for coding agents

Skills and plugins for [Uncoil](https://www.uncoil.dev), the observability platform for AI agents.

| Tool | What you get | Folder |
| --- | --- | --- |
| Claude Code | Skills that add tracing, debug traces and migrate from other tools | [`skills/`](skills) |
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

The plugin also registers the read-only Uncoil docs server (`https://www.uncoil.dev/api/docs/mcp`), so Claude can search and read the documentation.

## Install

In Claude Code:

```
/plugin marketplace add Uncoil-dev/skill
/plugin install uncoil@uncoil
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
