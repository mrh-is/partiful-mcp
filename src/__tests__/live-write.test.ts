import { describe, it, expect, beforeAll } from "vitest";
import { loadConfig } from "../config.js";
import { createApiClient, type ApiClient } from "../api/client.js";
import getMyEvents from "../tools/get-my-rsvps.js";
import markNotificationsRead from "../tools/mark-all-notifications-for-event-as-read.js";

// Live coverage for the one write tool in this server, kept out of
// src/__tests__/live.test.ts (and therefore out of the weekly CI job in
// .github/workflows/live-api-check.yml) on purpose: unlike every other tool
// here, mark_all_notifications_for_event_as_read mutates real state on the token's Partiful
// account. Running it unattended on a schedule would do that every week with
// no one watching. Run it yourself, deliberately, when you want to confirm
// this endpoint still works:
//
//   PARTIFUL_REFRESH_TOKEN=<token> PARTIFUL_LIVE_WRITE_TESTS=1 \
//     npx vitest run src/__tests__/live-write.test.ts
const hasToken = Boolean(process.env.PARTIFUL_REFRESH_TOKEN);
const optedIn = Boolean(process.env.PARTIFUL_LIVE_WRITE_TESTS);

describe.runIf(hasToken && optedIn)("live Partiful API (write)", () => {
  let client: ApiClient;
  let eventId: string;

  beforeAll(async () => {
    client = createApiClient(loadConfig());
    const { events } = await getMyEvents.handler(client, {});
    if (events.length === 0) {
      throw new Error(
        "Live test account has no events in getMyRsvps — can't exercise event_id-scoped tools."
      );
    }
    eventId = events[0].id;
  });

  it("mark_all_notifications_for_event_as_read", async () => {
    const data = await markNotificationsRead.handler(client, {
      event_id: eventId,
    });
    const result = markNotificationsRead.outputSchema.safeParse(data);
    expect(
      result.success,
      result.success ? "" : JSON.stringify((result.error as { issues?: unknown })?.issues ?? result.error, null, 2)
    ).toBe(true);
  });
});
