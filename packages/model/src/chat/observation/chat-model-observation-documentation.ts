import { ObservationDocumentation } from "@nestjs-ai/commons";

import { DefaultChatModelObservationConvention } from "./default-chat-model-observation-convention";

export class ChatModelObservationDocumentation extends ObservationDocumentation {
	get name() {
		return "CHAT_MODEL_OPERATION";
	}

	get defaultConvention() {
		return DefaultChatModelObservationConvention;
	}
}
