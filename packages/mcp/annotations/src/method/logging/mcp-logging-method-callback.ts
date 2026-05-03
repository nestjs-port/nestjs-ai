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

import type { LoggingMessageNotification } from "@modelcontextprotocol/server";

import {
  AbstractMcpLoggingMethodCallback,
  McpLoggingConsumerMethodException,
  type AbstractMcpLoggingMethodCallbackProps,
} from "./abstract-mcp-logging-method-callback.js";

export type McpLoggingMethodCallbackProps =
  AbstractMcpLoggingMethodCallbackProps;

/**
 * Class for creating Function callbacks around logging consumer methods that return
 * Promise.
 *
 * This class provides a way to convert methods annotated with `McpLogging` into
 * callback functions that can be used to handle logging message notifications in an
 * asynchronous way. It supports methods with either a single
 * LoggingMessageNotification parameter or three parameters (LoggingLevel, String,
 * String).
 */
export class McpLoggingMethodCallback extends AbstractMcpLoggingMethodCallback {
  constructor(props: McpLoggingMethodCallbackProps) {
    super(props);
  }

  async apply(notification: LoggingMessageNotification): Promise<void> {
    if (notification == null) {
      throw new TypeError("Notification must not be null");
    }

    try {
      const args = this.buildArgs(notification);
      await this._method.apply(this._provider, args);
    } catch (error) {
      throw new McpLoggingConsumerMethodException(
        `Error invoking logging consumer method: ${this.methodName}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }
}
