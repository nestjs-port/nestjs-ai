import type { Observable } from "rxjs";

import type { ChatClientRequest } from "../../chat-client-request";
import type { ChatClientResponse } from "../../chat-client-response";
import type { Advisor } from "./advisor.interface";
import type { StreamAdvisorChain } from "./stream-advisor-chain.interface";

export interface StreamAdvisor extends Advisor {
  adviseStream(
    chatClientRequest: ChatClientRequest,
    streamAdvisorChain: StreamAdvisorChain,
  ): Observable<ChatClientResponse>;
}
