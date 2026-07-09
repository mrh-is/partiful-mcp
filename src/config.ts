import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { PartifulConfig } from "./types.js";

const DEFAULT_FIREBASE_API_KEY = "AIzaSyCky6PJ7cHRdBKk5X7gjuWERWaKWBHr4_k";
const DEFAULT_CONFIG_PATH = join(homedir(), ".partiful-config.json");

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

export function loadConfig(configPath = DEFAULT_CONFIG_PATH): PartifulConfig {
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
      "Missing Partiful refresh token. Set PARTIFUL_REFRESH_TOKEN env var or add refresh_token to ~/.partiful-config.json. See README for setup instructions."
    );
  }

  return { refreshToken, firebaseApiKey, userId, configFilePath: configPath };
}
