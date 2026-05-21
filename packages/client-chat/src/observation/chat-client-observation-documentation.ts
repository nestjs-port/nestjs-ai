import { ObservationDocumentation } from "@nestjs-port/core";
import { DefaultChatClientObservationConvention } from "./default-chat-client-observation-convention.js";

export class ChatClientObservationDocumentation extends ObservationDocumentation {
  override get name(): string {
    return "AI_CHAT_CLIENT";
  }

  override get defaultConvention() {
    return DefaultChatClientObservationConvention;
  }
}
