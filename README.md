# Uncoil plugin for Claude Code

Skills that teach Claude Code (and other agents that read the Agent Skills format) how to work with [Uncoil](https://www.uncoil.dev), the observability platform for AI agents.

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

## Use it

Ask in plain words. Claude picks the right skill:

- "Add Uncoil tracing to this project."
- "My traces do not show up. Check why."
- "Record thumbs up and down feedback on each run."
- "Move this app from LangSmith to Uncoil."

## Keys and data

Skills never ask you to paste an API key into chat. Sign in with `npx @uncoil.dev/sdk login`, which saves the key to `.env.local` for the folder. Keep that file out of git.

## Contribute

Edit the files in `skills/`, then run `node scripts/validate.mjs`. The same check runs in CI.

## License

MIT
