import { describe, expect, it } from "vitest";
import { AssistantMessage } from "../../messages";
import { ChatGenerationMetadata } from "../../metadata";
import { Generation } from "../generation";

describe("Generation", () => {
	it("test get output", () => {
		const expectedText = "Test Assistant Message";
		const assistantMessage = new AssistantMessage({
			content: expectedText,
			media: [],
		});
		const generation = new Generation({ assistantMessage });

		expect(generation.output.text).toBe(expectedText);
	});

	it("test constructor with metadata", () => {
		const assistantMessage = new AssistantMessage({
			content: "Test Assistant Message",
			media: [],
		});
		const metadata = ChatGenerationMetadata.builder().build();
		const generation = new Generation({
			assistantMessage,
			chatGenerationMetadata: metadata,
		});

		expect(generation.metadata).toBe(metadata);
	});

	it("test get metadata null", () => {
		const assistantMessage = new AssistantMessage({
			content: "Test Assistant Message",
			media: [],
		});
		const generation = new Generation({ assistantMessage });
		const metadata = generation.metadata;

		expect(metadata).toStrictEqual(ChatGenerationMetadata.NULL);
	});

	it("test get metadata not null", () => {
		const assistantMessage = new AssistantMessage({
			content: "Test Assistant Message",
			media: [],
		});
		const metadata = ChatGenerationMetadata.builder().build();
		const generation = new Generation({
			assistantMessage,
			chatGenerationMetadata: metadata,
		});
		const resultMetadata = generation.metadata;

		expect(resultMetadata).toBe(metadata);
	});

	it("test equals same objects", () => {
		const assistantMessage = new AssistantMessage({
			content: "Test Assistant Message",
			media: [],
		});
		const generation1 = new Generation({ assistantMessage });
		expect(generation1).toBe(generation1);
	});

	it("test equals not instance of generation", () => {
		const assistantMessage = new AssistantMessage({
			content: "Test Assistant Message",
			media: [],
		});
		const generation = new Generation({ assistantMessage });
		const notGenerationObject = {};

		expect(generation).not.toEqual(notGenerationObject);
	});

	it("test equals same metadata", () => {
		const assistantMessage1 = new AssistantMessage({
			content: "Test Assistant Message",
			media: [],
		});
		const assistantMessage2 = new AssistantMessage({
			content: "Test Assistant Message",
			media: [],
		});
		const metadata = ChatGenerationMetadata.builder().build();
		const generation1 = new Generation({
			assistantMessage: assistantMessage1,
			chatGenerationMetadata: metadata,
		});
		const generation2 = new Generation({
			assistantMessage: assistantMessage2,
			chatGenerationMetadata: metadata,
		});

		// Note: TypeScript doesn't have equals method by default
		// Using deep equality check instead
		expect(generation1.output.text).toBe(generation2.output.text);
		expect(generation1.metadata).toBe(generation2.metadata);
	});

	it("test equals different metadata", () => {
		const assistantMessage1 = new AssistantMessage({
			content: "Test Assistant Message",
			media: [],
		});
		const assistantMessage2 = new AssistantMessage({
			content: "Test Assistant Message",
			media: [],
		});
		const metadata1 = ChatGenerationMetadata.builder()
			.finishReason("completed")
			.build();
		const metadata2 = ChatGenerationMetadata.builder()
			.finishReason("failed")
			.build();
		const generation1 = new Generation({
			assistantMessage: assistantMessage1,
			chatGenerationMetadata: metadata1,
		});
		const generation2 = new Generation({
			assistantMessage: assistantMessage2,
			chatGenerationMetadata: metadata2,
		});

		// Note: TypeScript doesn't have equals method by default
		// Checking that metadata is different
		expect(generation1.metadata).not.toBe(generation2.metadata);
		expect(generation1.metadata.finishReason).toBe("completed");
		expect(generation2.metadata.finishReason).toBe("failed");
	});
});
