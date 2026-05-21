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
import type { ElicitRequest, ElicitResult } from "@modelcontextprotocol/client";

import { MCP_ELICITATION_METADATA_KEY } from "./metadata.js";
import type { StructuredElicitResult } from "./context/structured-elicit-result.js";

export interface McpElicitationOptions {
  /**
   * Used as connection or client identifier to select the MCP clients, the elicitation
   * method is associated with.
   */
  clients: string[];
}

export interface McpElicitationMetadata {
  clients: string[];
}

type ExactElicitationMethodSignature<
  T extends (...args: any[]) => any,
  Signature extends (...args: any[]) => any,
> = T extends Signature
  ? Parameters<T> extends Parameters<Signature>
    ? T
    : never
  : never;

type McpElicitationMethodDecoratorFor = <T extends (...args: any[]) => any>(
  target: object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<
    ExactElicitationMethodSignature<
      T,
      (
        request: ElicitRequest,
      ) =>
        | ElicitResult
        | StructuredElicitResult<unknown>
        | Promise<ElicitResult | StructuredElicitResult<unknown>>
    >
  >,
) => void;

/**
 * Annotation for methods that handle elicitation requests from MCP servers. This
 * annotation is applicable only for MCP clients.
 *
 * Methods annotated with this annotation can be used to process elicitation requests from
 * MCP servers.
 *
 * For synchronous handlers, the method must return `ElicitResult`. For asynchronous
 * handlers, the method must return `Promise<ElicitResult>`.
 *
 * @example
 * ```ts
 * @McpElicitation({ clients: ["my-client-id"] })
 * handleElicitationRequest(request: ElicitRequest): ElicitResult {
 *   return {
 *     message: "Generated response",
 *     requestedSchema: {
 *       type: "object",
 *       properties: { message: { type: "string" } },
 *     },
 *   };
 * }
 *
 * @McpElicitation({ clients: ["my-client-id"] })
 * async handleAsyncElicitationRequest(request: ElicitRequest): Promise<ElicitResult> {
 *   return {
 *     message: "Generated response",
 *     requestedSchema: {
 *       type: "object",
 *       properties: { message: { type: "string" } },
 *     },
 *   };
 * }
 * ```
 */
export function McpElicitation(
  options: McpElicitationOptions,
): McpElicitationMethodDecoratorFor;
export function McpElicitation(
  options: McpElicitationOptions,
): MethodDecorator {
  const metadata: McpElicitationMetadata = {
    clients: [...options.clients],
  };

  return (
    target: object,
    propertyKey: string | symbol,
    _descriptor: PropertyDescriptor,
  ): void => {
    Reflect.defineMetadata(
      MCP_ELICITATION_METADATA_KEY,
      metadata,
      target,
      propertyKey,
    );
  };
}
