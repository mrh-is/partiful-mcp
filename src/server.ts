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

type ToolResult = { content: Array<{ type: "text"; text: string }>; isError?: boolean };

function toolResult(data: unknown): ToolResult {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function toolError(err: unknown): ToolResult {
  const message = err instanceof Error ? err.message : String(err);
  return {
    isError: true,
    content: [{ type: "text" as const, text: message }],
  };
}

export function createServer(client: ApiClient): McpServer {
  const server = new McpServer({
    name: "partiful-mcp",
    version: "2026.7.0",
  });

  server.tool(
    getMyEventsDef.name,
    getMyEventsDef.description,
    getMyEventsDef.inputSchema.shape,
    async () => {
      try { return toolResult(await getMyEventsHandler(client, {})); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getEventDef.name,
    getEventDef.description,
    getEventDef.inputSchema.shape,
    async (args) => {
      const parsed = getEventDef.inputSchema.parse(args);
      try { return toolResult(await getEventHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getHostedEventsDef.name,
    getHostedEventsDef.description,
    getHostedEventsDef.inputSchema.shape,
    async () => {
      try { return toolResult(await getHostedEventsHandler(client, {})); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getMutualsDef.name,
    getMutualsDef.description,
    getMutualsDef.inputSchema.shape,
    async () => {
      try { return toolResult(await getMutualsHandler(client, {})); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getUsersDef.name,
    getUsersDef.description,
    getUsersDef.inputSchema.shape,
    async (args) => {
      const parsed = getUsersDef.inputSchema.parse(args);
      try { return toolResult(await getUsersHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getMyUpcomingEventsDef.name,
    getMyUpcomingEventsDef.description,
    getMyUpcomingEventsDef.inputSchema.shape,
    async () => {
      try { return toolResult(await getMyUpcomingEventsHandler(client, {})); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getMyPastEventsDef.name,
    getMyPastEventsDef.description,
    getMyPastEventsDef.inputSchema.shape,
    async () => {
      try { return toolResult(await getMyPastEventsHandler(client, {})); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getDiscoverableEventsDef.name,
    getDiscoverableEventsDef.description,
    getDiscoverableEventsDef.inputSchema.shape,
    async () => {
      try { return toolResult(await getDiscoverableEventsHandler(client, {})); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getSavedEventsDef.name,
    getSavedEventsDef.description,
    getSavedEventsDef.inputSchema.shape,
    async () => {
      try { return toolResult(await getSavedEventsHandler(client, {})); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getFollowedEventsDef.name,
    getFollowedEventsDef.description,
    getFollowedEventsDef.inputSchema.shape,
    async () => {
      try { return toolResult(await getFollowedEventsHandler(client, {})); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getGuestsDef.name,
    getGuestsDef.description,
    getGuestsDef.inputSchema.shape,
    async (args) => {
      const parsed = getGuestsDef.inputSchema.parse(args);
      try { return toolResult(await getGuestsHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getEventCommentsDef.name,
    getEventCommentsDef.description,
    getEventCommentsDef.inputSchema.shape,
    async (args) => {
      const parsed = getEventCommentsDef.inputSchema.parse(args);
      try { return toolResult(await getEventCommentsHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getEventMediaDef.name,
    getEventMediaDef.description,
    getEventMediaDef.inputSchema.shape,
    async (args) => {
      const parsed = getEventMediaDef.inputSchema.parse(args);
      try { return toolResult(await getEventMediaHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getEventRestrictionsDef.name,
    getEventRestrictionsDef.description,
    getEventRestrictionsDef.inputSchema.shape,
    async (args) => {
      const parsed = getEventRestrictionsDef.inputSchema.parse(args);
      try { return toolResult(await getEventRestrictionsHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getEventPermissionDef.name,
    getEventPermissionDef.description,
    getEventPermissionDef.inputSchema.shape,
    async (args) => {
      const parsed = getEventPermissionDef.inputSchema.parse(args);
      try { return toolResult(await getEventPermissionHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getEventHostMessagesDef.name,
    getEventHostMessagesDef.description,
    getEventHostMessagesDef.inputSchema.shape,
    async (args) => {
      const parsed = getEventHostMessagesDef.inputSchema.parse(args);
      try { return toolResult(await getEventHostMessagesHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getEventTicketingEligibilityDef.name,
    getEventTicketingEligibilityDef.description,
    getEventTicketingEligibilityDef.inputSchema.shape,
    async (args) => {
      const parsed = getEventTicketingEligibilityDef.inputSchema.parse(args);
      try { return toolResult(await getEventTicketingEligibilityHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getPendingCohostRequestDef.name,
    getPendingCohostRequestDef.description,
    getPendingCohostRequestDef.inputSchema.shape,
    async (args) => {
      const parsed = getPendingCohostRequestDef.inputSchema.parse(args);
      try { return toolResult(await getPendingCohostRequestHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getHostPromoCodesDef.name,
    getHostPromoCodesDef.description,
    getHostPromoCodesDef.inputSchema.shape,
    async (args) => {
      const parsed = getHostPromoCodesDef.inputSchema.parse(args);
      try { return toolResult(await getHostPromoCodesHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getHostTicketTypesDef.name,
    getHostTicketTypesDef.description,
    getHostTicketTypesDef.inputSchema.shape,
    async (args) => {
      const parsed = getHostTicketTypesDef.inputSchema.parse(args);
      try { return toolResult(await getHostTicketTypesHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getEventDiscoverStatusDef.name,
    getEventDiscoverStatusDef.description,
    getEventDiscoverStatusDef.inputSchema.shape,
    async (args) => {
      const parsed = getEventDiscoverStatusDef.inputSchema.parse(args);
      try { return toolResult(await getEventDiscoverStatusHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getCohostRequestedEventsDef.name,
    getCohostRequestedEventsDef.description,
    getCohostRequestedEventsDef.inputSchema.shape,
    async () => {
      try { return toolResult(await getCohostRequestedEventsHandler(client, {})); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getAllEventRestrictionsDef.name,
    getAllEventRestrictionsDef.description,
    getAllEventRestrictionsDef.inputSchema.shape,
    async () => {
      try { return toolResult(await getAllEventRestrictionsHandler(client, {})); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getInvitableContactsDef.name,
    getInvitableContactsDef.description,
    getInvitableContactsDef.inputSchema.shape,
    async (args) => {
      const parsed = getInvitableContactsDef.inputSchema.parse(args);
      try { return toolResult(await getInvitableContactsHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getUsersPartyStatsDef.name,
    getUsersPartyStatsDef.description,
    getUsersPartyStatsDef.inputSchema.shape,
    async (args) => {
      const parsed = getUsersPartyStatsDef.inputSchema.parse(args);
      try { return toolResult(await getUsersPartyStatsHandler(client, parsed)); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getContactsDef.name,
    getContactsDef.description,
    getContactsDef.inputSchema.shape,
    async () => {
      try { return toolResult(await getContactsHandler(client, {})); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getMyCommunitiesDef.name,
    getMyCommunitiesDef.description,
    getMyCommunitiesDef.inputSchema.shape,
    async () => {
      try { return toolResult(await getMyCommunitiesHandler(client, {})); }
      catch (err) { return toolError(err); }
    }
  );

  server.tool(
    getCreatedCardsDef.name,
    getCreatedCardsDef.description,
    getCreatedCardsDef.inputSchema.shape,
    async () => {
      try { return toolResult(await getCreatedCardsHandler(client, {})); }
      catch (err) { return toolError(err); }
    }
  );

  return server;
}
