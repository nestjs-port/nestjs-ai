import { describe, expect, it } from "vitest";
import { AiOperationMetadata } from "../ai-operation-metadata";

describe("AiOperationMetadata", () => {
	it("when mandatory metadata then return", () => {
		const operationMetadata = new AiOperationMetadata("chat", "doofenshmirtz");

		expect(operationMetadata).toBeDefined();
	});

	it("when operation type is null then throw", () => {
		expect(
			() => new AiOperationMetadata(null as unknown as string, "doofenshmirtz"),
		).toThrow("operationType cannot be null or empty");
	});

	it("when operation type is empty then throw", () => {
		expect(() => new AiOperationMetadata("", "doofenshmirtz")).toThrow(
			"operationType cannot be null or empty",
		);
	});

	it("when provider is null then throw", () => {
		expect(
			() => new AiOperationMetadata("chat", null as unknown as string),
		).toThrow("provider cannot be null or empty");
	});

	it("when provider is empty then throw", () => {
		expect(() => new AiOperationMetadata("chat", "")).toThrow(
			"provider cannot be null or empty",
		);
	});

	it("when operation type is blank then throw", () => {
		expect(() => new AiOperationMetadata("   ", "doofenshmirtz")).toThrow(
			"operationType cannot be null or empty",
		);
	});

	it("when provider is blank then throw", () => {
		expect(() => new AiOperationMetadata("chat", "   ")).toThrow(
			"provider cannot be null or empty",
		);
	});

	it("when built with valid values then fields are accessible", () => {
		const operationMetadata = new AiOperationMetadata("chat", "openai");

		expect(operationMetadata.operationType).toBe("chat");
		expect(operationMetadata.provider).toBe("openai");
	});
});
