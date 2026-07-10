import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { z } from "zod";
import type { ApiClient } from "./api/client.js";
import type { Tool } from "./define-tool.js";

// Builds the McpServer: discovers every tool module in src/tools/ (each
// exporting a Tool via defineTool()), registers each with the MCP SDK, and
// wraps each handler so thrown errors become MCP tool-call errors instead of
// crashing the process. index.ts is the only caller — it wires the resulting
// server to a stdio transport.

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

// MCP's structuredContent must be a JSON object, not an array
// (CallToolResultSchema types it as a record/loose object) — the SDK's own
// output-schema validation would already reject an array here, but as a bare
// Zod "expected object, received array" error with no indication of which
// tool or field is at fault. Partiful's API returns several endpoints as
// bare arrays, so a handler forgetting to wrap one in a named field (e.g.
// { guests: [...] }) is an easy regression; fail with a message that names
// the tool instead.
export function assertStructuredContent(
  data: unknown,
  toolName: string
): asserts data is Record<string, unknown> {
  if (Array.isArray(data)) {
    throw new Error(
      `Tool ${toolName}'s handler returned a bare array; MCP structuredContent must be a JSON object, so wrap it in a named field (e.g. { items: [...] }) before returning.`
    );
  }
}

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

const SERVER_INSTRUCTIONS = `Tool names mirror their real Partiful API route (e.g. get_published_events
calls getPublishedEvents) — the name tells you exactly what it does, with no
separate mapping to remember.

Seven tools return different event lists; pick by user intent:
- RSVPed/invited (richest data) -> get_my_rsvps
- Hosting -> get_published_events
- Coming up/this weekend -> get_my_upcoming_events_for_home_page
- Already attended -> get_my_past_events_for_home_page
- Open to join/discover -> get_discoverable_events
- Bookmarked/saved -> get_my_saved_events
- Following -> get_my_followed_events
get_my_rsvps is broadest and most detail-rich; use the others only when
phrasing matches that specific tab. get_event_info fetches a single event by
ID and works for any viewable event (not just ones the user's RSVPed to),
but unlike the list tools above, its response has no per-user RSVP/guest
status field.

get_users vs get_users_party_stats: both take user IDs. Prefer get_users
(full profile + party stats) unless you specifically want to skip profile
data, in which case use get_users_party_stats (counts only).

get_mutuals (overall mutual connections) vs get_mutual_guests (mutual
connections scoped to one event's guest list) — pick by whether the user's
question is about one event or in general. get_followers (who follows the
user) vs get_following (who the user follows) are not interchangeable.

Three discover-page tools are easy to confuse: get_event_discover_status
(is this event listed at all), get_event_discover_info (the region/sections/
tags shown once listed), and get_discover_curation_options (host-only
settings controlling how it can be listed).

Several ticketing/payment tools (get_tickets_for_event,
get_tickets_for_ticket_type, get_guest_payment_info,
get_payout_summary_for_event, get_discover_curation_options) only work for
events the current user hosts and will error for events they don't — that's
expected, not a bug, if the user isn't the host.

mark_all_notifications_for_event_as_read is the ONLY tool that mutates
state. Every other tool is a pure read. Call it only when intent is clearly
to mark notifications read — never speculatively.`;

// Every real tool module's inputSchema/outputSchema is a z.ZodType (per
// defineTool()'s widened generic signature), not narrowed to z.ZodRawShape.
type AnyTool = Tool<z.ZodType, z.ZodType>;

function isTool(value: unknown): value is AnyTool {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.name === "string" &&
    typeof candidate.description === "string" &&
    typeof candidate.inputSchema === "object" &&
    candidate.inputSchema !== null &&
    "shape" in candidate.inputSchema &&
    typeof candidate.outputSchema === "object" &&
    candidate.outputSchema !== null &&
    "shape" in candidate.outputSchema &&
    typeof candidate.annotations === "object" &&
    typeof candidate.handler === "function"
  );
}

async function discoverTools(): Promise<AnyTool[]> {
  // Every file in this directory is assumed to be a tool module and will be
  // dynamically imported below; a non-tool helper file placed in src/tools/
  // would be imported and then fail the isTool() guard at startup.
  const toolsDir = join(dirname(fileURLToPath(import.meta.url)), "tools");
  const entries = await readdir(toolsDir);
  // Match compiled output (.js, when running from dist/) as well as raw
  // TypeScript sources (.ts, excluding .d.ts) so discovery also works when
  // this module runs directly against src/ (e.g. under vitest, which
  // transforms .ts on the fly rather than reading from dist/). A given
  // toolsDir only ever contains one of these file kinds at a time.
  const files = entries.filter(
    (entry) => entry.endsWith(".js") || (entry.endsWith(".ts") && !entry.endsWith(".d.ts"))
  );

  const tools: AnyTool[] = [];
  for (const file of files) {
    const modulePath = join(toolsDir, file);
    const module = await import(pathToFileURL(modulePath).href);
    const candidate = module.default;
    if (!isTool(candidate)) {
      const hasCoreShape =
        candidate &&
        typeof candidate === "object" &&
        typeof (candidate as Record<string, unknown>).name === "string" &&
        typeof (candidate as Record<string, unknown>).description === "string" &&
        typeof (candidate as Record<string, unknown>).handler === "function";
      const message = hasCoreShape
        ? `Tool module ${file}'s default export has invalid inputSchema/outputSchema: both must be a z.object(...) (i.e. expose a "shape" property), not another ZodType such as z.array(...) or z.union(...).`
        : `Tool module ${file} does not export a valid Tool as its default export.`;
      throw new Error(message);
    }
    tools.push(candidate);
  }
  return tools;
}

// Read name/version from package.json at runtime rather than duplicating them
// here, so the two can't drift out of sync. Read (rather than a static JSON
// import) sidesteps tsconfig's rootDir constraint, since package.json lives
// outside src/.
async function readPackageInfo(): Promise<{ name: string; version: string }> {
  const packageJsonPath = join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "package.json"
  );
  const contents = await readFile(packageJsonPath, "utf-8");
  return JSON.parse(contents) as { name: string; version: string };
}

export async function createServer(client: ApiClient): Promise<McpServer> {
  const { name, version } = await readPackageInfo();
  const server = new McpServer(
    { name, version },
    { instructions: SERVER_INSTRUCTIONS }
  );

  const tools = await discoverTools();

  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        // defineTool() no longer statically guarantees ZodObject-ness after
        // the widening fix to accept any z.ZodType; every real tool still
        // provides a z.object({...}) instance at runtime (verified by the
        // isTool() guard's "shape" in ... checks above), so this cast is safe.
        inputSchema: (tool.inputSchema as z.ZodObject<z.ZodRawShape>).shape,
        outputSchema: (tool.outputSchema as z.ZodObject<z.ZodRawShape>).shape,
        annotations: tool.annotations,
      },
      async (rawArgs: unknown) => {
        try {
          const parsed = tool.inputSchema.parse(rawArgs ?? {});
          const data = await tool.handler(client, parsed);
          assertStructuredContent(data, tool.name);
          return toolResult(data);
        } catch (err) {
          return toolError(err);
        }
      }
    );
  }

  return server;
}
