import type {
  StandardJSONSchemaV1,
  StandardSchemaV1,
} from "@standard-schema/spec";

type StandardSchemaWithJsonSchema = StandardSchemaV1 & StandardJSONSchemaV1;

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
    returnType?: StandardSchemaWithJsonSchema | null,
  ): Promise<string>;
}
