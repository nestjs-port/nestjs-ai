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

type ExactToolV2MethodSignature<
  T extends (...args: any[]) => any,
  Signature extends (...args: any[]) => any,
> = T extends Signature
  ? Parameters<T> extends Parameters<Signature>
    ? T
    : never
  : never;

type ToolV2MethodWithInput<I, O> =
  | ((input: I) => MaybePromise<O>)
  | ((input: I, context: ToolContext) => MaybePromise<O>)
  | ((input: I, context?: ToolContext) => MaybePromise<O>);

type ToolV2MethodWithoutInput<O> =
  | (() => MaybePromise<O>)
  | ((context: ToolContext) => MaybePromise<O>);

type ToolV2MethodDecoratorFor<
  P extends StandardSchemaWithJsonSchema,
  R extends StandardSchemaWithJsonSchema,
> = <T extends (...args: any[]) => any>(
  target: object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<
    ExactToolV2MethodSignature<
      T,
      ToolV2MethodWithInput<StandardSchemaInput<P>, StandardSchemaOutput<R>>
    >
  >,
) => void;

type ToolV2InputOnlyDecoratorFor<P extends StandardSchemaWithJsonSchema> = <
  T extends (...args: any[]) => any,
>(
  target: object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<
    ExactToolV2MethodSignature<
      T,
      ToolV2MethodWithInput<StandardSchemaInput<P>, void>
    >
  >,
) => void;

type ToolV2ReturnsOnlyDecoratorFor<R extends StandardSchemaWithJsonSchema> = <
  T extends (...args: any[]) => any,
>(
  target: object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<
    ExactToolV2MethodSignature<
      T,
      ToolV2MethodWithoutInput<StandardSchemaOutput<R>>
    >
  >,
) => void;

type ToolV2SchemaLessDecorator = <T extends (...args: any[]) => any>(
  target: object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<
    ExactToolV2MethodSignature<T, ToolV2MethodWithoutInput<void>>
  >,
) => void;

type ToolV2BaseMetadata = {
  name?: string;
  description?: string;
  returnDirect?: boolean;
  resultConverter?: new () => ToolCallResultConverter;
};

/**
 * Metadata stored for methods decorated with @ToolV2.
 */
export type ToolV2AnnotationMetadata = ToolV2BaseMetadata & {
  /**
   * Standard Schema used to validate tool input parameters.
   */
  parameters?: StandardSchemaWithJsonSchema;
  /**
   * Standard Schema used to validate tool return value.
   */
  returns?: StandardSchemaWithJsonSchema;
};

export interface ToolV2SchemaAnnotationMetadata<
  P extends StandardSchemaWithJsonSchema,
  R extends StandardSchemaWithJsonSchema,
> extends ToolV2BaseMetadata {
  parameters: P;
  returns: R;
}

export interface ToolV2InputOnlyAnnotationMetadata<
  P extends StandardSchemaWithJsonSchema,
> extends ToolV2BaseMetadata {
  parameters: P;
  returns?: never;
}

export interface ToolV2ReturnsOnlyAnnotationMetadata<
  R extends StandardSchemaWithJsonSchema,
> extends ToolV2BaseMetadata {
  parameters?: never;
  returns: R;
}

export interface ToolV2SchemaLessAnnotationMetadata extends ToolV2BaseMetadata {
  parameters?: never;
  returns?: never;
}

/**
 * Symbol key for storing ToolV2 metadata on methods.
 */
export const TOOL_V2_METADATA_KEY = Symbol("tool:v2:metadata");

function assertJsonSchemaSupport(
  schema: StandardSchemaWithJsonSchema,
  label: string,
): void {
  const standard = schema["~standard"] as {
    jsonSchema?: { input?: (options?: { target?: string }) => unknown };
  };
  if (typeof standard?.jsonSchema?.input !== "function") {
    throw new Error(
      `@ToolV2 requires ${label} to expose ~standard.jsonSchema.input().`,
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
export function ToolV2<
  P extends StandardSchemaWithJsonSchema,
  R extends StandardSchemaWithJsonSchema,
>(
  options: ToolV2SchemaAnnotationMetadata<P, R>,
): ToolV2MethodDecoratorFor<P, R>;
export function ToolV2<P extends StandardSchemaWithJsonSchema>(
  options: ToolV2InputOnlyAnnotationMetadata<P>,
): ToolV2InputOnlyDecoratorFor<P>;
export function ToolV2<R extends StandardSchemaWithJsonSchema>(
  options: ToolV2ReturnsOnlyAnnotationMetadata<R>,
): ToolV2ReturnsOnlyDecoratorFor<R>;
export function ToolV2(): ToolV2SchemaLessDecorator;
export function ToolV2(
  options: ToolV2SchemaLessAnnotationMetadata,
): ToolV2SchemaLessDecorator;
export function ToolV2(
  options: ToolV2AnnotationMetadata = {},
): MethodDecorator {
  return (target: object, propertyKey: string | symbol) => {
    if (options.parameters) {
      assertJsonSchemaSupport(options.parameters, "parameters");
    }

    if (options.returns) {
      assertJsonSchemaSupport(options.returns, "returns");
    }

    const metadata: ToolV2AnnotationMetadata = {
      name: options?.name ?? "",
      description: options?.description ?? "",
      returnDirect: options?.returnDirect ?? false,
      resultConverter:
        options?.resultConverter ?? DefaultToolCallResultConverter,
      parameters: options?.parameters,
      returns: options?.returns,
    };

    Reflect.defineMetadata(TOOL_V2_METADATA_KEY, metadata, target, propertyKey);
  };
}
