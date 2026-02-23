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
