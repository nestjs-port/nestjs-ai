import type {
	Model,
	ModelRequest,
	ModelResponse,
	ModelResult,
} from "@nestjs-ai/model";
import type { AiModelType } from "../types";

export function createChatModel(
	_modelType: AiModelType,
): Model<ModelRequest<unknown>, ModelResponse<ModelResult<unknown>>> {
	throw new Error("Invalid model type");
}
