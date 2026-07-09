import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadConfig } from "../config.js";
import * as fs from "node:fs";

vi.mock("node:fs");

describe("loadConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.PARTIFUL_REFRESH_TOKEN;
    delete process.env.PARTIFUL_FIREBASE_API_KEY;
    delete process.env.PARTIFUL_USER_ID;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("loads from environment variables", () => {
    process.env.PARTIFUL_REFRESH_TOKEN = "env-refresh";
    process.env.PARTIFUL_FIREBASE_API_KEY = "env-key";
    process.env.PARTIFUL_USER_ID = "env-uid";

    const config = loadConfig();
    expect(config.refreshToken).toBe("env-refresh");
    expect(config.firebaseApiKey).toBe("env-key");
    expect(config.userId).toBe("env-uid");
  });

  it("falls back to config file when env vars missing", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        refresh_token: "file-refresh",
        firebase_api_key: "file-key",
        user_id: "file-uid",
      })
    );

    const config = loadConfig();
    expect(config.refreshToken).toBe("file-refresh");
    expect(config.firebaseApiKey).toBe("file-key");
    expect(config.userId).toBe("file-uid");
  });

  it("env vars take priority over config file", () => {
    process.env.PARTIFUL_REFRESH_TOKEN = "env-refresh";
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        refresh_token: "file-refresh",
        firebase_api_key: "file-key",
        user_id: "file-uid",
      })
    );

    const config = loadConfig();
    expect(config.refreshToken).toBe("env-refresh");
    expect(config.firebaseApiKey).toBe("file-key");
  });

  it("uses default firebase API key when none provided", () => {
    process.env.PARTIFUL_REFRESH_TOKEN = "env-refresh";
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const config = loadConfig();
    expect(config.firebaseApiKey).toBe("AIzaSyCky6PJ7cHRdBKk5X7gjuWERWaKWBHr4_k");
  });

  it("throws when no refresh token available", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(() => loadConfig()).toThrow("refresh token");
  });
});
