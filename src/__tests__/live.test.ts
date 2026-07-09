import { describe, it, expect, beforeAll } from "vitest";
import { loadConfig } from "../config.js";
import { createApiClient, type ApiClient } from "../api/client.js";
import getMyEvents from "../tools/get-my-events.js";
import getEvent from "../tools/get-event.js";
import getGuests from "../tools/get-guests.js";
import getUsers from "../tools/get-users.js";
import getUsersPartyStats from "../tools/get-users-party-stats.js";
import getMutuals from "../tools/get-mutuals.js";
import getContacts from "../tools/get-contacts.js";
import getEventComments from "../tools/get-event-comments.js";
import getEventMedia from "../tools/get-event-media.js";
import getEventPermission from "../tools/get-event-permission.js";
import getEventRestrictions from "../tools/get-event-restrictions.js";
import getAllEventRestrictions from "../tools/get-all-event-restrictions.js";
import getDiscoverableEvents from "../tools/get-discoverable-events.js";
import getSavedEvents from "../tools/get-saved-events.js";
import getFollowedEvents from "../tools/get-followed-events.js";
import getMyPastEvents from "../tools/get-my-past-events.js";
import getMyUpcomingEvents from "../tools/get-my-upcoming-events.js";
import getMyCommunities from "../tools/get-my-communities.js";
import getCreatedCards from "../tools/get-created-cards.js";
import getCohostRequestedEvents from "../tools/get-cohost-requested-events.js";
import getPendingCohostRequest from "../tools/get-pending-cohost-request.js";
import getEventHostMessages from "../tools/get-event-host-messages.js";
import getDiscoverEventDecorators from "../tools/get-discover-event-decorators.js";

// Opt-in integration suite: exercises the real Partiful API and validates
// each tool's outputSchema against the live response shape, so schema drift
// (endpoints changing/wrapping their payloads differently than we guessed)
// gets caught here instead of surfacing as an MCP protocol error for a real
// caller. Skips entirely unless a real refresh token is available — see
// README "Getting Your Refresh Token" for how to obtain one.
const hasToken = Boolean(process.env.PARTIFUL_REFRESH_TOKEN);

function expectValid<T>(schema: { safeParse: (v: unknown) => { success: boolean; error?: unknown } }, data: T) {
  const result = schema.safeParse(data);
  expect(
    result.success,
    result.success ? "" : JSON.stringify((result.error as { issues?: unknown })?.issues ?? result.error, null, 2)
  ).toBe(true);
}

describe.runIf(hasToken)("live Partiful API", () => {
  let client: ApiClient;
  let eventId: string;
  let userId: string;

  beforeAll(async () => {
    client = createApiClient(loadConfig());
    const { events } = await getMyEvents.handler(client, {});
    if (events.length === 0) {
      throw new Error(
        "Live test account has no events in getMyRsvps — can't exercise event_id-scoped tools."
      );
    }
    eventId = events[0].id;
    userId = events[0].guest?.userId ?? events[0].ownerIds?.[0] ?? "";
  });

  it("get_my_events", async () => {
    const data = await getMyEvents.handler(client, {});
    expectValid(getMyEvents.outputSchema, data);
  });

  it("get_event", async () => {
    const data = await getEvent.handler(client, { event_id: eventId });
    expectValid(getEvent.outputSchema, data);
  });

  it("get_guests", async () => {
    const data = await getGuests.handler(client, { event_id: eventId });
    expectValid(getGuests.outputSchema, data);
  });

  it("get_users", async () => {
    const data = await getUsers.handler(client, { user_ids: [userId] });
    expectValid(getUsers.outputSchema, data);
  });

  it("get_users_party_stats", async () => {
    const data = await getUsersPartyStats.handler(client, { user_ids: [userId] });
    expectValid(getUsersPartyStats.outputSchema, data);
  });

  it("get_mutuals", async () => {
    const data = await getMutuals.handler(client, {});
    expectValid(getMutuals.outputSchema, data);
  });

  it("get_contacts", async () => {
    const data = await getContacts.handler(client, {});
    expectValid(getContacts.outputSchema, data);
  });

  it("get_event_comments", async () => {
    const data = await getEventComments.handler(client, { event_id: eventId });
    expectValid(getEventComments.outputSchema, data);
  });

  it("get_event_media", async () => {
    const data = await getEventMedia.handler(client, { event_id: eventId });
    expectValid(getEventMedia.outputSchema, data);
  });

  it("get_event_permission", async () => {
    const data = await getEventPermission.handler(client, { event_id: eventId });
    expectValid(getEventPermission.outputSchema, data);
  });

  it("get_event_restrictions", async () => {
    const data = await getEventRestrictions.handler(client, { event_id: eventId });
    expectValid(getEventRestrictions.outputSchema, data);
  });

  it("get_all_event_restrictions", async () => {
    const data = await getAllEventRestrictions.handler(client, {});
    expectValid(getAllEventRestrictions.outputSchema, data);
  });

  it("get_discoverable_events", async () => {
    const data = await getDiscoverableEvents.handler(client, {});
    expectValid(getDiscoverableEvents.outputSchema, data);
  });

  it("get_saved_events", async () => {
    const data = await getSavedEvents.handler(client, {});
    expectValid(getSavedEvents.outputSchema, data);
  });

  it("get_followed_events", async () => {
    const data = await getFollowedEvents.handler(client, {});
    expectValid(getFollowedEvents.outputSchema, data);
  });

  it("get_my_past_events", async () => {
    const data = await getMyPastEvents.handler(client, {});
    expectValid(getMyPastEvents.outputSchema, data);
  });

  it("get_my_upcoming_events", async () => {
    const data = await getMyUpcomingEvents.handler(client, {});
    expectValid(getMyUpcomingEvents.outputSchema, data);
  });

  it("get_my_communities", async () => {
    const data = await getMyCommunities.handler(client, {});
    expectValid(getMyCommunities.outputSchema, data);
  });

  it("get_created_cards", async () => {
    const data = await getCreatedCards.handler(client, {});
    expectValid(getCreatedCards.outputSchema, data);
  });

  it("get_cohost_requested_events", async () => {
    const data = await getCohostRequestedEvents.handler(client, {});
    expectValid(getCohostRequestedEvents.outputSchema, data);
  });

  it("get_pending_cohost_request", async () => {
    const data = await getPendingCohostRequest.handler(client, { event_id: eventId });
    expectValid(getPendingCohostRequest.outputSchema, data);
  });

  it("get_event_host_messages", async () => {
    const data = await getEventHostMessages.handler(client, { event_id: eventId });
    expectValid(getEventHostMessages.outputSchema, data);
  });

  it("get_discover_event_decorators", async () => {
    const data = await getDiscoverEventDecorators.handler(client, {
      event_ids: [eventId],
    });
    expectValid(getDiscoverEventDecorators.outputSchema, data);
  });
});
