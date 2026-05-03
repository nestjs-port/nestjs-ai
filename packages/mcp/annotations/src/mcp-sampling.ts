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
  CreateMessageRequest,
  CreateMessageResult,
} from "@modelcontextprotocol/server";

import { MCP_SAMPLING_METADATA_KEY } from "./metadata.js";

export interface McpSamplingOptions {
  /**
   * Used as connection or client identifier to select the MCP client, the sampling
   * method is associated with.
   */
  clients: string[];
}

export interface McpSamplingMetadata {
  clients: string[];
}

type ExactSamplingMethodSignature<
  T extends (...args: any[]) => any,
  Signature extends (...args: any[]) => any,
> = T extends Signature
  ? Parameters<T> extends Parameters<Signature>
    ? T
    : never
  : never;

type McpSamplingMethodDecoratorFor = <T extends (...args: any[]) => any>(
  target: object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<
    ExactSamplingMethodSignature<
      T,
      (
        request: CreateMessageRequest,
      ) => CreateMessageResult | Promise<CreateMessageResult>
    >
  >,
) => void;

/**
 * Annotation for methods that handle sampling requests from MCP servers. This annotation
 * is applicable only for MCP clients.
 *
 * Methods annotated with this annotation can be used to process sampling requests from
 * MCP servers. The methods can have one of two signatures:
 * - A single parameter of type `CreateMessageRequest`
 * - Multiple parameters corresponding to the fields of `CreateMessageRequest`
 *
 * For synchronous handlers, the method must return `CreateMessageResult`. For
 * asynchronous handlers, the method must return `Promise<CreateMessageResult>`.
 *
 * @example
 * ```ts
 * @McpSampling({ clients: ["test-client"] })
 * handleSamplingRequest(request: CreateMessageRequest): CreateMessageResult {
 *   // Process the request and return a result
 *   return { message: "Generated response" };
 * }
 *
 * @McpSampling({ clients: ["test-client"] })
 * async handleAsyncSamplingRequest(request: CreateMessageRequest): Promise<CreateMessageResult> {
 *   // Process the request asynchronously and return a result
 *   return { message: "Generated response" };
 * }
 * ```
 */
export function McpSampling(
  options: McpSamplingOptions,
): McpSamplingMethodDecoratorFor;
export function McpSampling(options: McpSamplingOptions): MethodDecorator {
  const metadata: McpSamplingMetadata = {
    clients: [...options.clients],
  };

  return (
    target: object,
    propertyKey: string | symbol,
    _descriptor: PropertyDescriptor,
  ): void => {
    Reflect.defineMetadata(
      MCP_SAMPLING_METADATA_KEY,
      metadata,
      target,
      propertyKey,
    );
  };
}
