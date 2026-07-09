import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiClient } from "./api/client.js";
import { definition as getMyEventsDef, handler as getMyEventsHandler } from "./tools/get-my-events.js";
import { definition as getEventDef, handler as getEventHandler } from "./tools/get-event.js";
import { definition as getHostedEventsDef, handler as getHostedEventsHandler } from "./tools/get-hosted-events.js";
import { definition as getMutualsDef, handler as getMutualsHandler } from "./tools/get-mutuals.js";
import { definition as getUsersDef, handler as getUsersHandler } from "./tools/get-users.js";

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

  return server;
}
