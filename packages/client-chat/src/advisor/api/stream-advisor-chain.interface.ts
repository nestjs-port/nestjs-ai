import type { Observable } from "rxjs";

import type { ChatClientRequest } from "../../chat-client-request";
import type { ChatClientResponse } from "../../chat-client-response";
import type { AdvisorChain } from "./advisor-chain";
import type { StreamAdvisor } from "./stream-advisor.interface";

export interface StreamAdvisorChain extends AdvisorChain {
	nextStream(
		chatClientRequest: ChatClientRequest,
	): Observable<ChatClientResponse>;

	get streamAdvisors(): StreamAdvisor[];
}
