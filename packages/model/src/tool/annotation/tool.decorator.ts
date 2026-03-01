import "reflect-metadata";
import type { z } from "zod";
import type { ToolCallResultConverter } from "../execution";
import { DefaultToolCallResultConverter } from "../execution";

type AnyZodSchema = z.ZodTypeAny;
type MaybePromise<T> = T | Promise<T>;
type ToolMethodArgs<T> = [T] extends [undefined]
  ? []
  : T extends readonly unknown[]
    ? [...T]
    : [input: T];

type IsSameTuple<
  A extends readonly unknown[],
  B extends readonly unknown[],
> = A extends B ? (B extends A ? true : false) : false;

type ToolMethodSignature<
  // biome-ignore lint/suspicious/noExplicitAny: Required for decorator method signature compatibility.
  T extends (...args: any[]) => any,
  P extends AnyZodSchema,
  R extends AnyZodSchema,
> = T extends (...args: ToolMethodArgs<z.infer<P>>) => MaybePromise<z.infer<R>>
  ? IsSameTuple<Parameters<T>, ToolMethodArgs<z.infer<P>>> extends true
    ? T
    : never
  : never;
type ToolMethodDecoratorFor<P extends AnyZodSchema, R extends AnyZodSchema> = <
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
  parameters?: AnyZodSchema;
  /**
   * Zod schema used to validate tool return value.
   */
  returns?: AnyZodSchema;
};

export interface ToolSchemaAnnotationMetadata<
  P extends AnyZodSchema,
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

/**
 * Marks a method as a tool in Spring AI.
 */
export function Tool<P extends AnyZodSchema, R extends AnyZodSchema>(
  options: ToolSchemaAnnotationMetadata<P, R>,
): ToolMethodDecoratorFor<P, R>;
export function Tool(): SchemaLessToolDecorator;
export function Tool(
  options: ToolSchemaLessAnnotationMetadata,
): SchemaLessToolDecorator;
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
