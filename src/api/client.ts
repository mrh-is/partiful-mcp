import type { PartifulConfig, ApiRequestBody, ApiResponse } from "../types.js";
import { refreshAccessToken } from "./auth.js";

// Thin POST-only client for Partiful's Firebase Cloud Function API (see
// docs/api-endpoints.md for the wire format). Handles token lifecycle so
// tool handlers (src/tools/*) never touch auth directly: lazily obtains an
// access token on first call, retries exactly once on 401/403 with a fresh
// token, and derives the Firebase user ID from the JWT if it wasn't
// supplied via config.

const BASE_URL = "https://api.partiful.com";

function extractUserId(jwt: string): string {
  const payload = JSON.parse(
    Buffer.from(jwt.split(".")[1], "base64url").toString()
  );
  return payload.user_id ?? payload.sub;
}

function buildRequestBody(
  params: Record<string, unknown>,
  userId: string
): string {
  const body: ApiRequestBody = {
    data: { params, userId },
  };
  return JSON.stringify(body);
}

function buildHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    Origin: "https://partiful.com",
    Referer: "https://partiful.com/",
  };
}

function isAuthError(status: number): boolean {
  return status === 401 || status === 403;
}

function unwrapResponse<T>(raw: ApiResponse<T>): T {
  return raw.result.data;
}

export interface ApiClient {
  post<T>(
    endpoint: string,
    params?: Record<string, unknown>
  ): Promise<T>;
  getUserId(): Promise<string>;
}

export function createApiClient(config: PartifulConfig): ApiClient {
  let currentConfig = { ...config };
  let accessToken: string | null = null;

  async function ensureToken(): Promise<string> {
    if (!accessToken) {
      const tokens = await refreshAccessToken(currentConfig);
      accessToken = tokens.accessToken;
      currentConfig = { ...currentConfig, refreshToken: tokens.refreshToken };
      if (!currentConfig.userId) {
        currentConfig = { ...currentConfig, userId: extractUserId(accessToken) };
      }
    }
    return accessToken;
  }

  async function doPost<T>(
    endpoint: string,
    params: Record<string, unknown>,
    isRetry: boolean
  ): Promise<T> {
    const token = await ensureToken();
    const url = `${BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      method: "POST",
      headers: buildHeaders(token),
      body: buildRequestBody(params, currentConfig.userId ?? ""),
    });

    if (!response.ok) {
      if (!isRetry && isAuthError(response.status)) {
        accessToken = null;
        const tokens = await refreshAccessToken(currentConfig);
        accessToken = tokens.accessToken;
        currentConfig = { ...currentConfig, refreshToken: tokens.refreshToken };
        return doPost<T>(endpoint, params, true);
      }
      throw new Error(
        `Partiful API error: HTTP ${response.status} ${response.statusText} on ${endpoint}`
      );
    }

    const raw = (await response.json()) as ApiResponse<T>;
    return unwrapResponse(raw);
  }

  return {
    post<T>(
      endpoint: string,
      params: Record<string, unknown> = {}
    ): Promise<T> {
      return doPost<T>(endpoint, params, false);
    },
    async getUserId(): Promise<string> {
      await ensureToken();
      return currentConfig.userId ?? "";
    },
  };
}
