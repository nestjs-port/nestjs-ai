import type {
	Model,
	ModelRequest,
	ModelResponse,
	ModelResult,
} from "@nestjs-ai/model";
import type { OpenAiChatOptions } from "./openai-chat-options";

export type ChatModelType =
	| "gemini"
	| {
			type: "openai";
			options?: OpenAiChatOptions;
	  }
	| Model<ModelRequest<unknown>, ModelResponse<ModelResult<unknown>>>
	| (() => Model<ModelRequest<unknown>, ModelResponse<ModelResult<unknown>>>);
