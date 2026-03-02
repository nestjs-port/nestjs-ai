import type { z } from "zod";

/**
 * A functional interface to convert tool call results to a String that can be sent back
 * to the AI model.
 */
export interface ToolCallResultConverter {
  /**
   * Given an Object returned by a tool, convert it to a String compatible with the
   * given return type.
   */
  convert(
    result?: unknown | null,
    returnType?: z.ZodTypeAny | null,
  ): Promise<string>;
}
