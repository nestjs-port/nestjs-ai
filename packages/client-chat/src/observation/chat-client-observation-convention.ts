import type {
  KeyValue,
  ObservationContext,
  ObservationConvention,
} from "@nestjs-ai/commons";

import { ChatClientObservationContext } from "./chat-client-observation-context";

export abstract class ChatClientObservationConvention
  implements ObservationConvention<ChatClientObservationContext>
{
  abstract getName(): string;

  abstract getContextualName(context: ChatClientObservationContext): string;

  supportsContext(
    context: ObservationContext,
  ): context is ChatClientObservationContext {
    return context instanceof ChatClientObservationContext;
  }

  abstract getLowCardinalityKeyValues(
    context: ChatClientObservationContext,
  ): KeyValue[];

  abstract getHighCardinalityKeyValues(
    context: ChatClientObservationContext,
  ): KeyValue[];
}
