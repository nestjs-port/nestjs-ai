import type { ChatModel } from "@nestjs-ai/model";
import { describe, expect, it } from "vitest";

import { ChatModelCallAdvisor } from "../chat-model-call-advisor";

describe("ChatModelCallAdvisor", () => {
	it("when chat model is null then throw", () => {
		expect(() => {
			new ChatModelCallAdvisor(null as unknown as ChatModel);
		}).toThrow("chatModel cannot be null");
	});
});
