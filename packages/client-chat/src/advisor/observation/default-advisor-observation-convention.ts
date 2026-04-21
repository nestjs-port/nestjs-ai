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
import {
  AiObservationAttributes,
  AiOperationType,
  AiProvider,
  KeyValue,
  KeyValues,
  SpringAiKind,
} from "@nestjs-ai/commons";
import { ParsingUtils } from "@nestjs-port/core";

import type { AdvisorObservationContext } from "./advisor-observation-context";
import { AdvisorObservationConvention } from "./advisor-observation-convention";

export class DefaultAdvisorObservationConvention extends AdvisorObservationConvention {
  static readonly DEFAULT_NAME = "spring.ai.advisor";

  private readonly _name: string;

  constructor(name: string = DefaultAdvisorObservationConvention.DEFAULT_NAME) {
    super();
    this._name = name;
  }

  override getName(): string {
    return this._name;
  }

  override getContextualName(context: AdvisorObservationContext): string {
    assert(context, "context cannot be null");
    return ParsingUtils.reConcatenateCamelCase(context.advisorName, "_")
      .replace("_around_advisor", "")
      .replace("_advisor", "");
  }

  override getLowCardinalityKeyValues(
    context: AdvisorObservationContext,
  ): KeyValues {
    assert(context, "context cannot be null");
    return KeyValues.of(
      this.aiOperationType(context),
      this.aiProvider(context),
      this.springAiKind(),
      this.advisorName(context),
    );
  }

  protected aiOperationType(_context: AdvisorObservationContext): KeyValue {
    return KeyValue.of(
      AiObservationAttributes.AI_OPERATION_TYPE.value,
      AiOperationType.FRAMEWORK.value,
    );
  }

  protected aiProvider(_context: AdvisorObservationContext): KeyValue {
    return KeyValue.of(
      AiObservationAttributes.AI_PROVIDER.value,
      AiProvider.SPRING_AI.value,
    );
  }

  protected springAiKind(): KeyValue {
    return KeyValue.of("spring.ai.kind", SpringAiKind.ADVISOR.value);
  }

  protected advisorName(context: AdvisorObservationContext): KeyValue {
    return KeyValue.of("spring.ai.advisor.name", context.advisorName);
  }

  override getHighCardinalityKeyValues(
    context: AdvisorObservationContext,
  ): KeyValues {
    assert(context, "context cannot be null");
    return KeyValues.of(this.advisorOrder(context));
  }

  protected advisorOrder(context: AdvisorObservationContext): KeyValue {
    return KeyValue.of("spring.ai.advisor.order", `${context.order}`);
  }
}
