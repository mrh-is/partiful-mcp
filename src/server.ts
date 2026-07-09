import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiClient } from "./api/client.js";
import { definition as getMyEventsDef, handler as getMyEventsHandler } from "./tools/get-my-events.js";
import { definition as getEventDef, handler as getEventHandler } from "./tools/get-event.js";
import { definition as getHostedEventsDef, handler as getHostedEventsHandler } from "./tools/get-hosted-events.js";
import { definition as getMutualsDef, handler as getMutualsHandler } from "./tools/get-mutuals.js";
import { definition as getUsersDef, handler as getUsersHandler } from "./tools/get-users.js";
import { definition as getMyUpcomingEventsDef, handler as getMyUpcomingEventsHandler } from "./tools/get-my-upcoming-events.js";
import { definition as getMyPastEventsDef, handler as getMyPastEventsHandler } from "./tools/get-my-past-events.js";
import { definition as getDiscoverableEventsDef, handler as getDiscoverableEventsHandler } from "./tools/get-discoverable-events.js";
import { definition as getSavedEventsDef, handler as getSavedEventsHandler } from "./tools/get-saved-events.js";
import { definition as getFollowedEventsDef, handler as getFollowedEventsHandler } from "./tools/get-followed-events.js";
import { definition as getGuestsDef, handler as getGuestsHandler } from "./tools/get-guests.js";
import { definition as getEventCommentsDef, handler as getEventCommentsHandler } from "./tools/get-event-comments.js";
import { definition as getEventMediaDef, handler as getEventMediaHandler } from "./tools/get-event-media.js";
import { definition as getEventRestrictionsDef, handler as getEventRestrictionsHandler } from "./tools/get-event-restrictions.js";
import { definition as getEventPermissionDef, handler as getEventPermissionHandler } from "./tools/get-event-permission.js";
import { definition as getEventHostMessagesDef, handler as getEventHostMessagesHandler } from "./tools/get-event-host-messages.js";
import { definition as getEventTicketingEligibilityDef, handler as getEventTicketingEligibilityHandler } from "./tools/get-event-ticketing-eligibility.js";
import { definition as getPendingCohostRequestDef, handler as getPendingCohostRequestHandler } from "./tools/get-pending-cohost-request.js";
import { definition as getHostPromoCodesDef, handler as getHostPromoCodesHandler } from "./tools/get-host-promo-codes.js";
import { definition as getHostTicketTypesDef, handler as getHostTicketTypesHandler } from "./tools/get-host-ticket-types.js";
import { definition as getEventDiscoverStatusDef, handler as getEventDiscoverStatusHandler } from "./tools/get-event-discover-status.js";
import { definition as getCohostRequestedEventsDef, handler as getCohostRequestedEventsHandler } from "./tools/get-cohost-requested-events.js";
import { definition as getAllEventRestrictionsDef, handler as getAllEventRestrictionsHandler } from "./tools/get-all-event-restrictions.js";
import { definition as getInvitableContactsDef, handler as getInvitableContactsHandler } from "./tools/get-invitable-contacts.js";
import { definition as getUsersPartyStatsDef, handler as getUsersPartyStatsHandler } from "./tools/get-users-party-stats.js";
import { definition as getContactsDef, handler as getContactsHandler } from "./tools/get-contacts.js";
import { definition as getMyCommunitiesDef, handler as getMyCommunitiesHandler } from "./tools/get-my-communities.js";
import { definition as getCreatedCardsDef, handler as getCreatedCardsHandler } from "./tools/get-created-cards.js";
import { definition as getDiscoverEventDecoratorsDef, handler as getDiscoverEventDecoratorsHandler } from "./tools/get-discover-event-decorators.js";
import { definition as markNotificationsReadDef, handler as markNotificationsReadHandler } from "./tools/mark-notifications-read.js";

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

function toolResult(data: unknown): ToolResult {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: data as Record<string, unknown>,
  };
}

function toolError(err: unknown): ToolResult {
  const message = err instanceof Error ? err.message : String(err);
  return {
    isError: true,
    content: [{ type: "text" as const, text: message }],
  };
}

const SERVER_INSTRUCTIONS = `Seven tools return different event lists; pick by user intent:
- RSVPed/invited (richest data) -> get_my_events
- Hosting -> get_hosted_events
- Coming up/this weekend -> get_my_upcoming_events
- Already attended -> get_my_past_events
- Open to join/discover -> get_discoverable_events
- Bookmarked/saved -> get_saved_events
- Following -> get_followed_events
get_my_events is broadest and most detail-rich; use the others only when
phrasing matches that specific tab.

get_users vs get_users_party_stats: both take user IDs. Prefer get_users
(full profile + party stats) unless you specifically want to skip profile
data, in which case use get_users_party_stats (counts only).

mark_notifications_read is the ONLY tool that mutates state. Every other
tool is a pure read. Call it only when intent is clearly to mark
notifications read — never speculatively.`;

