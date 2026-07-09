import { z } from "zod";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import type { ApiClient } from "./api/client.js";

export interface Tool<
  TInput extends z.ZodRawShape,
  TOutput extends z.ZodRawShape,
> {
  name: string;
  description: string;
  inputSchema: z.ZodObject<TInput>;
  outputSchema: z.ZodObject<TOutput>;
  annotations: ToolAnnotations;
  handler: (
    client: ApiClient,
    args: z.infer<z.ZodObject<TInput>>
  ) => Promise<z.infer<z.ZodObject<TOutput>>>;
}

export function defineTool<
  TInput extends z.ZodRawShape,
  TOutput extends z.ZodRawShape,
>(tool: Tool<TInput, TOutput>): Tool<TInput, TOutput> {
  return tool;
}
