import type {
	Model,
	ModelRequest,
	ModelResponse,
	ModelResult,
} from "@nestjs-ai/model";
import type { OpenAiParentProperties } from "./open-ai-parent-properties";

export type ChatModelType =
	| "gemini"
	| {
			type: "openai";
			options?: OpenAiParentProperties;
	  }
	| Model<ModelRequest<unknown>, ModelResponse<ModelResult<unknown>>>
	| (() => Model<ModelRequest<unknown>, ModelResponse<ModelResult<unknown>>>);
