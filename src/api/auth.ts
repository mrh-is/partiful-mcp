import type { PartifulConfig, TokenSet, RefreshResponse } from "../types.js";

// Exchanges a long-lived Firebase refresh token for a short-lived access
// token, via Google's Secure Token Service (not a Partiful-owned endpoint —
// this is standard Firebase Auth, see docs/poc/partiful-api-notes.md for how
// it was found). The only consumer is api/client.ts's ensureToken().

const TOKEN_ENDPOINT = "https://securetoken.googleapis.com/v1/token";

function buildRefreshBody(refreshToken: string): string {
  return new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  }).toString();
}

export async function refreshAccessToken(
  config: Pick<PartifulConfig, "refreshToken" | "firebaseApiKey">
): Promise<TokenSet> {
  const url = `${TOKEN_ENDPOINT}?key=${config.firebaseApiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: "https://partiful.com/",
    },
    body: buildRefreshBody(config.refreshToken),
  });

  if (!response.ok) {
    throw new Error(
      `Token refresh failed: HTTP ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as RefreshResponse;

  if (data.error) {
    throw new Error(
      `Token refresh failed: ${data.error.message}`
    );
  }

  if (!data.id_token) {
    throw new Error("Token refresh failed: no id_token in response");
  }

  return {
    accessToken: data.id_token,
    refreshToken: data.refresh_token ?? config.refreshToken,
  };
}
