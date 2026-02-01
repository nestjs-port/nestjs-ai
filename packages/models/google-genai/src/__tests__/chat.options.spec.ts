import { describe, expect, it } from "vitest";
import { GoogleGenAiChatOptionsBuilder } from "../chat.options.builder";

describe("GoogleGenAiChatOptions", () => {
	it("should build options with builder", () => {
		const options = new GoogleGenAiChatOptionsBuilder()
			.model("gemini-pro")
			.temperature(0.7)
			.thinkingLevel("HIGH")
			.build();

		expect(options.model).toBe("gemini-pro");
		expect(options.temperature).toBe(0.7);
		expect(options.thinkingLevel).toBe("HIGH");
	});

	it("should throw error for mutually exclusive thinking options", () => {
		const builder = new GoogleGenAiChatOptionsBuilder().thinkingLevel("LOW");

		expect(() => builder.thinkingBudget(100)).toThrow(
			"Cannot set both thinkingLevel and thinkingBudget",
		);
	});

	it("should allow tool callbacks", () => {
		const options = new GoogleGenAiChatOptionsBuilder()
			.withToolCallback({
				toolDefinition: {
					name: "testTool",
					description: "test",
					inputSchema: JSON.stringify({
						type: "object",
						properties: {},
					}),
				},
				call: async () => "result",
			} as any)
			.build();

		expect(options.toolCallbacks).toHaveLength(1);
		expect(options.toolCallbacks?.[0].toolDefinition.name).toBe("testTool");
	});
});
