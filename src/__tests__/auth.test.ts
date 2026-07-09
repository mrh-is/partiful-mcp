import { describe, it, expect, vi, beforeEach } from "vitest";
import { refreshAccessToken } from "../api/auth.js";

describe("refreshAccessToken", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns new tokens on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id_token: "new-access",
            refresh_token: "new-refresh",
          }),
      })
    );

    const tokens = await refreshAccessToken({
      refreshToken: "old-refresh",
      firebaseApiKey: "test-key",
    });

    expect(tokens.accessToken).toBe("new-access");
    expect(tokens.refreshToken).toBe("new-refresh");
  });

  it("sends correct request with Referer header", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id_token: "token",
          refresh_token: "refresh",
        }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await refreshAccessToken({
      refreshToken: "my-refresh",
      firebaseApiKey: "my-key",
    });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe(
      "https://securetoken.googleapis.com/v1/token?key=my-key"
    );
    expect(options.method).toBe("POST");
    expect(options.headers["Referer"]).toBe("https://partiful.com/");
    expect(options.headers["Content-Type"]).toBe(
      "application/x-www-form-urlencoded"
    );
    expect(options.body).toBe(
      "grant_type=refresh_token&refresh_token=my-refresh"
    );
  });

  it("throws on error response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            error: { message: "TOKEN_EXPIRED" },
          }),
      })
    );

    await expect(
      refreshAccessToken({
        refreshToken: "bad-refresh",
        firebaseApiKey: "key",
      })
    ).rejects.toThrow("TOKEN_EXPIRED");
  });

  it("throws on HTTP error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: () => Promise.resolve({}),
      })
    );

    await expect(
      refreshAccessToken({
        refreshToken: "bad",
        firebaseApiKey: "key",
      })
    ).rejects.toThrow("400");
  });
});
