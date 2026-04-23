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

import assert from "node:assert/strict";
import type {
  ChatResponse,
  Prompt,
  ToolCallingChatOptions,
  ToolCallingManager,
  ToolDefinition,
  ToolExecutionResult,
} from "@nestjs-ai/model";
import { DefaultToolDefinition, JsonSchemaGenerator } from "@nestjs-ai/model";
import { JsonSchemaConverter } from "./json-schema-converter.js";

type JsonSchemaNodeArg = Parameters<
  typeof JsonSchemaGenerator.convertTypeValuesToUpperCase
>[0];

export class GoogleGenAiToolCallingManager implements ToolCallingManager {
  private readonly _delegateToolCallingManager: ToolCallingManager;

  constructor(delegateToolCallingManager: ToolCallingManager) {
    assert(
      delegateToolCallingManager != null,
      "Delegate tool calling manager must not be null",
    );
    this._delegateToolCallingManager = delegateToolCallingManager;
  }

  resolveToolDefinitions(
    chatOptions: ToolCallingChatOptions,
  ): ToolDefinition[] {
    const toolDefinitions =
      this._delegateToolCallingManager.resolveToolDefinitions(chatOptions);

    return toolDefinitions.map((td) => {
      const jsonSchema = JSON.parse(td.inputSchema);
      const openApiSchema =
        JsonSchemaConverter.convertToOpenApiSchema(jsonSchema);
      JsonSchemaGenerator.convertTypeValuesToUpperCase(
        openApiSchema as JsonSchemaNodeArg,
      );

      return DefaultToolDefinition.builder()
        .name(td.name)
        .description(td.description)
        .inputSchema(JSON.stringify(openApiSchema, null, 2))
        .build();
    });
  }

  async executeToolCalls(
    prompt: Prompt,
    chatResponse: ChatResponse,
  ): Promise<ToolExecutionResult> {
    return this._delegateToolCallingManager.executeToolCalls(
      prompt,
      chatResponse,
    );
  }
}
