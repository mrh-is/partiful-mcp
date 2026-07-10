import { describe, it, expect, beforeAll } from "vitest";
import { loadConfig } from "../config.js";
import { createApiClient, type ApiClient } from "../api/client.js";
import getMyEvents from "../tools/get-my-rsvps.js";
import getEventInfo from "../tools/get-event-info.js";
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
import getSavedEvents from "../tools/get-my-saved-events.js";
import getFollowedEvents from "../tools/get-my-followed-events.js";
import getMyPastEvents from "../tools/get-my-past-events-for-home-page.js";
import getMyUpcomingEvents from "../tools/get-my-upcoming-events-for-home-page.js";
import getMyCommunities from "../tools/get-my-communities.js";
import getCreatedCards from "../tools/get-created-cards.js";
import getCohostRequestedEvents from "../tools/get-cohost-requested-events.js";
import getPendingCohostRequest from "../tools/get-pending-cohost-request-for-event.js";
import getEventHostMessages from "../tools/get-event-displayed-host-messages.js";
import getDiscoverEventDecorators from "../tools/get-discover-event-item-decorators.js";
import getHostedEvents from "../tools/get-published-events.js";
import getInvitableContacts from "../tools/get-contacts-filtered-by-event.js";
import getEventDiscoverStatus from "../tools/get-event-discover-status.js";
import getEventTicketingEligibility from "../tools/get-event-ticketing-eligibility.js";
import getHostPromoCodes from "../tools/get-host-promo-codes.js";
import getHostTicketTypes from "../tools/get-host-ticket-types.js";
import getMutualGuests from "../tools/get-mutual-guests.js";
import getFollowers from "../tools/get-followers.js";
import getFollowing from "../tools/get-following.js";
import getTicketFeeConfig from "../tools/get-ticket-fee-config.js";
import getEventDiscoverInfo from "../tools/get-event-discover-info.js";
import getLastQuestionnaireAnswers from "../tools/get-last-questionnaire-answers.js";
import getGuestPaymentInfo from "../tools/get-guest-payment-info.js";
import getPayoutSummaryForEvent from "../tools/get-payout-summary-for-event.js";
import getTicketsForEvent from "../tools/get-tickets-for-event.js";
import getTicketsForTicketType from "../tools/get-tickets-for-ticket-type.js";
import getDiscoverCurationOptions from "../tools/get-discover-curation-options.js";

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
  // Only set when the live test account hosts at least one event — several
  // tools (promo codes, ticket types, discover status, ticketing eligibility)
  // 403 on events the account doesn't host, so those tests no-op without one
  // rather than failing on accounts that don't host anything.
  let hostedEventId: string | undefined;

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

    const { events: hostedEvents } = await getHostedEvents.handler(client, {});
    hostedEventId = hostedEvents[0]?.id;
  });

  it("get_my_rsvps", async () => {
    const data = await getMyEvents.handler(client, {});
    expectValid(getMyEvents.outputSchema, data);
  });

  it("get_event_info", async () => {
    const data = await getEventInfo.handler(client, { event_id: eventId });
    expectValid(getEventInfo.outputSchema, data);
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

  it("get_my_saved_events", async () => {
    const data = await getSavedEvents.handler(client, {});
    expectValid(getSavedEvents.outputSchema, data);
  });

  it("get_my_followed_events", async () => {
    const data = await getFollowedEvents.handler(client, {});
    expectValid(getFollowedEvents.outputSchema, data);
  });

  it("get_my_past_events_for_home_page", async () => {
    const data = await getMyPastEvents.handler(client, {});
    expectValid(getMyPastEvents.outputSchema, data);
  });

  it("get_my_upcoming_events_for_home_page", async () => {
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

  it("get_pending_cohost_request_for_event", async () => {
    const data = await getPendingCohostRequest.handler(client, { event_id: eventId });
    expectValid(getPendingCohostRequest.outputSchema, data);
  });

  it("get_event_displayed_host_messages", async () => {
    const data = await getEventHostMessages.handler(client, { event_id: eventId });
    expectValid(getEventHostMessages.outputSchema, data);
  });

  it("get_discover_event_item_decorators", async () => {
    const data = await getDiscoverEventDecorators.handler(client, {
      event_ids: [eventId],
    });
    expectValid(getDiscoverEventDecorators.outputSchema, data);
  });

  it("get_published_events", async () => {
    const data = await getHostedEvents.handler(client, {});
    expectValid(getHostedEvents.outputSchema, data);
  });

  it("get_contacts_filtered_by_event", async () => {
    const data = await getInvitableContacts.handler(client, {
      event_id: eventId,
    });
    expectValid(getInvitableContacts.outputSchema, data);
  });

  it("get_event_discover_status", async () => {
    if (!hostedEventId) {
      console.warn(
        "Skipping get_event_discover_status: live test account hosts no events."
      );
      return;
    }
    const data = await getEventDiscoverStatus.handler(client, {
      event_id: hostedEventId,
    });
    expectValid(getEventDiscoverStatus.outputSchema, data);
  });

  it("get_event_ticketing_eligibility", async () => {
    if (!hostedEventId) {
      console.warn(
        "Skipping get_event_ticketing_eligibility: live test account hosts no events."
      );
      return;
    }
    const data = await getEventTicketingEligibility.handler(client, {
      event_id: hostedEventId,
    });
    expectValid(getEventTicketingEligibility.outputSchema, data);
  });

  it("get_host_promo_codes", async () => {
    if (!hostedEventId) {
      console.warn(
        "Skipping get_host_promo_codes: live test account hosts no events."
      );
      return;
    }
    const data = await getHostPromoCodes.handler(client, {
      event_id: hostedEventId,
    });
    expectValid(getHostPromoCodes.outputSchema, data);
  });

  it("get_host_ticket_types", async () => {
    if (!hostedEventId) {
      console.warn(
        "Skipping get_host_ticket_types: live test account hosts no events."
      );
      return;
    }
    const data = await getHostTicketTypes.handler(client, {
      event_id: hostedEventId,
    });
    expectValid(getHostTicketTypes.outputSchema, data);
  });

  it("get_mutual_guests", async () => {
    const data = await getMutualGuests.handler(client, { event_id: eventId });
    expectValid(getMutualGuests.outputSchema, data);
  });

  it("get_followers", async () => {
    const data = await getFollowers.handler(client, {});
    expectValid(getFollowers.outputSchema, data);
  });

  it("get_following", async () => {
    const data = await getFollowing.handler(client, {});
    expectValid(getFollowing.outputSchema, data);
  });

  it("get_ticket_fee_config", async () => {
    const data = await getTicketFeeConfig.handler(client, { event_id: eventId });
    expectValid(getTicketFeeConfig.outputSchema, data);
  });

  it("get_event_discover_info", async () => {
    const data = await getEventDiscoverInfo.handler(client, {
      event_id: eventId,
    });
    expectValid(getEventDiscoverInfo.outputSchema, data);
  });

  it("get_last_questionnaire_answers", async () => {
    const data = await getLastQuestionnaireAnswers.handler(client, {});
    expectValid(getLastQuestionnaireAnswers.outputSchema, data);
  });

  // The remaining tools are host/ticketing-only and 403 on events the test
  // account doesn't host — same no-op pattern as get_host_promo_codes above.
  it("get_guest_payment_info", async () => {
    if (!hostedEventId) {
      console.warn(
        "Skipping get_guest_payment_info: live test account hosts no events."
      );
      return;
    }
    const data = await getGuestPaymentInfo.handler(client, {
      event_id: hostedEventId,
      purchaser_user_id: userId,
    });
    expectValid(getGuestPaymentInfo.outputSchema, data);
  });

  it("get_payout_summary_for_event", async () => {
    if (!hostedEventId) {
      console.warn(
        "Skipping get_payout_summary_for_event: live test account hosts no events."
      );
      return;
    }
    const data = await getPayoutSummaryForEvent.handler(client, {
      event_id: hostedEventId,
    });
    expectValid(getPayoutSummaryForEvent.outputSchema, data);
  });

  it("get_tickets_for_event", async () => {
    if (!hostedEventId) {
      console.warn(
        "Skipping get_tickets_for_event: live test account hosts no events."
      );
      return;
    }
    const data = await getTicketsForEvent.handler(client, {
      event_id: hostedEventId,
    });
    expectValid(getTicketsForEvent.outputSchema, data);
  });

  it("get_tickets_for_ticket_type", async () => {
    if (!hostedEventId) {
      console.warn(
        "Skipping get_tickets_for_ticket_type: live test account hosts no events."
      );
      return;
    }
    const data = await getTicketsForTicketType.handler(client, {
      event_id: hostedEventId,
      ticket_type_id: "nonexistent",
    });
    expectValid(getTicketsForTicketType.outputSchema, data);
  });

  it("get_discover_curation_options", async () => {
    if (!hostedEventId) {
      console.warn(
        "Skipping get_discover_curation_options: live test account hosts no events."
      );
      return;
    }
    const data = await getDiscoverCurationOptions.handler(client, {
      event_id: hostedEventId,
    });
    expectValid(getDiscoverCurationOptions.outputSchema, data);
  });
});
