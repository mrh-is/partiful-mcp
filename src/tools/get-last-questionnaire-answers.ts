import { z } from "zod";
import type { ApiClient } from "../api/client.js";
import { defineTool } from "../define-tool.js";

// The real response's `shortAnswer` shape isn't fully confirmed — live testing
// only returned an empty object for this account (no questionnaire answers on
// record) — so it's left as a loose passthrough rather than a specific shape.
const outputSchema = z.looseObject({
  shortAnswer: z.looseObject({}).optional(),
});

const tool = defineTool({
  name: "get_last_questionnaire_answers",
  description:
    "Get the current user's most recent RSVP questionnaire answers, used to prefill future RSVP questionnaires.",
  inputSchema: z.object({}),
  outputSchema,
  handler: async (client: ApiClient, _args) =>
    client.post<z.infer<typeof outputSchema>>(
      "/getLastQuestionnaireAnswers",
      {}
    ),
});

export default tool;
