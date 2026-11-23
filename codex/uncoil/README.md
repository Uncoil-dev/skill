# Uncoil plugin for Codex

Sends each finished Codex turn to [Uncoil](https://www.uncoil.dev): the model call, every tool call (with errors), token use and the answer. Open the project in Uncoil to see what Codex did and what it cost.

## Install

```bash
codex plugin marketplace add Uncoil-dev/skill
```

Turn on hooks and the plugin in `~/.codex/config.toml` (or `<project>/.codex/config.toml`):

```toml
[features]
hooks = true

[plugins."uncoil@uncoil"]
enabled = true
```

Restart Codex. When **Hooks need review** shows up, open `/hooks` and trust the Uncoil `Stop` hook. Nothing is sent before that.

## Settings

Create an API key on the API keys page of your Uncoil project, then set it where Codex runs:

```bash
export UNCOIL_API_KEY="uncoil_sk_live_..."
```

Or save it in `~/.codex/uncoil.json` (all projects) or `<project>/.codex/uncoil.json`:

```json
{ "api_key": "uncoil_sk_live_...", "environment": "development", "tags": ["team:platform"] }
```

Environment variables win over files, and the project file wins over the home file.

| Setting | Variable | Default |
| --- | --- | --- |
| `api_key` | `UNCOIL_API_KEY` | none (nothing is sent) |
| `host` / `region` | `UNCOIL_HOST` / `UNCOIL_REGION` | the region of your key (`eu` or `us`) |
| `enabled` | `UNCOIL_CODEX_ENABLED` | `true`; set `false` to switch off |
| `environment` | `UNCOIL_ENVIRONMENT` | none |
| `user_id` | `UNCOIL_USER_ID` | none |
| `tags` | `UNCOIL_CODEX_TAGS` (comma separated) | none |
| `max_chars` | `UNCOIL_CODEX_MAX_CHARS` | `20000` per prompt, answer or tool output |
| `debug` | `UNCOIL_CODEX_DEBUG` | `false` |

Every trace carries the `codex` tag and the Codex session id, so a session reads as one conversation.

## Data

Prompts, answers and tool inputs and outputs are sent to Uncoil. Uncoil removes obvious secrets and masks emails, phone numbers and card numbers, but do not trace sessions you do not want stored there. The plugin never blocks Codex: if Uncoil cannot be reached, the turn is retried after the next turn.

## Develop

```bash
npm test
```

Needs Node 20 or newer. No dependencies.
