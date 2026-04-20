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

import { type Logger, LoggerFactory } from "@nestjs-port/core";
import type { ToolContext } from "../chat";
import type { ToolDefinition } from "./definition";
import { ToolMetadata } from "./metadata";

/**
 * Represents a tool whose execution can be triggered by an AI model.
 */
export abstract class ToolCallback {
  private readonly logger: Logger = LoggerFactory.getLogger(ToolCallback.name);

  /**
   * Definition used by the AI model to determine when and how to call the tool.
   */
  abstract get toolDefinition(): ToolDefinition;

  /**
   * Metadata providing additional information on how to handle the tool.
   */
  get toolMetadata(): ToolMetadata {
    return ToolMetadata.create({});
  }

  /**
   * Execute tool with the given input and return the result to send back to the AI model.
   */
  call(toolInput: string): Promise<string>;

  /**
   * Execute tool with the given input and context, and return the result to send back
   * to the AI model.
   */
  call(toolInput: string, toolContext: ToolContext | null): Promise<string>;
  async call(
    toolInput: string,
    toolContext?: ToolContext | null,
  ): Promise<string> {
    if (toolContext != null && Object.keys(toolContext.context).length > 0) {
      this.logger.info(
        "By default the tool context is not used, " +
          "override the method 'call(toolInput: string, toolContext: ToolContext | null)' to support the use of tool context. " +
          `Review the ToolCallback implementation for ${this.toolDefinition.name}`,
      );
    }
    return toolInput;
  }
}
