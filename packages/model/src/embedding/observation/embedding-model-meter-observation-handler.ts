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

import type {
  MeterRegistry,
  ObservationContext,
  ObservationHandler,
} from "@nestjs-ai/commons";

import { ModelUsageMetricsGenerator } from "../../model";
import { EmbeddingModelObservationContext } from "./embedding-model-observation-context";

export class EmbeddingModelMeterObservationHandler
  implements ObservationHandler<EmbeddingModelObservationContext>
{
  private readonly _meterRegistry: MeterRegistry;

  constructor(meterRegistry: MeterRegistry) {
    this._meterRegistry = meterRegistry;
  }

  onStop(context: EmbeddingModelObservationContext): void {
    const usage = context.response?.metadata?.usage;
    if (usage != null) {
      ModelUsageMetricsGenerator.generate(usage, context, this._meterRegistry);
    }
  }

  supportsContext(
    context: ObservationContext,
  ): context is EmbeddingModelObservationContext {
    return context instanceof EmbeddingModelObservationContext;
  }
}
