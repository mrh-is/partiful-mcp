import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import type { MyRsvpsData } from "../types.js";

export const definition = {
  name: "get_my_events",
  description:
    "Get all Partiful events you've been invited to or RSVPed to. Returns event details including date, title, location, RSVP status, and guest counts.",
  inputSchema: z.object({}),
};

export async function handler(
  client: ApiClient,
  _args: unknown
): Promise<MyRsvpsData> {
  return client.post<MyRsvpsData>("/getMyRsvps", {});
}
