import { z } from "zod";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import type { ApiClient } from "./api/client.js";

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
