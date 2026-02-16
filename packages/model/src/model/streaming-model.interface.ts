import type { Observable } from "rxjs";
import type { ModelRequest } from "./model-request.interface";
import type { ModelResponse } from "./model-response.interface";
import type { ModelResult } from "./model-result.interface";

/**
 * The StreamingModel interface provides a generic API for invoking an AI models with
 * streaming response. It abstracts the process of sending requests and receiving a
 * streaming responses. The interface uses generics to accommodate different types of
 * requests and responses, enhancing flexibility and adaptability across different AI
 * model implementations.
 *
 * @typeParam TReq - the generic type of the request to the AI model
 * @typeParam TResChunk - the generic type of a single item in the streaming response from the AI model
 */
export interface StreamingModel<
  TReq extends ModelRequest<unknown>,
  TResChunk extends ModelResponse<ModelResult<unknown>>,
> {
  /**
   * Executes a method call to the AI model.
   * @param request - the request object to be sent to the AI model
   * @returns the streaming response from the AI model
   */
  stream(request: TReq): Observable<TResChunk>;
}
