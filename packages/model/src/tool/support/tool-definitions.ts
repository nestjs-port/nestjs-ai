import { JsonSchemaGenerator } from "../../util";
import type { ToolAnnotationMetadata } from "../annotation";
import type {
  DefaultToolDefinitionBuilder,
  ToolDefinition,
} from "../definition";
import { DefaultToolDefinition } from "../definition";
import { ToolUtils } from "./tool-utils";

export interface ToolMethodDefinition {
  methodName: string;
  metadata?: ToolAnnotationMetadata;
}

/**
 * Utility class for creating {@link ToolDefinition} builders and instances from
 * method descriptors.
 */
export abstract class ToolDefinitions {
  private constructor() {
    // prevents instantiation.
  }

  /**
   * Create a default {@link ToolDefinition} builder from a method descriptor.
   */
  static builder({
    methodName,
    metadata,
  }: ToolMethodDefinition): DefaultToolDefinitionBuilder {
    const toolName = ToolUtils.getToolName(methodName, metadata);

    return DefaultToolDefinition.builder()
      .name(toolName)
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
