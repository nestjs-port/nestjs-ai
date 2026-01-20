import type {
	Model,
	ModelRequest,
	ModelResponse,
	ModelResult,
} from "@nestjs-ai/model";

export type AiModelType =
	| "openai"
	| "gemini"
	| Model<ModelRequest<unknown>, ModelResponse<ModelResult<unknown>>>
	| (() => Model<ModelRequest<unknown>, ModelResponse<ModelResult<unknown>>>);
