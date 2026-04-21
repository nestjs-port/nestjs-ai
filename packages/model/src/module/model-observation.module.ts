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

import { Module, type Provider } from "@nestjs/common";
import {
  METER_REGISTRY_TOKEN,
  type MeterRegistry,
  ObservationHandlers,
} from "@nestjs-port/core";
import {
  ChatModelCompletionObservationHandler,
  ChatModelMeterObservationHandler,
} from "../chat";
import { EmbeddingModelMeterObservationHandler } from "../embedding";
import { ImageModelPromptContentObservationHandler } from "../image";

const modelObservationHandlerProvider: Provider = {
  provide: Symbol.for("MODEL_OBSERVATION_HANDLER_PROVIDER"),
  useFactory: (
    observationHandlers?: ObservationHandlers,
    meterRegistry?: MeterRegistry,
  ) => {
    if (observationHandlers == null) {
      return;
    }

    if (
      !observationHandlers.handlers.some(
        (handler) => handler instanceof ChatModelCompletionObservationHandler,
      )
    ) {
      observationHandlers.addHandler(
        new ChatModelCompletionObservationHandler(),
      );
    }

    if (
      !observationHandlers.handlers.some(
        (handler) =>
          handler instanceof ImageModelPromptContentObservationHandler,
      )
    ) {
      observationHandlers.addHandler(
        new ImageModelPromptContentObservationHandler(),
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
        (handler) => handler instanceof EmbeddingModelMeterObservationHandler,
      )
    ) {
      observationHandlers.addHandler(
        new EmbeddingModelMeterObservationHandler(meterRegistry),
      );
    }
  },
  inject: [
    { token: ObservationHandlers, optional: true },
    { token: METER_REGISTRY_TOKEN, optional: true },
  ],
};

/**
 * Nest module that registers default observation handlers for model packages.
 */
@Module({
  providers: [modelObservationHandlerProvider],
})
export class ModelObservationModule {}
