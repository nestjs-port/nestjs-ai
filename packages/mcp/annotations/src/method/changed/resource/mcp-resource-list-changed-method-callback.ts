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
import type { Resource } from "@modelcontextprotocol/server";
import {
  AbstractMcpResourceListChangedMethodCallback,
  McpResourceListChangedConsumerMethodException,
} from "./abstract-mcp-resource-list-changed-method-callback.js";

export interface McpResourceListChangedMethodCallbackProps {
  provider: object;
  propertyKey: string | symbol;
}

/**
 * Class for creating Function callbacks around resource list changed consumer methods.
 *
 * This class provides a way to convert methods annotated with `McpResourceListChanged`
 * into callback functions that can be used to handle resource list change notifications
 * in an asynchronous way. It supports methods with a single `Resource[]` parameter and a
 * `void` or `Promise<void>` return type.
 */
export class McpResourceListChangedMethodCallback extends AbstractMcpResourceListChangedMethodCallback {
  constructor(props: McpResourceListChangedMethodCallbackProps) {
    super(props.provider, props.propertyKey);
  }

  /**
   * Apply the callback to the given resource list.
   *
   * This method builds the arguments for the method call, invokes the method, and
   * returns a Promise that resolves when the method execution is done.
   * @param updatedResources The updated list of resources, must not be null
   * @returns A Promise that resolves when the method execution is done
   * @throws McpResourceListChangedConsumerMethodException if there is an error invoking
   * the resource list changed consumer method
   * @throws TypeError if the updatedResources is null
   */
  async apply(updatedResources: Resource[]): Promise<void> {
    if (updatedResources == null) {
      throw new TypeError("Updated resources list must not be null");
    }

    try {
      await this._method.apply(this._provider, [updatedResources]);
    } catch (e) {
      throw new McpResourceListChangedConsumerMethodException(
        `Error invoking resource list changed consumer method: ${this.methodName}`,
        { cause: e },
      );
    }
  }
}
