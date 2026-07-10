import { z } from "zod";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import type { ApiClient } from "./api/client.js";

// Constrained to z.ZodType (not z.ZodRawShape) so the schema type is threaded
// through directly rather than reconstructed as z.ZodObject<Shape>.
// Reconstructing loses whatever catchall mode (.looseObject()/.strict()) the
// actual schema instance has, which breaks for schemas with no declared
// fields (e.g. z.looseObject({})).
export interface Tool<
  TInput extends z.ZodType,
  TOutput extends z.ZodType,
> {
  name: string;
  description: string;
  inputSchema: TInput;
  outputSchema: TOutput;
  annotations: ToolAnnotations;
  handler: (
    client: ApiClient,
    args: z.infer<TInput>
  ) => Promise<z.infer<TOutput>>;
}

// Every tool so far is a pure, non-destructive, idempotent read against the
// Partiful API (an external system, hence openWorldHint). Mutating tools
// (e.g. mark_all_notifications_for_event_as_read) override this via their own `annotations`.
const DEFAULT_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};

export function defineTool<
  TInput extends z.ZodType,
  TOutput extends z.ZodType,
>(
  tool: Omit<Tool<TInput, TOutput>, "annotations"> & {
    annotations?: ToolAnnotations;
  }
): Tool<TInput, TOutput> {
  return {
    ...tool,
    annotations: { ...DEFAULT_ANNOTATIONS, ...tool.annotations },
  };
}
