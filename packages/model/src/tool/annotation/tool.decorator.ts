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
import type {
  StandardJSONSchemaV1,
  StandardSchemaV1,
} from "@standard-schema/spec";
import type { ToolContext } from "../../chat/index.js";
import type { ToolCallResultConverter } from "../execution/index.js";
import { DefaultToolCallResultConverter } from "../execution/index.js";

type MaybePromise<T> = T | Promise<T>;
type StandardSchemaWithJsonSchema = StandardSchemaV1 & StandardJSONSchemaV1;

type StandardSchemaInput<TSchema extends StandardSchemaWithJsonSchema> =
  StandardSchemaV1.InferInput<TSchema>;
type StandardSchemaOutput<TSchema extends StandardSchemaWithJsonSchema> =
  StandardSchemaV1.InferOutput<TSchema>;

type ExactToolMethodSignature<
  T extends (...args: any[]) => any,
  Signature extends (...args: any[]) => any,
> = T extends Signature
  ? Parameters<T> extends Parameters<Signature>
    ? T
    : never
  : never;

type ToolMethodWithInput<I, O> =
  | ((input: I) => MaybePromise<O>)
  | ((input: I, context: ToolContext) => MaybePromise<O>)
  | ((input: I, context?: ToolContext) => MaybePromise<O>);

type ToolMethodWithoutInput<O> =
  | (() => MaybePromise<O>)
  | ((context: ToolContext) => MaybePromise<O>);

type ToolMethodDecoratorFor<
  P extends StandardSchemaWithJsonSchema,
  R extends StandardSchemaWithJsonSchema,
> = <T extends (...args: any[]) => any>(
  target: object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<
    ExactToolMethodSignature<
      T,
      ToolMethodWithInput<StandardSchemaInput<P>, StandardSchemaOutput<R>>
    >
  >,
) => void;

type ToolInputOnlyDecoratorFor<P extends StandardSchemaWithJsonSchema> = <
  T extends (...args: any[]) => any,
>(
  target: object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<
    ExactToolMethodSignature<
      T,
      ToolMethodWithInput<StandardSchemaInput<P>, void>
    >
  >,
) => void;

type ToolReturnsOnlyDecoratorFor<R extends StandardSchemaWithJsonSchema> = <
  T extends (...args: any[]) => any,
>(
  target: object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<
    ExactToolMethodSignature<T, ToolMethodWithoutInput<StandardSchemaOutput<R>>>
  >,
) => void;

type ToolSchemaLessDecorator = <T extends (...args: any[]) => any>(
  target: object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<
    ExactToolMethodSignature<T, ToolMethodWithoutInput<void>>
  >,
) => void;

type ToolBaseMetadata = {
  name?: string;
  description?: string;
  returnDirect?: boolean;
  resultConverter?: new () => ToolCallResultConverter;
};

/**
 * Metadata stored for methods decorated with @Tool.
 */
export type ToolAnnotationMetadata = ToolBaseMetadata & {
  /**
   * Standard Schema used to validate tool input parameters.
   */
  parameters?: StandardSchemaWithJsonSchema;
  /**
   * Standard Schema used to validate tool return value.
   */
  returns?: StandardSchemaWithJsonSchema;
};

export interface ToolSchemaAnnotationMetadata<
  P extends StandardSchemaWithJsonSchema,
  R extends StandardSchemaWithJsonSchema,
> extends ToolBaseMetadata {
  parameters: P;
  returns: R;
}

export interface ToolInputOnlyAnnotationMetadata<
  P extends StandardSchemaWithJsonSchema,
> extends ToolBaseMetadata {
  parameters: P;
  returns?: never;
}

export interface ToolReturnsOnlyAnnotationMetadata<
  R extends StandardSchemaWithJsonSchema,
> extends ToolBaseMetadata {
  parameters?: never;
  returns: R;
}

export interface ToolSchemaLessAnnotationMetadata extends ToolBaseMetadata {
  parameters?: never;
  returns?: never;
}

/**
 * Symbol key for storing tool metadata on methods.
 */
export const TOOL_METADATA_KEY = Symbol("tool:metadata");

function assertJsonSchemaSupport(
  schema: StandardSchemaWithJsonSchema,
  label: string,
): void {
  const standard = schema["~standard"] as {
    jsonSchema?: { input?: (options?: { target?: string }) => unknown };
  };
  if (typeof standard?.jsonSchema?.input !== "function") {
    throw new Error(
      `@Tool requires ${label} to expose ~standard.jsonSchema.input().`,
    );
  }
}

/**
 * Marks a method as a tool using Standard Schema instead of Zod.
 *
 * Runtime rule:
 * - if `parameters` is present, the tool receives `(input, context?)`
 * - if `parameters` is absent, the tool receives `()` or `(context)`
 */
export function Tool<
  P extends StandardSchemaWithJsonSchema,
  R extends StandardSchemaWithJsonSchema,
>(options: ToolSchemaAnnotationMetadata<P, R>): ToolMethodDecoratorFor<P, R>;
export function Tool<P extends StandardSchemaWithJsonSchema>(
  options: ToolInputOnlyAnnotationMetadata<P>,
): ToolInputOnlyDecoratorFor<P>;
export function Tool<R extends StandardSchemaWithJsonSchema>(
  options: ToolReturnsOnlyAnnotationMetadata<R>,
): ToolReturnsOnlyDecoratorFor<R>;
export function Tool(): ToolSchemaLessDecorator;
export function Tool(
  options: ToolSchemaLessAnnotationMetadata,
): ToolSchemaLessDecorator;
export function Tool(options: ToolAnnotationMetadata = {}): MethodDecorator {
  return (target: object, propertyKey: string | symbol) => {
    if (options.parameters) {
      assertJsonSchemaSupport(options.parameters, "parameters");
    }

    if (options.returns) {
      assertJsonSchemaSupport(options.returns, "returns");
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
