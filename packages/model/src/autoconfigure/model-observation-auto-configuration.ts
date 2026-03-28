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

import {
  METER_REGISTRY_TOKEN,
  type MeterRegistry,
  ObservationHandlers,
  type ProviderConfiguration,
} from "@nestjs-ai/commons";
import {
  ChatModelCompletionObservationHandler,
  ChatModelMeterObservationHandler,
} from "../chat";
import { EmbeddingModelMeterObservationHandler } from "../embedding";

class ModelObservationHandlerConfigurer {}

/**
 * Creates providers that register default model observation handlers.
 */
export function createModelObservationHandlerProviders(): ProviderConfiguration[] {
  return [
    {
      token: ModelObservationHandlerConfigurer,
      useFactory: (
        observationHandlers: ObservationHandlers,
        meterRegistry?: MeterRegistry,
      ) => {
        if (
          !observationHandlers.handlers.some(
            (handler) =>
              handler instanceof ChatModelCompletionObservationHandler,
          )
        ) {
          observationHandlers.addHandler(
            new ChatModelCompletionObservationHandler(),
          );
        }

        if (
          meterRegistry != null &&
          !observationHandlers.handlers.some(
            (handler) => handler instanceof ChatModelMeterObservationHandler,
          )
        ) {
          observationHandlers.addHandler(
            new ChatModelMeterObservationHandler(meterRegistry),
          );
        }

        if (
          meterRegistry != null &&
          !observationHandlers.handlers.some(
            (handler) =>
              handler instanceof EmbeddingModelMeterObservationHandler,
          )
        ) {
          observationHandlers.addHandler(
            new EmbeddingModelMeterObservationHandler(meterRegistry),
          );
        }

        return null;
      },
      inject: [
        ObservationHandlers,
        { token: METER_REGISTRY_TOKEN, optional: true },
      ],
    },
  ];
}
