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
import type { Tool } from "@modelcontextprotocol/server";
import {
  AbstractMcpToolListChangedMethodCallback,
  McpToolListChangedConsumerMethodException,
} from "./abstract-mcp-tool-list-changed-method-callback.js";

export interface McpToolListChangedMethodCallbackProps {
  provider: object;
  propertyKey: string | symbol;
}

/**
 * Class for creating Function callbacks around tool list changed consumer methods.
 *
 * This class provides a way to convert methods annotated with `McpToolListChanged` into
 * callback functions that can be used to handle tool list change notifications. It
 * supports methods with a single `Tool[]` parameter and a `void` or `Promise<void>`
 * return type.
 */
export class McpToolListChangedMethodCallback extends AbstractMcpToolListChangedMethodCallback {
  constructor(props: McpToolListChangedMethodCallbackProps) {
    super(props.provider, props.propertyKey);
  }

  /**
   * Apply the callback to the given tool list.
   *
   * This method builds the arguments for the method call, invokes the method, and
   * returns a Promise that resolves when the method execution is done.
   * @param updatedTools The updated list of tools, must not be null
   * @returns A Promise that resolves when the method execution is done
   * @throws McpToolListChangedConsumerMethodException if there is an error invoking the
   * tool list changed consumer method
   * @throws TypeError if the updatedTools is null
   */
  async apply(updatedTools: Tool[]): Promise<void> {
    if (updatedTools == null) {
      throw new TypeError("Updated tools list must not be null");
    }

    try {
      await this._method.apply(this._provider, [updatedTools]);
    } catch (e) {
      throw new McpToolListChangedConsumerMethodException(
        `Error invoking tool list changed consumer method: ${this.methodName}`,
        { cause: e },
      );
    }
  }
}
