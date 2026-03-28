/*
 * Copyright 2023-present the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import "reflect-metadata";
import { z } from "zod";
import type { ToolCallResultConverter } from "../execution";
import { DefaultToolCallResultConverter } from "../execution";

type AnyZodSchema = z.ZodTypeAny;
type AnyZodObjectSchema = z.ZodObject<z.ZodRawShape>;
type MaybePromise<T> = T | Promise<T>;
type ExactToolMethodSignature<
  // biome-ignore lint/suspicious/noExplicitAny: Required for decorator method signature compatibility.
  T extends (...args: any[]) => any,
  I,
  O,
> = T extends (input: I) => MaybePromise<O>
  ? Parameters<T> extends [I]
    ? [I] extends Parameters<T>
      ? T
      : never
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
  descriptor: TypedPropertyDescriptor<
    ExactToolMethodSignature<T, z.infer<P>, z.infer<R>>
  >,
) => void;

type InputOnlyToolDecoratorFor<P extends AnyZodObjectSchema> = <
  // biome-ignore lint/suspicious/noExplicitAny: Required for decorator method signature compatibility.
  T extends (...args: any[]) => any,
>(
  target: object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<
    ExactToolMethodSignature<T, z.infer<P>, void>
  >,
) => void;

type ReturnsOnlyToolDecoratorFor<R extends AnyZodSchema> = <
  // biome-ignore lint/suspicious/noExplicitAny: Required for decorator method signature compatibility.
  T extends (...args: any[]) => any,
>(
  target: object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<
    T extends () => MaybePromise<z.infer<R>> ? T : never
  >,
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

export interface ToolInputOnlyAnnotationMetadata<P extends AnyZodObjectSchema>
  extends ToolBaseMetadata {
  parameters: P;
  returns?: never;
}

export interface ToolReturnsOnlyAnnotationMetadata<R extends AnyZodSchema>
  extends ToolBaseMetadata {
  parameters?: never;
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
export function Tool<P extends AnyZodObjectSchema>(
  options: ToolInputOnlyAnnotationMetadata<P>,
): InputOnlyToolDecoratorFor<P>;
export function Tool<R extends AnyZodSchema>(
  options: ToolReturnsOnlyAnnotationMetadata<R>,
): ReturnsOnlyToolDecoratorFor<R>;
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
      returns: options?.returns ?? z.void(),
    };

    Reflect.defineMetadata(TOOL_METADATA_KEY, metadata, target, propertyKey);
  };
}
