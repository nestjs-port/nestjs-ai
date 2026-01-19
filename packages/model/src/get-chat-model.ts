import type { Model, ModelRequest, ModelResponse, ModelResult } from "./core";
import type { AiModelType } from "./types";

export function getChatModel(
	_modelType: AiModelType,
): Model<ModelRequest<unknown>, ModelResponse<ModelResult<unknown>>> {
	throw new Error("Invalid model type");
}
