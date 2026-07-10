import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApiClient } from "../api/client.js";

vi.mock("../api/auth.js", () => ({
  refreshAccessToken: vi.fn().mockResolvedValue({
    accessToken: "refreshed-token",
    refreshToken: "new-refresh",
  }),
}));

describe("createApiClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends POST with correct envelope and headers", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          result: { data: { events: [] } },
        }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = createApiClient({
      refreshToken: "rt",
      firebaseApiKey: "key",
      userId: "uid-123",
    });
    await client.post("/getMyRsvps", {});

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.partiful.com/getMyRsvps");
    expect(options.method).toBe("POST");
    expect(options.headers["Authorization"]).toBe("Bearer refreshed-token");
    expect(options.headers["Origin"]).toBe("https://partiful.com");
    expect(options.headers["Referer"]).toBe("https://partiful.com/");

    const body = JSON.parse(options.body);
    expect(body.data.userId).toBe("uid-123");
    expect(body.data.params).toEqual({});
  });

  it("unwraps response from result.data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            result: { data: { events: [{ id: "e1" }] } },
          }),
      })
    );

    const client = createApiClient({
      refreshToken: "rt",
      firebaseApiKey: "key",
      userId: "uid",
    });
    const data = await client.post<{ events: Array<{ id: string }> }>(
      "/getMyRsvps"
    );
    expect(data.events).toEqual([{ id: "e1" }]);
  });

  it("retries once on 401 then succeeds", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: () => Promise.resolve({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            result: { data: { ok: true } },
          }),
      });
    vi.stubGlobal("fetch", mockFetch);

    const client = createApiClient({
      refreshToken: "rt",
      firebaseApiKey: "key",
      userId: "uid",
    });
    const data = await client.post<{ ok: boolean }>("/test");
    expect(data.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("does not retry more than once on 401", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = createApiClient({
      refreshToken: "rt",
      firebaseApiKey: "key",
      userId: "uid",
    });
    await expect(client.post("/test")).rejects.toThrow();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("extracts userId from JWT when not provided in config", async () => {
    const payload = Buffer.from(
      JSON.stringify({ user_id: "jwt-uid", sub: "jwt-uid" })
    ).toString("base64url");
    const fakeJwt = `header.${payload}.signature`;

    const { refreshAccessToken } = await import("../api/auth.js");
    vi.mocked(refreshAccessToken).mockResolvedValue({
      accessToken: fakeJwt,
      refreshToken: "new-refresh",
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ result: { data: {} } }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = createApiClient({
      refreshToken: "rt",
      firebaseApiKey: "key",
    });
    await client.post("/test");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.data.userId).toBe("jwt-uid");
  });

  it("getUserId returns the configured userId without a network call", async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    const client = createApiClient({
      refreshToken: "rt",
      firebaseApiKey: "key",
      userId: "uid-123",
    });
    await expect(client.getUserId()).resolves.toBe("uid-123");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("getUserId refreshes the token and extracts userId from the JWT when not configured", async () => {
    const payload = Buffer.from(
      JSON.stringify({ user_id: "jwt-uid", sub: "jwt-uid" })
    ).toString("base64url");
    const fakeJwt = `header.${payload}.signature`;

    const { refreshAccessToken } = await import("../api/auth.js");
    vi.mocked(refreshAccessToken).mockResolvedValue({
      accessToken: fakeJwt,
      refreshToken: "new-refresh",
    });

    const client = createApiClient({
      refreshToken: "rt",
      firebaseApiKey: "key",
    });
    await expect(client.getUserId()).resolves.toBe("jwt-uid");
  });

  it("throws on non-auth HTTP errors without retrying", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = createApiClient({
      refreshToken: "rt",
      firebaseApiKey: "key",
      userId: "uid",
    });
    await expect(client.post("/test")).rejects.toThrow("500");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
