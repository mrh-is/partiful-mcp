// Shared shapes for the auth/transport layer (src/api/*) — envelope types
// mirroring Partiful's actual wire format, not app-domain types. Per-domain
// response shapes (events, users, guests, ...) live in src/schemas.ts as Zod
// schemas instead, since those need runtime validation against live data.

export interface PartifulConfig {
  refreshToken: string;
  firebaseApiKey: string;
  userId?: string;
  configFilePath?: string;
}

export interface TokenSet {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResponse {
  id_token?: string;
  refresh_token?: string;
  error?: {
    message: string;
  };
}

// Every Partiful Cloud Function call is wrapped in this envelope on the way
// out (see docs/api-endpoints.md) — {data: {params, userId}}, not the params
// object directly.
export interface ApiRequestBody {
  data: {
    params: Record<string, unknown>;
    userId: string;
  };
}

// ...and unwrapped from this envelope on the way back: {result: {data: T}}.
// See api/client.ts's unwrapResponse().
export interface ApiResponse<T> {
  result: {
    data: T;
  };
}

// Observed values of guest.status / guestStatusCounts keys (see schemas.ts).
// Not exhaustive by construction — Partiful may add new statuses — but every
// value seen in live testing as of the dates in docs/api-endpoints.md.

export type RsvpStatus =
  | "GOING"
  | "MAYBE"
  | "DECLINED"
  | "SENT"
  | "INTERESTED"
  | "WAITLIST"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "WITHDRAWN"
  | "READY_TO_SEND"
  | "SENDING"
  | "SEND_ERROR"
  | "DELIVERY_ERROR"
  | "RESPONDED_TO_FIND_A_TIME"
  | "WAITLISTED_FOR_APPROVAL"
  | "REJECTED";
