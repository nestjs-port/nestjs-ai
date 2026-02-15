import type { ChatClientRequest } from "../../chat-client-request";
import type { ChatClientResponse } from "../../chat-client-response";
import type { AdvisorChain } from "./advisor-chain.interface";
import type { CallAdvisor } from "./call-advisor.interface";

export interface CallAdvisorChain extends AdvisorChain {
	nextCall(chatClientRequest: ChatClientRequest): ChatClientResponse;

	get callAdvisors(): CallAdvisor[];

	copy(after: CallAdvisor): CallAdvisorChain;
}
