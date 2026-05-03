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

import type { Prompt } from "@modelcontextprotocol/server";
import {
  AbstractMcpPromptListChangedMethodCallback,
  McpPromptListChangedConsumerMethodException,
} from "./abstract-mcp-prompt-list-changed-method-callback.js";

export interface McpPromptListChangedMethodCallbackProps {
  provider: object;
  propertyKey: string | symbol;
}

/**
 * Class for creating Function callbacks around prompt list changed consumer methods.
 *
 * This class provides a way to convert methods annotated with `McpPromptListChanged` into
 * callback functions that can be used to handle prompt list change notifications. It
 * supports methods with a single `Prompt[]` parameter and a `void` or `Promise<void>`
 * return type.
 */
export class McpPromptListChangedMethodCallback extends AbstractMcpPromptListChangedMethodCallback {
  constructor(props: McpPromptListChangedMethodCallbackProps) {
    super(props.provider, props.propertyKey);
  }

  /**
   * Apply the callback to the given prompt list.
   *
   * This method invokes the method and
   * returns a Promise that resolves when the method execution is done.
   * @param updatedPrompts The updated list of prompts, must not be null
   * @returns A Promise that resolves when the method execution is done
   * @throws McpPromptListChangedConsumerMethodException if there is an error invoking
   * the prompt list changed consumer method
   * @throws TypeError if the updatedPrompts is null
   */
  async apply(updatedPrompts: Prompt[]): Promise<void> {
    if (updatedPrompts == null) {
      throw new TypeError("Updated prompts list must not be null");
    }

    try {
      await this._method.apply(this._provider, [updatedPrompts]);
    } catch (e) {
      throw new McpPromptListChangedConsumerMethodException(
        `Error invoking prompt list changed consumer method: ${this.methodName}`,
        { cause: e },
      );
    }
  }
}
