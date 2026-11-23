# Uncoil plugin for OpenCode

Sends each finished OpenCode reply to [Uncoil](https://www.uncoil.dev): the model call, tool calls (with errors), token use, cost and the answer. Works with OpenCode 1.x plugins.

## Install

Copy the single file into the plugins folder, for all projects or one project:

```bash
mkdir -p ~/.config/opencode/plugins
curl -fsSL https://raw.githubusercontent.com/Uncoil-dev/skill/main/opencode/uncoil.js -o ~/.config/opencode/plugins/uncoil.js
```

Set your project key where OpenCode runs, then restart OpenCode:

```bash
export UNCOIL_API_KEY="uncoil_sk_live_..."
```

## Settings

Environment variables, or `~/.config/opencode/uncoil.json`:

```json
{ "apiKey": "uncoil_sk_live_...", "environment": "development", "userId": "me", "tags": ["app:web"] }
```

| Setting | Variable | Default |
| --- | --- | --- |
| `apiKey` | `UNCOIL_API_KEY` | none (nothing is sent) |
| `host` / `region` | `UNCOIL_HOST` / `UNCOIL_REGION` | the region of your key (`eu` or `us`) |
| `enabled` | `UNCOIL_OPENCODE_ENABLED` | `true`; set `false` to switch off |
| `environment` | `UNCOIL_ENVIRONMENT` | none |
| `userId` | `UNCOIL_USER_ID` | none |
| `tags` | none | none |
| `maxChars` | none | `20000` per prompt, answer or tool output |

Traces carry the `opencode` tag. Replies are sent when a session goes idle. The plugin remembers what it sent in `~/.config/opencode/uncoil-state.json`, so restarting does not send anything twice.

## Data

Prompts, answers and tool inputs and outputs are sent to Uncoil. Uncoil removes obvious secrets and masks emails, phone numbers and card numbers. The plugin never blocks OpenCode: send errors are ignored and retried when the session next goes idle.

## Develop

```bash
npm test
```

Needs Node 20 or newer. No dependencies.
