import {
  METER_REGISTRY_TOKEN,
  type MeterRegistry,
  ObservationHandlers,
  type ProviderConfiguration,
} from "@nestjs-ai/commons";
import {
  ChatModelCompletionObservationHandler,
  ChatModelMeterObservationHandler,
} from "../chat/observation";

class ChatModelObservationHandlerConfigurer {}

/**
 * Creates providers that register default chat model observation handlers.
 */
export function createChatModelObservationHandlerProviders(): ProviderConfiguration[] {
  return [
    {
      token: ChatModelObservationHandlerConfigurer,
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
            new ChatModelMeterObservationHandler({ meterRegistry }),
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
