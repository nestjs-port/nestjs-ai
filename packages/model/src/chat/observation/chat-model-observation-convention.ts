import type {
  KeyValues,
  ObservationContext,
  ObservationConvention,
} from "@nestjs-ai/commons";

import { ChatModelObservationContext } from "./chat-model-observation-context";

export abstract class ChatModelObservationConvention
  implements ObservationConvention<ChatModelObservationContext>
{
  abstract getName(): string;

  abstract getContextualName(context: ChatModelObservationContext): string;

  supportsContext(
    context: ObservationContext,
  ): context is ChatModelObservationContext {
    return context instanceof ChatModelObservationContext;
  }

  abstract getLowCardinalityKeyValues(
    context: ChatModelObservationContext,
  ): KeyValues;

  abstract getHighCardinalityKeyValues(
    context: ChatModelObservationContext,
  ): KeyValues;
}
