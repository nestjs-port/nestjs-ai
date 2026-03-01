import "reflect-metadata";
import type { z } from "zod";
import type { ToolCallResultConverter } from "../execution";
import { DefaultToolCallResultConverter } from "../execution";

type MaybePromise<T> = T | Promise<T>;
type ToolMethodArgsFromSchema<P extends z.ZodTypeAny> = [z.infer<P>] extends [
  undefined,
]
  ? []
  : z.infer<P> extends readonly unknown[]
    ? [...z.infer<P>]
    : [input: z.infer<P>];
type TypedToolMethodDecorator<
  P extends z.ZodTypeAny,
  R extends z.ZodTypeAny,
> = <
  T extends (...args: ToolMethodArgsFromSchema<P>) => MaybePromise<z.infer<R>>,
>(
  target: object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<T>,
) => void;
type SchemaLessToolMethodDecorator = <T extends () => MaybePromise<void>>(
  target: object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<T>,
) => void;

/**
 * Metadata stored for methods decorated with @Tool
 */
export interface ToolAnnotationMetadata {
  /**
   * The name of the tool. If not provided, the method name will be used.
   *
   * For maximum compatibility across different LLMs, it is recommended to use only
   * alphanumeric characters, underscores, hyphens, and dots in tool names. Using spaces
   * or special characters may cause issues with some LLMs (e.g., OpenAI).
   *
   * Examples of recommended names: "get_weather", "search-docs", "tool.v1"
   *
   * Examples of names that may cause compatibility issues: "get weather" (contains
   * space), "tool()" (contains parentheses)
   */
  name?: string;
  /**
   * The description of the tool. If not provided, the method name will be used.
   */
  description?: string;
  /**
   * Whether the tool result should be returned directly or passed back to the model.
   */
  returnDirect?: boolean;
  /**
   * The class to use to convert the tool call result to a String.
   */
  resultConverter?: new () => ToolCallResultConverter;
  /**
   * Zod schema used to validate tool input parameters.
   */
  parameters?: z.ZodTypeAny;
  /**
   * Zod schema used to validate tool return value.
   */
  returns?: z.ZodTypeAny;
}

export interface ToolSchemaAnnotationMetadata<
  P extends z.ZodTypeAny,
  R extends z.ZodTypeAny,
> extends Omit<ToolAnnotationMetadata, "parameters" | "returns"> {
  parameters: P;
  returns: R;
}

export interface ToolSchemaLessAnnotationMetadata
  extends Omit<ToolAnnotationMetadata, "parameters" | "returns"> {
  parameters?: never;
  returns?: never;
}

/**
 * Symbol key for storing tool metadata on methods
 */
export const TOOL_METADATA_KEY = Symbol("tool:metadata");

/**
 * Marks a method as a tool in Spring AI.
 */
export function Tool<P extends z.ZodTypeAny, R extends z.ZodTypeAny>(
  options: ToolSchemaAnnotationMetadata<P, R>,
): TypedToolMethodDecorator<P, R>;
export function Tool(): SchemaLessToolMethodDecorator;
export function Tool(
  options: ToolSchemaLessAnnotationMetadata,
): SchemaLessToolMethodDecorator;
export function Tool(options: ToolAnnotationMetadata = {}): MethodDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const metadata: ToolAnnotationMetadata = {
      name: options?.name ?? "",
      description: options?.description ?? "",
      returnDirect: options?.returnDirect ?? false,
      resultConverter:
        options?.resultConverter ?? DefaultToolCallResultConverter,
      parameters: options?.parameters,
      returns: options?.returns,
    };

    Reflect.defineMetadata(TOOL_METADATA_KEY, metadata, target, propertyKey);
  };
}
