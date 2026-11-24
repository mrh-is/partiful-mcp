import { existsSync, mkdirSync, readFileSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import type { PartifulConfig } from "./types.js";

// Resolves a PartifulConfig from env vars and/or ~/.config/partiful-mcp/config.json
// (env takes priority over the file; see README "Configuration"). Called
// once at startup by index.ts, before the API client is constructed.

const DEFAULT_FIREBASE_API_KEY = "AIzaSyCky6PJ7cHRdBKk5X7gjuWERWaKWBHr4_k";
const DEFAULT_CONFIG_PATH = join(homedir(), ".config", "partiful-mcp", "config.json");
const LEGACY_CONFIG_PATH = join(homedir(), ".partiful-config.json");

interface ConfigFile {
  auth_token?: string;
  user_id?: string;
  refresh_token?: string;
  firebase_api_key?: string;
}

function readConfigFile(path: string): ConfigFile | null {
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw) as ConfigFile;
}

// One-time move of the pre-XDG config file (~/.partiful-config.json) to the
// new default location. Keeps the file's mode (600) & never overwrites.
function migrateLegacyConfig(): void {
  if (existsSync(DEFAULT_CONFIG_PATH) || !existsSync(LEGACY_CONFIG_PATH)) return;
  try {
    mkdirSync(dirname(DEFAULT_CONFIG_PATH), { recursive: true, mode: 0o700 });
    renameSync(LEGACY_CONFIG_PATH, DEFAULT_CONFIG_PATH);
    console.error(
      `Moved ${LEGACY_CONFIG_PATH} to ${DEFAULT_CONFIG_PATH}`
    );
  } catch (error) {
    console.error(`Could not migrate ${LEGACY_CONFIG_PATH}:`, error);
  }
}

export function loadConfig(configPath = DEFAULT_CONFIG_PATH): PartifulConfig {
  if (configPath === DEFAULT_CONFIG_PATH) migrateLegacyConfig();
  const file = readConfigFile(configPath);

  const refreshToken =
    process.env.PARTIFUL_REFRESH_TOKEN ?? file?.refresh_token;
  const firebaseApiKey =
    process.env.PARTIFUL_FIREBASE_API_KEY ??
    file?.firebase_api_key ??
    DEFAULT_FIREBASE_API_KEY;
  const userId = process.env.PARTIFUL_USER_ID ?? file?.user_id;

  if (!refreshToken) {
    throw new Error(
      "Missing Partiful refresh token. Set PARTIFUL_REFRESH_TOKEN env var or add refresh_token to ~/.config/partiful-mcp/config.json. See README for setup instructions."
    );
  }

  return { refreshToken, firebaseApiKey, userId, configFilePath: configPath };
}
