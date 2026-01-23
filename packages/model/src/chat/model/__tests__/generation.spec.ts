import { describe, expect, it } from "vitest";
import { AssistantMessage } from "../../messages";
import { ChatGenerationMetadata } from "../../metadata";
import { Generation } from "../generation";

function createAssistantMessage(
	content: string | null,
	toolCalls: {
		id: string;
		type: string;
		name: string;
		arguments: string;
	}[] = [],
): AssistantMessage {
	return new AssistantMessage({ content, toolCalls, media: [] });
}

describe("Generation", () => {
	describe("constructor", () => {
		it("should create Generation with assistantMessage", () => {
			const message = createAssistantMessage("Hello");
			const generation = new Generation({ assistantMessage: message });

			expect(generation.output).toBe(message);
			expect(generation.assistantMessage).toBe(message);
			expect(generation.metadata).toBe(ChatGenerationMetadata.NULL);
		});

		it("should create Generation with metadata", () => {
			const message = createAssistantMessage("Hello");
			const metadata = new ChatGenerationMetadata({ finishReason: "stop" });
			const generation = new Generation({
				assistantMessage: message,
				chatGenerationMetadata: metadata,
			});

			expect(generation.metadata.finishReason).toBe("stop");
		});

		it("should throw when assistantMessage is null", () => {
			expect(() => {
				// @ts-expect-error - testing runtime validation
				new Generation({ assistantMessage: null });
			}).toThrow();
		});
	});

	describe("ModelResult interface", () => {
		it("should implement ModelResult interface", () => {
			const message = createAssistantMessage("Hello");
			const generation = new Generation({ assistantMessage: message });

			// output getter
			expect(generation.output.text).toBe("Hello");
			// metadata getter
			expect(generation.metadata).toBe(ChatGenerationMetadata.NULL);
		});
	});

	describe("builder", () => {
		it("should build Generation using builder pattern", () => {
			const message = createAssistantMessage("Built message");
			const metadata = ChatGenerationMetadata.builder()
				.finishReason("stop")
				.build();

			const generation = Generation.builder()
				.assistantMessage(message)
				.chatGenerationMetadata(metadata)
				.build();

			expect(generation.output.text).toBe("Built message");
			expect(generation.metadata.finishReason).toBe("stop");
		});

		it("should throw when building without assistantMessage", () => {
			expect(() => {
				Generation.builder().build();
			}).toThrow();
		});
	});
});
