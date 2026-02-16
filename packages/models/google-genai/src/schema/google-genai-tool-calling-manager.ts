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
import { JsonSchemaConverter } from "./json-schema-converter";

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
      JsonSchemaGenerator.convertTypeValuesToUpperCase(openApiSchema);

      return DefaultToolDefinition.builder()
        .name(td.name)
        .description(td.description)
        .inputSchema(JSON.stringify(openApiSchema, null, 2))
        .build();
    });
  }

  executeToolCalls(
    prompt: Prompt,
    chatResponse: ChatResponse,
  ): ToolExecutionResult {
    return this._delegateToolCallingManager.executeToolCalls(
      prompt,
      chatResponse,
    );
  }
}