export function createServer(client: ApiClient): McpServer {
  const server = new McpServer(
    {
      name: "partiful-mcp",
      version: "2026.7.0",
    },
    { instructions: SERVER_INSTRUCTIONS }
  );

  server.registerTool(
    getMyEventsDef.name,
    {
      description: getMyEventsDef.description,
      inputSchema: getMyEventsDef.inputSchema.shape,
      outputSchema: getMyEventsDef.outputSchema.shape,
      annotations: getMyEventsDef.annotations,
    },
    async () => {
      try { return toolResult(await getMyEventsHandler(client, {})); }
      catch (err) { return toolError(err); }
    }
  );

  server.registerTool(
    getEventDef.name,
    {
      description: getEventDef.description,
      inputSchema: getEventDef.inputSchema.shape,
      outputSchema: getEventDef.outputSchema.shape,
      annotations: getEventDef.annotations,
    },
    async (args) => {
      const parsed = getEventDef.inputSchema.parse(args);
      try { return toolResult(await getEventHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );

  server.registerTool(
    getHostedEventsDef.name,
    {
      description: getHostedEventsDef.description,
      inputSchema: getHostedEventsDef.inputSchema.shape,
      outputSchema: getHostedEventsDef.outputSchema.shape,
      annotations: getHostedEventsDef.annotations,
    },
    async () => {
      try { return toolResult(await getHostedEventsHandler(client, {})); }
      catch (err) { return toolError(err); }
    }
  );

  server.registerTool(
    getMutualsDef.name,
    {
      description: getMutualsDef.description,
      inputSchema: getMutualsDef.inputSchema.shape,
      outputSchema: getMutualsDef.outputSchema.shape,
      annotations: getMutualsDef.annotations,
    },
    async () => {
      try { return toolResult(await getMutualsHandler(client, {})); }
      catch (err) { return toolError(err); }
    }
  );

  server.registerTool(
    getUsersDef.name,
    {
      description: getUsersDef.description,
      inputSchema: getUsersDef.inputSchema.shape,
      outputSchema: getUsersDef.outputSchema.shape,
      annotations: getUsersDef.annotations,
    },
    async (args) => {
      const parsed = getUsersDef.inputSchema.parse(args);
      try { return toolResult(await getUsersHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );

  server.registerTool(
    getMyUpcomingEventsDef.name,
    {
      description: getMyUpcomingEventsDef.description,
      inputSchema: getMyUpcomingEventsDef.inputSchema.shape,
      outputSchema: getMyUpcomingEventsDef.outputSchema.shape,
      annotations: getMyUpcomingEventsDef.annotations,
    },
    async () => {
      try { return toolResult(await getMyUpcomingEventsHandler(client, {})); }
      catch (err) { return toolError(err); }
    }
  );

  server.registerTool(
    getMyPastEventsDef.name,
    {
      description: getMyPastEventsDef.description,
      inputSchema: getMyPastEventsDef.inputSchema.shape,
      outputSchema: getMyPastEventsDef.outputSchema.shape,
      annotations: getMyPastEventsDef.annotations,
    },
    async () => {
      try { return toolResult(await getMyPastEventsHandler(client, {})); }
      catch (err) { return toolError(err); }
    }
  );

  server.registerTool(
    getDiscoverableEventsDef.name,
    {
      description: getDiscoverableEventsDef.description,
      inputSchema: getDiscoverableEventsDef.inputSchema.shape,
      outputSchema: getDiscoverableEventsDef.outputSchema.shape,
      annotations: getDiscoverableEventsDef.annotations,
    },
    async () => {
      try { return toolResult(await getDiscoverableEventsHandler(client, {})); }
      catch (err) { return toolError(err); }
    }
  );

  server.registerTool(
    getSavedEventsDef.name,
    {
      description: getSavedEventsDef.description,
      inputSchema: getSavedEventsDef.inputSchema.shape,
      outputSchema: getSavedEventsDef.outputSchema.shape,
      annotations: getSavedEventsDef.annotations,
    },
    async () => {
      try { return toolResult(await getSavedEventsHandler(client, {})); }
      catch (err) { return toolError(err); }
    }
  );

  server.registerTool(
    getFollowedEventsDef.name,
    {
      description: getFollowedEventsDef.description,
      inputSchema: getFollowedEventsDef.inputSchema.shape,
      outputSchema: getFollowedEventsDef.outputSchema.shape,
      annotations: getFollowedEventsDef.annotations,
    },
    async () => {
      try { return toolResult(await getFollowedEventsHandler(client, {})); }
      catch (err) { return toolError(err); }
    }
  );

  server.registerTool(
    getGuestsDef.name,
    {
      description: getGuestsDef.description,
      inputSchema: getGuestsDef.inputSchema.shape,
      outputSchema: getGuestsDef.outputSchema.shape,
      annotations: getGuestsDef.annotations,
    },
    async (args) => {
      const parsed = getGuestsDef.inputSchema.parse(args);
      try { return toolResult(await getGuestsHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );

  server.registerTool(
    getEventCommentsDef.name,
    {
      description: getEventCommentsDef.description,
      inputSchema: getEventCommentsDef.inputSchema.shape,
      outputSchema: getEventCommentsDef.outputSchema.shape,
      annotations: getEventCommentsDef.annotations,
    },
    async (args) => {
      const parsed = getEventCommentsDef.inputSchema.parse(args);
      try { return toolResult(await getEventCommentsHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );

  server.registerTool(
    getEventMediaDef.name,
    {
      description: getEventMediaDef.description,
      inputSchema: getEventMediaDef.inputSchema.shape,
      outputSchema: getEventMediaDef.outputSchema.shape,
      annotations: getEventMediaDef.annotations,
    },
    async (args) => {
      const parsed = getEventMediaDef.inputSchema.parse(args);
      try { return toolResult(await getEventMediaHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );

  server.registerTool(
    getEventRestrictionsDef.name,
    {
      description: getEventRestrictionsDef.description,
      inputSchema: getEventRestrictionsDef.inputSchema.shape,
      outputSchema: getEventRestrictionsDef.outputSchema.shape,
      annotations: getEventRestrictionsDef.annotations,
    },
    async (args) => {
      const parsed = getEventRestrictionsDef.inputSchema.parse(args);
      try { return toolResult(await getEventRestrictionsHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );

  server.registerTool(
    getEventPermissionDef.name,
    {
      description: getEventPermissionDef.description,
      inputSchema: getEventPermissionDef.inputSchema.shape,
      outputSchema: getEventPermissionDef.outputSchema.shape,
      annotations: getEventPermissionDef.annotations,
    },
    async (args) => {
      const parsed = getEventPermissionDef.inputSchema.parse(args);
      try { return toolResult(await getEventPermissionHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );

  server.registerTool(
    getEventHostMessagesDef.name,
    {
      description: getEventHostMessagesDef.description,
      inputSchema: getEventHostMessagesDef.inputSchema.shape,
      outputSchema: getEventHostMessagesDef.outputSchema.shape,
      annotations: getEventHostMessagesDef.annotations,
    },
    async (args) => {
      const parsed = getEventHostMessagesDef.inputSchema.parse(args);
      try { return toolResult(await getEventHostMessagesHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );

  server.registerTool(
    getEventTicketingEligibilityDef.name,
    {
      description: getEventTicketingEligibilityDef.description,
      inputSchema: getEventTicketingEligibilityDef.inputSchema.shape,
      outputSchema: getEventTicketingEligibilityDef.outputSchema.shape,
      annotations: getEventTicketingEligibilityDef.annotations,
    },
    async (args) => {
      const parsed = getEventTicketingEligibilityDef.inputSchema.parse(args);
      try { return toolResult(await getEventTicketingEligibilityHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );

  server.registerTool(
    getPendingCohostRequestDef.name,
    {
      description: getPendingCohostRequestDef.description,
      inputSchema: getPendingCohostRequestDef.inputSchema.shape,
      outputSchema: getPendingCohostRequestDef.outputSchema.shape,
      annotations: getPendingCohostRequestDef.annotations,
    },
    async (args) => {
      const parsed = getPendingCohostRequestDef.inputSchema.parse(args);
      try { return toolResult(await getPendingCohostRequestHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );

  server.registerTool(
    getHostPromoCodesDef.name,
    {
      description: getHostPromoCodesDef.description,
      inputSchema: getHostPromoCodesDef.inputSchema.shape,
      outputSchema: getHostPromoCodesDef.outputSchema.shape,
      annotations: getHostPromoCodesDef.annotations,
    },
    async (args) => {
      const parsed = getHostPromoCodesDef.inputSchema.parse(args);
      try { return toolResult(await getHostPromoCodesHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );

  server.registerTool(
    getHostTicketTypesDef.name,
    {
      description: getHostTicketTypesDef.description,
      inputSchema: getHostTicketTypesDef.inputSchema.shape,
      outputSchema: getHostTicketTypesDef.outputSchema.shape,
      annotations: getHostTicketTypesDef.annotations,
    },
    async (args) => {
      const parsed = getHostTicketTypesDef.inputSchema.parse(args);
      try { return toolResult(await getHostTicketTypesHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );

  server.registerTool(
    getEventDiscoverStatusDef.name,
    {
      description: getEventDiscoverStatusDef.description,
      inputSchema: getEventDiscoverStatusDef.inputSchema.shape,
      outputSchema: getEventDiscoverStatusDef.outputSchema.shape,
      annotations: getEventDiscoverStatusDef.annotations,
    },
    async (args) => {
      const parsed = getEventDiscoverStatusDef.inputSchema.parse(args);
      try { return toolResult(await getEventDiscoverStatusHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );

  server.registerTool(
    getCohostRequestedEventsDef.name,
    {
      description: getCohostRequestedEventsDef.description,
      inputSchema: getCohostRequestedEventsDef.inputSchema.shape,
      outputSchema: getCohostRequestedEventsDef.outputSchema.shape,
      annotations: getCohostRequestedEventsDef.annotations,
    },
    async () => {
      try { return toolResult(await getCohostRequestedEventsHandler(client, {})); }
      catch (err) { return toolError(err); }
    }
  );

  server.registerTool(
    getAllEventRestrictionsDef.name,
    {
      description: getAllEventRestrictionsDef.description,
      inputSchema: getAllEventRestrictionsDef.inputSchema.shape,
      outputSchema: getAllEventRestrictionsDef.outputSchema.shape,
      annotations: getAllEventRestrictionsDef.annotations,
    },
    async () => {
      try { return toolResult(await getAllEventRestrictionsHandler(client, {})); }
      catch (err) { return toolError(err); }
    }
  );

  server.registerTool(
    getInvitableContactsDef.name,
    {
      description: getInvitableContactsDef.description,
      inputSchema: getInvitableContactsDef.inputSchema.shape,
      outputSchema: getInvitableContactsDef.outputSchema.shape,
      annotations: getInvitableContactsDef.annotations,
    },
    async (args) => {
      const parsed = getInvitableContactsDef.inputSchema.parse(args);
      try { return toolResult(await getInvitableContactsHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );

  server.registerTool(
    getUsersPartyStatsDef.name,
    {
      description: getUsersPartyStatsDef.description,
      inputSchema: getUsersPartyStatsDef.inputSchema.shape,
      outputSchema: getUsersPartyStatsDef.outputSchema.shape,
      annotations: getUsersPartyStatsDef.annotations,
    },
    async (args) => {
      const parsed = getUsersPartyStatsDef.inputSchema.parse(args);
      try { return toolResult(await getUsersPartyStatsHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );

  server.registerTool(
    getContactsDef.name,
    {
      description: getContactsDef.description,
      inputSchema: getContactsDef.inputSchema.shape,
      outputSchema: getContactsDef.outputSchema.shape,
      annotations: getContactsDef.annotations,
    },
    async () => {
      try { return toolResult(await getContactsHandler(client, {})); }
      catch (err) { return toolError(err); }
    }
  );

  server.registerTool(
    getMyCommunitiesDef.name,
    {
      description: getMyCommunitiesDef.description,
      inputSchema: getMyCommunitiesDef.inputSchema.shape,
      outputSchema: getMyCommunitiesDef.outputSchema.shape,
      annotations: getMyCommunitiesDef.annotations,
    },
    async () => {
      try { return toolResult(await getMyCommunitiesHandler(client, {})); }
      catch (err) { return toolError(err); }
    }
  );

  server.registerTool(
    getCreatedCardsDef.name,
    {
      description: getCreatedCardsDef.description,
      inputSchema: getCreatedCardsDef.inputSchema.shape,
      outputSchema: getCreatedCardsDef.outputSchema.shape,
      annotations: getCreatedCardsDef.annotations,
    },
    async () => {
      try { return toolResult(await getCreatedCardsHandler(client, {})); }
      catch (err) { return toolError(err); }
    }
  );

  server.registerTool(
    getDiscoverEventDecoratorsDef.name,
    {
      description: getDiscoverEventDecoratorsDef.description,
      inputSchema: getDiscoverEventDecoratorsDef.inputSchema.shape,
      outputSchema: getDiscoverEventDecoratorsDef.outputSchema.shape,
      annotations: getDiscoverEventDecoratorsDef.annotations,
    },
    async (args) => {
      const parsed = getDiscoverEventDecoratorsDef.inputSchema.parse(args);
      try { return toolResult(await getDiscoverEventDecoratorsHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );

  server.registerTool(
    markNotificationsReadDef.name,
    {
      description: markNotificationsReadDef.description,
      inputSchema: markNotificationsReadDef.inputSchema.shape,
      outputSchema: markNotificationsReadDef.outputSchema.shape,
      annotations: markNotificationsReadDef.annotations,
    },
    async (args) => {
      const parsed = markNotificationsReadDef.inputSchema.parse(args);
      try { return toolResult(await markNotificationsReadHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );

  return server;
}
