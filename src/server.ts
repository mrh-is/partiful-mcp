import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiClient } from "./api/client.js";
import { definition as getMyEventsDef, handler as getMyEventsHandler } from "./tools/get-my-events.js";
import { definition as getEventDef, handler as getEventHandler } from "./tools/get-event.js";
import { definition as getHostedEventsDef, handler as getHostedEventsHandler } from "./tools/get-hosted-events.js";
import { definition as getMutualsDef, handler as getMutualsHandler } from "./tools/get-mutuals.js";
import { definition as getUsersDef, handler as getUsersHandler } from "./tools/get-users.js";

function toolResult(data: unknown): { content: Array<{ type: "text"; text: string }> } {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

export function createServer(client: ApiClient): McpServer {
  const server = new McpServer({
    name: "partiful-mcp",
    version: "0.1.0",
  });

  server.tool(
    getMyEventsDef.name,
    getMyEventsDef.description,
    getMyEventsDef.inputSchema.shape,
    async () => toolResult(await getMyEventsHandler(client, {}))
  );

  server.tool(
    getEventDef.name,
    getEventDef.description,
    getEventDef.inputSchema.shape,
    async (args) => toolResult(await getEventHandler(client, args as { event_id: string }))
  );

  server.tool(
    getHostedEventsDef.name,
    getHostedEventsDef.description,
    getHostedEventsDef.inputSchema.shape,
    async () => toolResult(await getHostedEventsHandler(client, {}))
  );

  server.tool(
    getMutualsDef.name,
    getMutualsDef.description,
    getMutualsDef.inputSchema.shape,
    async () => toolResult(await getMutualsHandler(client, {}))
  );

  server.tool(
    getUsersDef.name,
    getUsersDef.description,
    getUsersDef.inputSchema.shape,
    async (args) => toolResult(await getUsersHandler(client, args as { user_ids: string[] }))
  );

  return server;
}
