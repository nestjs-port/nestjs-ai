import type { ChatClientRequest } from "../../chat-client-request";
import type { ChatClientResponse } from "../../chat-client-response";
import type { Advisor } from "./advisor.interface";
import type { CallAdvisorChain } from "./call-advisor-chain.interface";

export interface CallAdvisor extends Advisor {
	adviseCall(
		chatClientRequest: ChatClientRequest,
		callAdvisorChain: CallAdvisorChain,
	): ChatClientResponse;
}
