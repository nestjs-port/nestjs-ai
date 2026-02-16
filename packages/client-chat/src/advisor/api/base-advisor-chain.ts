import type { Observable } from "rxjs";

import type { ChatClientRequest } from "../../chat-client-request";
import type { ChatClientResponse } from "../../chat-client-response";
import { AdvisorChain } from "./advisor-chain";
import type { CallAdvisor } from "./call-advisor.interface";
import type { CallAdvisorChain } from "./call-advisor-chain.interface";
import type { StreamAdvisor } from "./stream-advisor.interface";
import type { StreamAdvisorChain } from "./stream-advisor-chain.interface";

export abstract class BaseAdvisorChain
	extends AdvisorChain
	implements CallAdvisorChain, StreamAdvisorChain
{
	abstract nextCall(
		chatClientRequest: ChatClientRequest,
	): Promise<ChatClientResponse>;

	abstract get callAdvisors(): CallAdvisor[];

	abstract copy(after: CallAdvisor): CallAdvisorChain;

	abstract nextStream(
		chatClientRequest: ChatClientRequest,
	): Observable<ChatClientResponse>;

	abstract get streamAdvisors(): StreamAdvisor[];
}
