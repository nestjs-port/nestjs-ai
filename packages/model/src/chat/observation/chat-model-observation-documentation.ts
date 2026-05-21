import { ObservationDocumentation } from "@nestjs-port/core";

import { DefaultChatModelObservationConvention } from "./default-chat-model-observation-convention.js";

export class ChatModelObservationDocumentation extends ObservationDocumentation {
  get name() {
    return "CHAT_MODEL_OPERATION";
  }

  get defaultConvention() {
    return DefaultChatModelObservationConvention;
  }
}
