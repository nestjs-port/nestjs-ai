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

import type { ChatClientRequest } from "../../chat-client-request.js";
import type { ChatClientResponse } from "../../chat-client-response.js";
import { AdvisorChain } from "./advisor-chain.js";
import type { CallAdvisor } from "./call-advisor.interface.js";
import type { CallAdvisorChain } from "./call-advisor-chain.interface.js";
import type { StreamAdvisor } from "./stream-advisor.interface.js";
import type { StreamAdvisorChain } from "./stream-advisor-chain.interface.js";

export abstract class BaseAdvisorChain
  extends AdvisorChain
  implements CallAdvisorChain, StreamAdvisorChain
{
  abstract nextCall(
    chatClientRequest: ChatClientRequest,
  ): Promise<ChatClientResponse>;

  abstract get callAdvisors(): CallAdvisor[];

  abstract copy(after: CallAdvisor): CallAdvisorChain;

  abstract copy(after: StreamAdvisor): StreamAdvisorChain;

  abstract nextStream(
    chatClientRequest: ChatClientRequest,
  ): Observable<ChatClientResponse>;

  abstract get streamAdvisors(): StreamAdvisor[];
}
