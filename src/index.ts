#!/usr/bin/env node
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
