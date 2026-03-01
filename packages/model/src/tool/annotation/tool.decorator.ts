import "reflect-metadata";
import type { z } from "zod";
import type { ToolCallResultConverter } from "../execution";
import { DefaultToolCallResultConverter } from "../execution";

type AnyZodSchema = z.ZodTypeAny;
type AnyZodObjectSchema = z.ZodObject<z.ZodRawShape>;
type MaybePromise<T> = T | Promise<T>;

type ToolMethodSignature<
  // biome-ignore lint/suspicious/noExplicitAny: Required for decorator method signature compatibility.
  T extends (...args: any[]) => any,
  P extends AnyZodObjectSchema,
  R extends AnyZodSchema,
> = T extends (input: z.infer<P>) => MaybePromise<z.infer<R>>
  ? Parameters<T> extends [z.infer<P>]
    ? T
    : never
  : never;
type ToolMethodDecoratorFor<
  P extends AnyZodObjectSchema,
  R extends AnyZodSchema,
> = <
  // biome-ignore lint/suspicious/noExplicitAny: Required for decorator method signature compatibility.
  T extends (...args: any[]) => any,
>(
  target: object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<ToolMethodSignature<T, P, R>>,
) => void;
type SchemaLessToolDecorator = <
  // biome-ignore lint/suspicious/noExplicitAny: Required for decorator method signature compatibility.
  T extends (...args: any[]) => any,
>(
  target: object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<
    T extends () => MaybePromise<void> ? T : never
  >,
) => void;
type ToolBaseMetadata = {
  name?: string;
  description?: string;
  returnDirect?: boolean;
  resultConverter?: new () => ToolCallResultConverter;
};

/**
 * Metadata stored for methods decorated with @Tool
 */
export type ToolAnnotationMetadata = ToolBaseMetadata & {
  /**
   * Zod schema used to validate tool input parameters.
   */
  parameters?: AnyZodObjectSchema;
  /**
   * Zod schema used to validate tool return value.
   */
  returns?: AnyZodSchema;
};

export interface ToolSchemaAnnotationMetadata<
  P extends AnyZodObjectSchema,
  R extends AnyZodSchema,
> extends ToolBaseMetadata {
  parameters: P;
  returns: R;
}

export interface ToolSchemaLessAnnotationMetadata extends ToolBaseMetadata {
  parameters?: never;
  returns?: never;
}

/**
 * Symbol key for storing tool metadata on methods
 */
export const TOOL_METADATA_KEY = Symbol("tool:metadata");

function isFunctionSchema(schema: AnyZodSchema): boolean {
  const def = (schema as { _zod?: { def?: { type?: unknown } } })._zod?.def;
  return def?.type === "function";
}

function isObjectSchema(schema: AnyZodSchema): boolean {
  const def = (schema as { _zod?: { def?: { type?: unknown } } })._zod?.def;
  return def?.type === "object";
}

/**
 * Marks a method as a tool in Spring AI.
 */
export function Tool<P extends AnyZodObjectSchema, R extends AnyZodSchema>(
  options: ToolSchemaAnnotationMetadata<P, R>,
): ToolMethodDecoratorFor<P, R>;
export function Tool(): SchemaLessToolDecorator;
export function Tool(
  options: ToolSchemaLessAnnotationMetadata,
): SchemaLessToolDecorator;
export function Tool(options: ToolAnnotationMetadata = {}): MethodDecorator {
  return (target: object, propertyKey: string | symbol) => {
    if (options.parameters && !isObjectSchema(options.parameters)) {
      throw new Error(
        "@Tool requires parameters to be a z.object(...) schema.",
      );
    }

    if (options.returns && isFunctionSchema(options.returns)) {
      throw new Error(
        "@Tool does not support z.function() as a return schema.",
      );
    }

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
