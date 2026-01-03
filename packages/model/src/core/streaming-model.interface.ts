import type { Observable } from "rxjs";
import type { ModelRequest } from "./model-request.interface";
import type { ModelResponse } from "./model-response.interface";
import type { ModelResult } from "./model-result.interface";

export interface StreamingModel<
	TReq extends ModelRequest<unknown>,
	TResChunk extends ModelResponse<ModelResult<unknown>>,
> {
	stream(request: TReq): Observable<TResChunk>;
}
