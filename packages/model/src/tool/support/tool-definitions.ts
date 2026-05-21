import { JsonSchemaGenerator } from "../../util/json/schema/json-schema-generator.js";
import type { ToolAnnotationMetadata } from "../annotation/tool.decorator.js";
import type { DefaultToolDefinitionBuilder } from "../definition/default-tool-definition.js";
import type { ToolDefinition } from "../definition/tool-definition.js";
import { DefaultToolDefinition } from "../definition/default-tool-definition.js";
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
