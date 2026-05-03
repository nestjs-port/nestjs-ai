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
import type { ProgressNotification } from "@modelcontextprotocol/server";
import {
  AbstractMcpProgressMethodCallback,
  McpProgressMethodException,
  type AbstractMcpProgressMethodCallbackProps,
} from "./abstract-mcp-progress-method-callback.js";

export type McpProgressMethodCallbackProps =
  AbstractMcpProgressMethodCallbackProps;

/**
 * Asynchronous implementation of a progress method callback.
 *
 * This class creates a Function that invokes a method annotated with `McpProgress`
 * asynchronously when a progress notification is received, returning a `Promise<void>`.
 */
export class McpProgressMethodCallback extends AbstractMcpProgressMethodCallback {
  constructor(props: McpProgressMethodCallbackProps) {
    super(props);
  }

  /**
   * Apply the progress notification and process it asynchronously.
   *
   * This method builds the arguments for the method call and invokes the method,
   * returning a `Promise<void>`.
   * @param notification The progress notification, must not be null
   * @returns A Promise that resolves when the asynchronous operation completes
   * @throws McpProgressMethodException if there is an error invoking the progress method
   * @throws TypeError if the notification is null
   */
  async apply(notification: ProgressNotification): Promise<void> {
    if (notification == null) {
      throw new TypeError("Notification must not be null");
    }

    try {
      const args = this.buildArgs(notification);
      await this._method.apply(this._provider, args);
    } catch (e) {
      throw new McpProgressMethodException(
        `Error invoking progress method: ${this.methodName}`,
        { cause: e },
      );
    }
  }
}
