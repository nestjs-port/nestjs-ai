import { AiOperationMetadata, AiOperationType } from "@nestjs-ai/commons";
import { ModelObservationContext } from "../../model";
import type { ChatResponse } from "../model";
import type { Prompt } from "../prompt";

export class ChatModelObservationContext extends ModelObservationContext<
  Prompt,
  ChatResponse
> {
  constructor(prompt: Prompt, provider: string) {
    super(
      prompt,
      new AiOperationMetadata(AiOperationType.CHAT.value, provider),
    );
  }
}
