/*
 * Copyright 2023-present the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { Observable } from "rxjs";
import type { ModelRequest } from "./model-request.interface.js";
import type { ModelResponse } from "./model-response.interface.js";
import type { ModelResult } from "./model-result.interface.js";

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
