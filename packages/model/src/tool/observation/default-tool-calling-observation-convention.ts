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

import { AiObservationAttributes, SpringAiKind } from "@nestjs-ai/commons";
import { KeyValue, KeyValues } from "@nestjs-port/core";
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
