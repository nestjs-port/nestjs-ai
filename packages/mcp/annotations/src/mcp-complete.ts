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
  CompleteRequest,
  CompleteResult,
} from "@modelcontextprotocol/server";
import type {
  McpServerExchange,
  McpTransportContext,
} from "@nestjs-ai/mcp-common";
import { MCP_COMPLETE_METADATA_KEY } from "./metadata.js";
import type { McpMeta } from "./mcp-meta.js";

export interface McpCompleteOptions {
  /**
   * The name reference to a prompt. This is used when the completion method is intended
   * to complete a prompt argument.
   */
  prompt?: string;

  /**
   * The name reference to a resource template URI. This is used when the completion
   * method is intended to complete an expression within a URI template of a resource.
   */
  uri?: string;
}

export interface McpCompleteMetadata {
  prompt: string;
  uri: string;
}

export interface McpCompleteMethodArguments {
  exchange?: McpServerExchange;
  context: McpTransportContext | null;
  request?: CompleteRequest;
  argument?: CompleteRequest["params"]["argument"];
  value?: string;
  meta?: McpMeta;
  progressToken?: unknown;
}

type CompleteMethodResult =
  | CompleteResult
  | CompleteResult["completion"]
  | string
  | string[]
  | Promise<CompleteResult | CompleteResult["completion"] | string | string[]>;

type ExactCompleteMethodSignature<
  T extends (...args: any[]) => any,
  Signature extends (...args: any[]) => any,
> = T extends Signature
  ? Parameters<T> extends Parameters<Signature>
    ? T
    : never
  : never;

type McpCompleteMethodDecoratorFor = <T extends (...args: any[]) => any>(
  target: object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<
    ExactCompleteMethodSignature<
      T,
      (args: McpCompleteMethodArguments) => CompleteMethodResult
    >
  >,
) => void;

/**
 * Annotates a method used for completion functionality in the MCP framework. This
 * annotation can be used in two mutually exclusive ways: 1. To complete an expression
 * within a URI template of a resource 2. To complete a prompt argument
 *
 * Note: You must use either the prompt or the uri attribute, but not both simultaneously.
 *
 * @example
 * ```ts
 * class TravelProvider {
 *   @McpComplete({ prompt: "travel-planner" })
 *   completeCityName(args: McpCompleteMethodArguments): string[] {
 *     return ["Amsterdam", "Athens"];
 *   }
 *
 *   @McpComplete({ uri: "weather-api://{city}" })
 *   async completeCityAsync(
 *     args: McpCompleteMethodArguments,
 *   ): Promise<CompleteResult["completion"]> {
 *     return {
 *       values: ["Seoul", "Seattle"],
 *       total: 2,
 *       hasMore: false,
 *     };
 *   }
 * }
 * ```
 */
export function McpComplete(
  options: McpCompleteOptions,
): McpCompleteMethodDecoratorFor;
export function McpComplete(options: McpCompleteOptions = {}): MethodDecorator {
  const metadata: McpCompleteMetadata = {
    prompt: options.prompt ?? "",
    uri: options.uri ?? "",
  };

  return (
    target: object,
    propertyKey: string | symbol,
    _descriptor: PropertyDescriptor,
  ): void => {
    Reflect.defineMetadata(
      MCP_COMPLETE_METADATA_KEY,
      metadata,
      target,
      propertyKey,
    );
  };
}
