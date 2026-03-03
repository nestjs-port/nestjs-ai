import {
  AiObservationAttributes,
  KeyValue,
  KeyValues,
  SpringAiKind,
} from "@nestjs-ai/commons";
import type { ToolCallingObservationContext } from "./tool-calling-observation-context";
import { ToolCallingObservationConvention } from "./tool-calling-observation-convention";

export class DefaultToolCallingObservationConvention extends ToolCallingObservationConvention {
  static readonly DEFAULT_NAME = "spring.ai.tool";

  static readonly SPRING_AI_KIND = "spring.ai.kind";
  static readonly TOOL_DEFINITION_NAME = "spring.ai.tool.definition.name";
  static readonly TOOL_DEFINITION_DESCRIPTION =
    "spring.ai.tool.definition.description";
  static readonly TOOL_DEFINITION_SCHEMA = "spring.ai.tool.definition.schema";

  override getName(): string {
    return DefaultToolCallingObservationConvention.DEFAULT_NAME;
  }

  override getContextualName(context: ToolCallingObservationContext): string {
    return `${SpringAiKind.TOOL_CALL.value} ${context.toolDefinition.name}`;
  }

  override getLowCardinalityKeyValues(
    context: ToolCallingObservationContext,
  ): KeyValues {
    return KeyValues.of(
      this.aiOperationType(context),
      this.aiProvider(context),
      this.springAiKind(context),
      this.toolDefinitionName(context),
    );
  }

  protected aiOperationType(context: ToolCallingObservationContext): KeyValue {
    return KeyValue.of(
      AiObservationAttributes.AI_OPERATION_TYPE.value,
      context.operationMetadata.operationType,
    );
  }

  protected aiProvider(context: ToolCallingObservationContext): KeyValue {
    return KeyValue.of(
      AiObservationAttributes.AI_PROVIDER.value,
      context.operationMetadata.provider,
    );
  }

  protected springAiKind(_context: ToolCallingObservationContext): KeyValue {
    return KeyValue.of(
      DefaultToolCallingObservationConvention.SPRING_AI_KIND,
      SpringAiKind.TOOL_CALL.value,
    );
  }

  protected toolDefinitionName(
    context: ToolCallingObservationContext,
  ): KeyValue {
    return KeyValue.of(
      DefaultToolCallingObservationConvention.TOOL_DEFINITION_NAME,
      context.toolDefinition.name,
    );
  }

  override getHighCardinalityKeyValues(
    context: ToolCallingObservationContext,
  ): KeyValues {
    let keyValues = KeyValues.empty();
    keyValues = this.toolDefinitionDescription(keyValues, context);
    keyValues = this.toolDefinitionSchema(keyValues, context);
    return keyValues;
  }

  protected toolDefinitionDescription(
    keyValues: KeyValues,
    context: ToolCallingObservationContext,
  ): KeyValues {
    return keyValues.and(
      DefaultToolCallingObservationConvention.TOOL_DEFINITION_DESCRIPTION,
      context.toolDefinition.description,
    );
  }

  protected toolDefinitionSchema(
    keyValues: KeyValues,
    context: ToolCallingObservationContext,
  ): KeyValues {
    return keyValues.and(
      DefaultToolCallingObservationConvention.TOOL_DEFINITION_SCHEMA,
      context.toolDefinition.inputSchema,
    );
  }
}
