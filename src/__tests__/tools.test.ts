import { describe, it, expect, vi } from "vitest";
import { handler as getMyEventsHandler } from "../tools/get-my-events.js";
import { handler as getEventHandler } from "../tools/get-event.js";
import { handler as getHostedEventsHandler } from "../tools/get-hosted-events.js";
import { handler as getMutualsHandler } from "../tools/get-mutuals.js";
import { handler as getUsersHandler } from "../tools/get-users.js";
import type { ApiClient } from "../api/client.js";

function mockClient(data: unknown): ApiClient {
  return {
    post: vi.fn().mockResolvedValue(data),
  };
}

describe("get-my-events", () => {
  it("calls getMyRsvps and returns events", async () => {
    const events = [{ id: "e1", title: "Party" }];
    const client = mockClient({ events });

    const result = await getMyEventsHandler(client, {});
    expect(result).toEqual({ events });
    expect(client.post).toHaveBeenCalledWith("/getMyRsvps", {});
  });
});

describe("get-event", () => {
  it("filters a specific event from getMyRsvps", async () => {
    const events = [
      { id: "e1", title: "Party" },
      { id: "e2", title: "Brunch" },
    ];
    const client = mockClient({ events });

    const result = await getEventHandler(client, { event_id: "e2" });
    expect(result).toEqual({ id: "e2", title: "Brunch" });
  });

  it("throws when event not found", async () => {
    const client = mockClient({ events: [] });
    await expect(
      getEventHandler(client, { event_id: "nope" })
    ).rejects.toThrow("not found");
  });
});

describe("get-hosted-events", () => {
  it("calls getHostedEvents and returns result", async () => {
    const data = { events: [{ id: "h1" }] };
    const client = mockClient(data);

    const result = await getHostedEventsHandler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getHostedEvents", {});
  });
});

describe("get-mutuals", () => {
  it("calls getMutuals and returns result", async () => {
    const data = { mutuals: [{ name: "Alice" }] };
    const client = mockClient(data);

    const result = await getMutualsHandler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getMutuals", {});
  });
});

describe("get-users", () => {
  it("calls getUsers with user IDs", async () => {
    const data = { users: [{ id: "u1", name: "Bob" }] };
    const client = mockClient(data);

    const result = await getUsersHandler(client, {
      user_ids: ["u1"],
    });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getUsers", {
      ids: ["u1"],
      excludePartyStats: false,
      includePartyStats: true,
    });
  });
});

import { handler as getMyUpcomingEventsHandler } from "../tools/get-my-upcoming-events.js";
import { handler as getMyPastEventsHandler } from "../tools/get-my-past-events.js";
import { handler as getDiscoverableEventsHandler } from "../tools/get-discoverable-events.js";
import { handler as getSavedEventsHandler } from "../tools/get-saved-events.js";
import { handler as getFollowedEventsHandler } from "../tools/get-followed-events.js";

describe("get-my-upcoming-events", () => {
  it("calls getMyUpcomingEventsForHomePage and returns result", async () => {
    const data = { events: [{ id: "e1" }] };
    const client = mockClient(data);

    const result = await getMyUpcomingEventsHandler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getMyUpcomingEventsForHomePage", {});
  });
});

describe("get-my-past-events", () => {
  it("calls getMyPastEventsForHomePage and returns result", async () => {
    const data = { events: [{ id: "e2" }] };
    const client = mockClient(data);

    const result = await getMyPastEventsHandler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getMyPastEventsForHomePage", {});
  });
});

describe("get-discoverable-events", () => {
  it("calls getDiscoverableEvents and returns result", async () => {
    const data = { events: [{ id: "e3" }] };
    const client = mockClient(data);

    const result = await getDiscoverableEventsHandler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getDiscoverableEvents", {});
  });
});

describe("get-saved-events", () => {
  it("calls getMySavedEvents and returns result", async () => {
    const data = { events: [{ id: "e4" }] };
    const client = mockClient(data);

    const result = await getSavedEventsHandler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getMySavedEvents", {});
  });
});

describe("get-followed-events", () => {
  it("calls getMyFollowedEvents and returns result", async () => {
    const data = { events: [{ id: "e5" }] };
    const client = mockClient(data);

    const result = await getFollowedEventsHandler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getMyFollowedEvents", {});
  });
});

import { handler as getGuestsHandler } from "../tools/get-guests.js";
import { handler as getEventCommentsHandler } from "../tools/get-event-comments.js";
import { handler as getEventMediaHandler } from "../tools/get-event-media.js";
import { handler as getEventRestrictionsHandler } from "../tools/get-event-restrictions.js";
import { handler as getEventPermissionHandler } from "../tools/get-event-permission.js";
import { handler as getEventHostMessagesHandler } from "../tools/get-event-host-messages.js";
import { handler as getEventTicketingEligibilityHandler } from "../tools/get-event-ticketing-eligibility.js";
import { handler as getPendingCohostRequestHandler } from "../tools/get-pending-cohost-request.js";

