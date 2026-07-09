import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z
  .object({
    contacts: z
      .array(
        z
          .object({
            id: z.string().optional(),
            name: z.string().optional(),
            phoneNumber: z.string().optional(),
          })
          .passthrough()
      )
      .optional(),
    hasMore: z.boolean().optional(),
  })
  .passthrough();

const tool = defineTool({
  name: "get_invitable_contacts",
  description:
    "Get contacts that can be invited to a specific Partiful event. Returns a page of contact objects. Paginate by starting with skip=0, then repeatedly increase skip by the number of contacts already fetched (or by limit) until a response returns fewer than `limit` contacts (or hasMore is false), indicating the last page.",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
    skip: z.number().describe("Number of contacts to skip (pagination offset)"),
    limit: z.number().describe("Maximum number of contacts to return"),
  }),
  outputSchema,
  handler: async (client: ApiClient, args) =>
    client.post<z.infer<typeof outputSchema>>("/getInvitableContacts", {
      eventId: args.event_id,
      skip: args.skip,
      limit: args.limit,
    }),
});

export default tool;
export const definition = tool;
export const handler = tool.handler;
