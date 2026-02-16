import { describe, expect, it } from "vitest";

import { ChatClientObservationDocumentation } from "../chat-client-observation-documentation";
import { DefaultChatClientObservationConvention } from "../default-chat-client-observation-convention";

describe("ChatClientObservationDocumentation", () => {
	it("should have name", () => {
		const documentation = new ChatClientObservationDocumentation();
		expect(documentation.name).toBe("AI_CHAT_CLIENT");
	});

	it("should expose default convention", () => {
		const documentation = new ChatClientObservationDocumentation();
		expect(documentation.defaultConvention).toBe(
			DefaultChatClientObservationConvention,
		);
	});
});
