import { z } from "zod";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import type { ApiClient } from "./api/client.js";

// Constrained to z.ZodType (not z.ZodRawShape) so the schema type is threaded
// through directly rather than reconstructed as z.ZodObject<Shape>.
// Reconstructing loses whatever catchall mode (.passthrough()/.strict()) the
// actual schema instance has, which breaks for schemas with no declared
// fields (e.g. z.object({}).passthrough()).
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

export function defineTool<
  TInput extends z.ZodType,
  TOutput extends z.ZodType,
>(tool: Tool<TInput, TOutput>): Tool<TInput, TOutput> {
  return tool;
}
