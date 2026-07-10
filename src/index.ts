#!/usr/bin/env node
// Entry point (also the npm `bin`, see package.json): load config -> build
// the Partiful API client -> build the MCP server (auto-discovers tools from
// src/tools/, see server.ts) -> connect it to stdio. Startup fails fast and
// loudly on a config error (e.g. missing refresh token) rather than starting
// a server that would fail on every tool call.
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { createApiClient } from "./api/client.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const client = createApiClient(config);
  const server = await createServer(client);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Failed to start partiful-mcp:", error);
  process.exit(1);
});
