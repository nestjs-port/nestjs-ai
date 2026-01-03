import type { ModelRequest } from "./model-request.interface";
import type { ModelResponse } from "./model-response.interface";
import type { ModelResult } from "./model-result.interface";

export interface Model<
	TReq extends ModelRequest<unknown>,
	TRes extends ModelResponse<ModelResult<unknown>>,
> {
	call(request: TReq): Promise<TRes>;
}
