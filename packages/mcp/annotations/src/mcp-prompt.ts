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
  GetPromptRequest,
  GetPromptResult,
  Prompt,
  PromptMessage,
} from "@modelcontextprotocol/server";
import type {
  StandardJSONSchemaV1,
  StandardSchemaV1,
} from "@standard-schema/spec";
import { DefaultMetaProvider } from "./context/index.js";
import type {
  McpServerExchange,
  McpTransportContext,
} from "./context/index.js";
import type { MetaProvider } from "./context/index.js";
import type { McpMeta } from "./mcp-meta.js";
import { MCP_PROMPT_METADATA_KEY } from "./metadata.js";

type StandardSchemaWithJsonSchema = StandardSchemaV1 & StandardJSONSchemaV1;

export interface McpPromptOptions {
  /**
   * Unique identifier for the prompt
   */
  name?: string;

  /**
   * Optional human-readable name of the prompt for display purposes.
   */
  title?: string;

  /**
   * Optional human-readable description.
   */
  description?: string;

  /**
   * Optional meta provider class that implements the MetaProvider interface. Used to
   * provide additional metadata for the prompt. Defaults to {@link DefaultMetaProvider}
   * if not specified.
   */
  metaProvider?: new () => MetaProvider;

  /**
   * Standard Schema describing the prompt arguments object for the method
   * signature. When provided, the method receives the schema-backed arguments as
   * its first parameter and the raw JSON arguments as its second parameter.
   */
  argsSchema?: StandardSchemaWithJsonSchema | null;
}

export interface McpPromptMetadata {
  name: string;
  title: string;
  description: string;
  metaProvider: new () => MetaProvider;
  argsSchema: StandardSchemaWithJsonSchema | null;
}

export interface McpPromptMethodArguments {
  exchange?: McpServerExchange;
  context: McpTransportContext | null;
  request: GetPromptRequest;
  prompt: Prompt;
  meta: McpMeta;
  progressToken: unknown;
}

export type McpPromptArgumentsFor<
  TArgsSchema extends StandardSchemaWithJsonSchema | null | undefined,
> = TArgsSchema extends StandardSchemaWithJsonSchema
  ? StandardSchemaV1.InferOutput<TArgsSchema>
  : unknown;

export type McpPromptMethodArgumentsFor<
  TArgsSchema extends StandardSchemaWithJsonSchema | null | undefined =
    undefined,
> = McpPromptArgumentsFor<TArgsSchema>;

type McpPromptMethodResult =
  | GetPromptResult
  | PromptMessage
  | string
  | string[]
  | PromptMessage[]
  | Promise<
      GetPromptResult | PromptMessage | string | string[] | PromptMessage[]
    >;

type ExactPromptMethodSignature<
  T extends (...args: any[]) => any,
  Signature extends (...args: any[]) => any,
> = T extends Signature
  ? Parameters<T> extends Parameters<Signature>
    ? T
    : never
  : never;

type McpPromptMethodDecoratorFor = <T extends (...args: any[]) => any>(
  target: object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<
    ExactPromptMethodSignature<
      T,
      (args: {}, context: McpPromptMethodArguments) => any
    >
  >,
) => void;

type McpPromptMethodDecoratorForArgsSchema<
  TArgsSchema extends StandardSchemaWithJsonSchema,
> = <T extends (...args: any[]) => any>(
  target: object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<
    ExactPromptMethodSignature<
      T,
      (
        args: McpPromptArgumentsFor<TArgsSchema>,
        context?: McpPromptMethodArguments,
      ) => McpPromptMethodResult
    >
  >,
) => void;

/**
 * Marks a method as a MCP Prompt.
 */
export function McpPrompt<TArgsSchema extends StandardSchemaWithJsonSchema>(
  options: McpPromptOptions & { argsSchema: TArgsSchema },
): McpPromptMethodDecoratorForArgsSchema<TArgsSchema>;
export function McpPrompt(
  options: McpPromptOptions,
): McpPromptMethodDecoratorFor;
export function McpPrompt(options: McpPromptOptions = {}): MethodDecorator {
  const metadata: McpPromptMetadata = {
    name: options.name ?? "",
    title: options.title ?? "",
    description: options.description ?? "",
    metaProvider: options.metaProvider ?? DefaultMetaProvider,
    argsSchema: options.argsSchema ?? null,
  };

  return (
    target: object,
    propertyKey: string | symbol,
    _descriptor: PropertyDescriptor,
  ): void => {
    Reflect.defineMetadata(
      MCP_PROMPT_METADATA_KEY,
      metadata,
      target,
      propertyKey,
    );
  };
}
