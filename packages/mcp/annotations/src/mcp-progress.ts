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
import type { ProgressNotification } from "@modelcontextprotocol/client";
import { MCP_PROGRESS_METADATA_KEY } from "./metadata.js";

export interface McpProgressOptions {
  /**
   * Used as connection or client identifier to select the MCP client, the progress
   * consumer is associated with. At least one client identifier must be specified.
   */
  clients: string[];
}

export interface McpProgressMetadata {
  clients: string[];
}

type McpProgressNotificationMethod = (
  notification: ProgressNotification,
) => void | Promise<void>;

type McpProgressParameterMethod = (
  progress: number,
  progressToken: string,
  total: string | null,
) => void | Promise<void>;

type ExactProgressMethodSignature<
  T extends (...args: any[]) => any,
  Signature extends (...args: any[]) => any,
> = T extends Signature
  ? Parameters<T> extends Parameters<Signature>
    ? T
    : never
  : never;

type McpProgressMethodDecoratorFor = <T extends (...args: any[]) => any>(
  target: object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<
    ExactProgressMethodSignature<
      T,
      McpProgressNotificationMethod | McpProgressParameterMethod
    >
  >,
) => void;

/**
 * Annotation for methods that handle progress notifications from MCP servers. This
 * annotation is applicable only for MCP clients.
 *
 * Methods annotated with this annotation can be used to consume progress messages from
 * MCP servers. The methods can have one of two signatures:
 * - A single parameter of type `ProgressNotification`
 * - Three parameters of types `number` (progress), `string` (progressToken), and
 *   `string | null` (total)
 *
 * For synchronous consumers, the method must have a void return type. For asynchronous
 * consumers, the method can have either a void return type or return `Promise<void>`.
 *
 * @example
 * ```ts
 * @McpProgress({ clients: ["my-client-id"] })
 * handleProgressMessage(notification: ProgressNotification): void {
 *   // Handle the progress notification
 * }
 *
 * @McpProgress({ clients: ["my-client-id"] })
 * handleProgressWithParams(progress: number, progressToken: string, total: string | null): void {
 *   // Handle the progress notification
 * }
 * ```
 */
export function McpProgress(
  options: McpProgressOptions,
): McpProgressMethodDecoratorFor;
export function McpProgress(options: McpProgressOptions): MethodDecorator {
  const metadata: McpProgressMetadata = {
    clients: [...options.clients],
  };

  return (
    target: object,
    propertyKey: string | symbol,
    _descriptor: PropertyDescriptor,
  ): void => {
    Reflect.defineMetadata(
      MCP_PROGRESS_METADATA_KEY,
      metadata,
      target,
      propertyKey,
    );
  };
}