describe("get-guests", () => {
  it("calls getGuests with eventId", async () => {
    const data = { guests: [{ id: "g1" }] };
    const client = mockClient(data);

    const result = await getGuestsHandler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getGuests", { eventId: "e1" });
  });
});

describe("get-event-comments", () => {
  it("calls getEventComments with eventId", async () => {
    const data = { comments: [{ id: "c1" }] };
    const client = mockClient(data);

    const result = await getEventCommentsHandler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getEventComments", { eventId: "e1" });
  });
});

describe("get-event-media", () => {
  it("calls getEventMedia with eventId", async () => {
    const data = { media: [{ id: "m1" }] };
    const client = mockClient(data);

    const result = await getEventMediaHandler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getEventMedia", { eventId: "e1" });
  });
});

describe("get-event-restrictions", () => {
  it("calls getEventRestrictions with eventId", async () => {
    const data = { minAge: 21 };
    const client = mockClient(data);

    const result = await getEventRestrictionsHandler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getEventRestrictions", { eventId: "e1" });
  });
});

describe("get-event-permission", () => {
  it("calls getEventPermission with eventId", async () => {
    const data = { canEdit: true };
    const client = mockClient(data);

    const result = await getEventPermissionHandler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getEventPermission", { eventId: "e1" });
  });
});

describe("get-event-host-messages", () => {
  it("calls getEventDisplayedHostMessages with eventId", async () => {
    const data = { messages: [] };
    const client = mockClient(data);

    const result = await getEventHostMessagesHandler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getEventDisplayedHostMessages", { eventId: "e1" });
  });
});

describe("get-event-ticketing-eligibility", () => {
  it("calls getEventTicketingEligibility with eventId", async () => {
    const data = { eligible: false };
    const client = mockClient(data);

    const result = await getEventTicketingEligibilityHandler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getEventTicketingEligibility", { eventId: "e1" });
  });
});

describe("get-pending-cohost-request", () => {
  it("calls getPendingCohostRequestForEvent with eventId", async () => {
    const data = { request: null };
    const client = mockClient(data);

    const result = await getPendingCohostRequestHandler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getPendingCohostRequestForEvent", { eventId: "e1" });
  });
});

import { handler as getHostPromoCodesHandler } from "../tools/get-host-promo-codes.js";
import { handler as getHostTicketTypesHandler } from "../tools/get-host-ticket-types.js";
import { handler as getEventDiscoverStatusHandler } from "../tools/get-event-discover-status.js";

describe("get-host-promo-codes", () => {
  it("calls getHostPromoCodes with eventId", async () => {
    const data = { codes: [] };
    const client = mockClient(data);

    const result = await getHostPromoCodesHandler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getHostPromoCodes", { eventId: "e1" });
  });
});

describe("get-host-ticket-types", () => {
  it("calls getHostTicketTypes with eventId and includeDisabled", async () => {
    const data = { ticketTypes: [] };
    const client = mockClient(data);

    const result = await getHostTicketTypesHandler(client, {
      event_id: "e1",
      include_disabled: true,
    });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getHostTicketTypes", {
      eventId: "e1",
      includeDisabled: true,
    });
  });

  it("defaults includeDisabled to true when omitted", async () => {
    const data = { ticketTypes: [] };
    const client = mockClient(data);

    await getHostTicketTypesHandler(client, { event_id: "e1" });
    expect(client.post).toHaveBeenCalledWith("/getHostTicketTypes", {
      eventId: "e1",
      includeDisabled: true,
    });
  });
});

describe("get-event-discover-status", () => {
  it("calls getEventDiscoverStatus with eventId", async () => {
    const data = { listed: false };
    const client = mockClient(data);

    const result = await getEventDiscoverStatusHandler(client, { event_id: "e1" });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getEventDiscoverStatus", { eventId: "e1" });
  });
});

import { handler as getCohostRequestedEventsHandler } from "../tools/get-cohost-requested-events.js";
import { handler as getAllEventRestrictionsHandler } from "../tools/get-all-event-restrictions.js";
import { handler as getInvitableContactsHandler } from "../tools/get-invitable-contacts.js";

describe("get-cohost-requested-events", () => {
  it("calls getCohostRequestedEvents and returns result", async () => {
    const data = { events: [] };
    const client = mockClient(data);

    const result = await getCohostRequestedEventsHandler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getCohostRequestedEvents", {});
  });
});

describe("get-all-event-restrictions", () => {
  it("calls getAllEventRestrictions and returns result", async () => {
    const data = { restrictions: [] };
    const client = mockClient(data);

    const result = await getAllEventRestrictionsHandler(client, {});
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getAllEventRestrictions", {});
  });
});

describe("get-invitable-contacts", () => {
  it("calls getInvitableContacts with eventId, skip, and limit", async () => {
    const data = { contacts: [] };
    const client = mockClient(data);

    const result = await getInvitableContactsHandler(client, {
      event_id: "e1",
      skip: 0,
      limit: 20,
    });
    expect(result).toEqual(data);
    expect(client.post).toHaveBeenCalledWith("/getInvitableContacts", {
      eventId: "e1",
      skip: 0,
      limit: 20,
    });
  });
});
