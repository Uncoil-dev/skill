import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const DEFAULT_HOSTS = {
  eu: "https://eu.cloud.uncoil.dev",
  us: "https://us.cloud.uncoil.dev",
};

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return {};
  }
}

function regionOfKey(key) {
  const match = /^uncoil_sk_live_(eu|us)_/.exec(key ?? "");
  return match ? match[1] : "eu";
}

/**
 * Settings come from ~/.codex/uncoil.json, then <project>/.codex/uncoil.json,
 * then environment variables. Later sources win.
 */
export function loadConfig({ env = process.env, cwd = process.cwd(), home = homedir() } = {}) {
  const file = { ...readJson(join(home, ".codex", "uncoil.json")), ...readJson(join(cwd, ".codex", "uncoil.json")) };
  const apiKey = env.UNCOIL_API_KEY || file.api_key || "";
  const host = (env.UNCOIL_HOST || file.host || DEFAULT_HOSTS[env.UNCOIL_REGION || file.region || regionOfKey(apiKey)] || DEFAULT_HOSTS.eu).replace(/\/+$/, "");
  const enabledSetting = env.UNCOIL_CODEX_ENABLED ?? file.enabled;
  const tags = env.UNCOIL_CODEX_TAGS ? env.UNCOIL_CODEX_TAGS.split(",") : file.tags;
  return {
    apiKey,
    host,
    enabled: enabledSetting === undefined ? true : String(enabledSetting) !== "false",
    environment: env.UNCOIL_ENVIRONMENT || file.environment || undefined,
    endUserId: env.UNCOIL_USER_ID || file.user_id || undefined,
    tags: Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean) : [],
    maxChars: Number(env.UNCOIL_CODEX_MAX_CHARS || file.max_chars || 20000),
    debug: String(env.UNCOIL_CODEX_DEBUG ?? file.debug ?? "false") === "true",
    stateDir: join(home, ".codex", "uncoil-state"),
  };
}
