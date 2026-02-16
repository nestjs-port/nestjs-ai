import { ObservationDocumentation } from "@nestjs-ai/commons";
import { DefaultChatClientObservationConvention } from "./default-chat-client-observation-convention";

export class ChatClientObservationDocumentation extends ObservationDocumentation {
  override get name(): string {
    return "AI_CHAT_CLIENT";
  }

  override get defaultConvention() {
    return DefaultChatClientObservationConvention;
  }
}
