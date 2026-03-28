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

import type { ModelRequest } from "./model-request.interface";
import type { ModelResponse } from "./model-response.interface";
import type { ModelResult } from "./model-result.interface";

/**
 * The Model interface provides a generic API for invoking AI models. It is designed to
 * handle the interaction with various types of AI models by abstracting the process of
 * sending requests and receiving responses. The interface uses generics to
 * accommodate different types of requests and responses, enhancing flexibility and
 * adaptability across different AI model implementations.
 *
 * @typeParam TReq - the generic type of the request to the AI model
 * @typeParam TRes - the generic type of the response from the AI model
 */
export interface Model<
  TReq extends ModelRequest<unknown>,
  TRes extends ModelResponse<ModelResult<unknown>>,
> {
  /**
   * Executes a method call to the AI model.
   * @param request - the request object to be sent to the AI model
   * @returns the response from the AI model
   */
  call(request: TReq): Promise<TRes>;
}
