import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

const outputSchema = z
  .looseObject({
    contacts: z
      .array(
        z
          .looseObject({
            id: z.string().optional(),
            name: z.string().optional(),
            isPastGuest: z.boolean().nullable().optional(),
            sharedEventCount: z.number().optional(),
            isManaged: z.boolean().optional(),
          })
      )
      .optional(),
  });

const tool = defineTool({
  name: "get_contacts_filtered_by_event",
  description:
    "Get contacts that can be invited to a specific Partiful event. Returns the full list of contact objects in one call (the endpoint does not paginate).",
  inputSchema: z.object({
    event_id: z.string().describe("The Partiful event ID"),
  }),
  outputSchema,
  handler: async (client: ApiClient, args) =>
    client.post<z.infer<typeof outputSchema>>("/getContactsFilteredByEvent", {
      eventId: args.event_id,
    }),
});

export default tool;