import type {
	Model,
	ModelRequest,
	ModelResponse,
	ModelResult,
} from "@nestjs-ai/model";
import type { ChatModelType } from "../types";

export function createChatModel(
	_modelType: ChatModelType,
): Model<ModelRequest<unknown>, ModelResponse<ModelResult<unknown>>> {
	throw new Error("Invalid model type");
}
