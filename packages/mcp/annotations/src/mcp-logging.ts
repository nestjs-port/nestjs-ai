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
  LoggingLevel,
  LoggingMessageNotification,
} from "@modelcontextprotocol/server";
import { MCP_LOGGING_METADATA_KEY } from "./metadata.js";

export interface McpLoggingOptions {
  /**
   * Used as connection or clients identifier to select the MCP clients, the logging
   * consumer is associated with. At least one client identifier must be specified.
   */
  clients: string[];
}

export interface McpLoggingMetadata {
  clients: string[];
}

type McpLoggingNotificationMethod = (
  notification: LoggingMessageNotification,
) => void | Promise<void>;

type McpLoggingParameterMethod = (
  level: LoggingLevel,
  logger: string,
  data: string,
) => void | Promise<void>;

type ExactLoggingMethodSignature<
  T extends (...args: any[]) => any,
  Signature extends (...args: any[]) => any,
> = T extends Signature
  ? Parameters<T> extends Parameters<Signature>
    ? T
    : never
  : never;

type McpLoggingMethodDecoratorFor = <T extends (...args: any[]) => any>(
  target: object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<
    ExactLoggingMethodSignature<
      T,
      McpLoggingNotificationMethod | McpLoggingParameterMethod
    >
  >,
) => void;

/**
 * Annotation for methods that handle logging message notifications from MCP servers. This
 * annotation is applicable only for MCP clients.
 *
 * Methods annotated with this annotation can be used to consume logging messages from MCP
 * servers. The methods can have one of two signatures:
 * - A single parameter of type `LoggingMessageNotification`
 * - Three parameters of types `LoggingLevel`, `string` (logger), and `string` (data)
 *
 * For synchronous consumers, the method must have a void return type. For asynchronous
 * consumers, the method can have either a void return type or return `Promise<void>`.
 *
 * @example
 * ```ts
 * @McpLogging({ clients: ["my-client-id"] })
 * handleLoggingMessage(notification: LoggingMessageNotification): void {
 *   // Handle the notification
 * }
 *
 * @McpLogging({ clients: ["my-client-id"] })
 * handleLoggingMessageWithParams(level: LoggingLevel, logger: string, data: string): void {
 *   // Handle the logging message
 * }
 * ```
 */
export function McpLogging(
  options: McpLoggingOptions,
): McpLoggingMethodDecoratorFor;
export function McpLogging(options: McpLoggingOptions): MethodDecorator {
  const metadata: McpLoggingMetadata = {
    clients: [...options.clients],
  };

  return (
    target: object,
    propertyKey: string | symbol,
    _descriptor: PropertyDescriptor,
  ): void => {
    Reflect.defineMetadata(
      MCP_LOGGING_METADATA_KEY,
      metadata,
      target,
      propertyKey,
    );
  };
}
