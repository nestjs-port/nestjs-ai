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

import type { DefaultToolDefinitionBuilder } from "./default-tool-definition";
import { DefaultToolDefinition } from "./default-tool-definition";

/**
 * Definition used by the AI model to determine when and how to call the tool.
 *
 * @author Thomas Vitale
 * @since 1.0.0
 */
export interface ToolDefinition {
  /**
   * The tool name. Unique within the tool set provided to a model.
   */
  readonly name: string;

  /**
   * The tool description, used by the AI model to determine what the tool does.
   */
  readonly description: string;

  /**
   * The schema of the parameters used to call the tool.
   */
  readonly inputSchema: string;
}

/**
 * Static methods for ToolDefinition.
 */
export namespace ToolDefinition {
  /**
   * Create a default {@link ToolDefinition} builder.
   */
  export function builder(): DefaultToolDefinitionBuilder {
    return DefaultToolDefinition.builder();
  }
}
