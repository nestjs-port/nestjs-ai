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

import { JsonSchemaGenerator } from "../../util/index.js";
import type { ToolAnnotationMetadata } from "../annotation/index.js";
import type {
  DefaultToolDefinitionBuilder,
  ToolDefinition,
} from "../definition/index.js";
import { DefaultToolDefinition } from "../definition/index.js";
import { ToolUtils } from "./tool-utils.js";

export interface ToolMethodDefinition {
  methodName: string;
  metadata?: ToolAnnotationMetadata;
}

/**
 * Utility class for creating {@link ToolDefinition} builders and instances from
 * method descriptors.
 */
export abstract class ToolDefinitions {
  /**
   * Create a default {@link ToolDefinition} builder from a method descriptor.
   */
  static builder({
    methodName,
    metadata,
  }: ToolMethodDefinition): DefaultToolDefinitionBuilder {
    return DefaultToolDefinition.builder()
      .name(ToolUtils.getToolName(methodName, metadata))
      .description(ToolUtils.getToolDescription(methodName, metadata))
      .inputSchema(
        JsonSchemaGenerator.generateForMethodInput(metadata?.parameters),
      );
  }

  /**
   * Create a default {@link ToolDefinition} instance from a method descriptor.
   */
  static from(method: ToolMethodDefinition): ToolDefinition {
    return ToolDefinitions.builder(method).build();
  }
}
