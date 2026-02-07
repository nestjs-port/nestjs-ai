import { describe, expect, it } from "vitest";
import {
	DefaultToolDefinition,
	ToolCallback,
	type ToolDefinition,
} from "../../../tool";
import { DefaultToolCallingChatOptions } from "../default-tool-calling-chat-options";
import { ToolCallingChatOptions } from "../tool-calling-chat-options.interface";

class TestToolCallback extends ToolCallback {
	private readonly _toolDefinition: ToolDefinition;

	constructor(name: string) {
		super();
		this._toolDefinition = DefaultToolDefinition.builder()
			.name(name)
			.inputSchema("{}")
			.build();
	}

	get toolDefinition(): ToolDefinition {
		return this._toolDefinition;
	}

	call(_toolInput: string): string {
		return "Mission accomplished!";
	}
}

describe("ToolCallingChatOptions", () => {
	// isInternalToolExecutionEnabled

	it("when tool calling chat options and execution enabled true", () => {
		const options = new DefaultToolCallingChatOptions();
		options.internalToolExecutionEnabled = true;
		expect(ToolCallingChatOptions.isInternalToolExecutionEnabled(options)).toBe(
			true,
		);
	});

	it("when tool calling chat options and execution enabled false", () => {
		const options = new DefaultToolCallingChatOptions();
		options.internalToolExecutionEnabled = false;
		expect(ToolCallingChatOptions.isInternalToolExecutionEnabled(options)).toBe(
			false,
		);
	});

	it("when tool calling chat options and execution enabled default", () => {
		const options = new DefaultToolCallingChatOptions();
		expect(ToolCallingChatOptions.isInternalToolExecutionEnabled(options)).toBe(
			true,
		);
	});

	// mergeToolNames

	it("when merge runtime and default tool names", () => {
		const runtimeToolNames = new Set(["toolA"]);
		const defaultToolNames = new Set(["toolB"]);
		const merged = ToolCallingChatOptions.mergeToolNames(
			runtimeToolNames,
			defaultToolNames,
		);
		expect([...merged]).toEqual(["toolA"]);
	});

	it("when merge runtime and empty default tool names", () => {
		const runtimeToolNames = new Set(["toolA"]);
		const defaultToolNames = new Set<string>();
		const merged = ToolCallingChatOptions.mergeToolNames(
			runtimeToolNames,
			defaultToolNames,
		);
		expect([...merged]).toEqual(["toolA"]);
	});

	it("when merge empty runtime and default tool names", () => {
		const runtimeToolNames = new Set<string>();
		const defaultToolNames = new Set(["toolB"]);
		const merged = ToolCallingChatOptions.mergeToolNames(
			runtimeToolNames,
			defaultToolNames,
		);
		expect([...merged]).toEqual(["toolB"]);
	});

	it("when merge empty runtime and empty default tool names", () => {
		const runtimeToolNames = new Set<string>();
		const defaultToolNames = new Set<string>();
		const merged = ToolCallingChatOptions.mergeToolNames(
			runtimeToolNames,
			defaultToolNames,
		);
		expect(merged.size).toBe(0);
	});

	// mergeToolCallbacks

	it("when merge runtime and default tool callbacks", () => {
		const runtimeToolCallbacks = [new TestToolCallback("toolA")];
		const defaultToolCallbacks = [new TestToolCallback("toolB")];
		const merged = ToolCallingChatOptions.mergeToolCallbacks(
			runtimeToolCallbacks,
			defaultToolCallbacks,
		);
		expect(merged).toHaveLength(1);
		expect(merged[0].toolDefinition.name).toBe("toolA");
	});

	it("when merge runtime and empty default tool callbacks", () => {
		const runtimeToolCallbacks = [new TestToolCallback("toolA")];
		const defaultToolCallbacks: ToolCallback[] = [];
		const merged = ToolCallingChatOptions.mergeToolCallbacks(
			runtimeToolCallbacks,
			defaultToolCallbacks,
		);
		expect(merged).toHaveLength(1);
		expect(merged[0].toolDefinition.name).toBe("toolA");
	});

	it("when merge empty runtime and default tool callbacks", () => {
		const runtimeToolCallbacks: ToolCallback[] = [];
		const defaultToolCallbacks = [new TestToolCallback("toolB")];
		const merged = ToolCallingChatOptions.mergeToolCallbacks(
			runtimeToolCallbacks,
			defaultToolCallbacks,
		);
		expect(merged).toHaveLength(1);
		expect(merged[0].toolDefinition.name).toBe("toolB");
	});

	it("when merge empty runtime and empty default tool callbacks", () => {
		const runtimeToolCallbacks: ToolCallback[] = [];
		const defaultToolCallbacks: ToolCallback[] = [];
		const merged = ToolCallingChatOptions.mergeToolCallbacks(
			runtimeToolCallbacks,
			defaultToolCallbacks,
		);
		expect(merged).toHaveLength(0);
	});

	// mergeToolContext

	it("when merge runtime and default tool context", () => {
		const runtimeToolContext = { key1: "value1", key2: "value2" };
		const defaultToolContext = { key1: "valueA", key3: "value3" };
		const merged = ToolCallingChatOptions.mergeToolContext(
			runtimeToolContext,
			defaultToolContext,
		);
		expect(Object.keys(merged)).toHaveLength(3);
		expect(merged.key1).toBe("value1");
		expect(merged.key2).toBe("value2");
		expect(merged.key3).toBe("value3");
	});

	it("when merge runtime and empty default tool context", () => {
		const runtimeToolContext = { key1: "value1", key2: "value2" };
		const defaultToolContext = {};
		const merged = ToolCallingChatOptions.mergeToolContext(
			runtimeToolContext,
			defaultToolContext,
		);
		expect(Object.keys(merged)).toHaveLength(2);
		expect(merged.key1).toBe("value1");
		expect(merged.key2).toBe("value2");
	});

	it("when merge empty runtime and default tool context", () => {
		const runtimeToolContext = {};
		const defaultToolContext = { key1: "value1", key2: "value2" };
		const merged = ToolCallingChatOptions.mergeToolContext(
			runtimeToolContext,
			defaultToolContext,
		);
		expect(Object.keys(merged)).toHaveLength(2);
		expect(merged.key1).toBe("value1");
		expect(merged.key2).toBe("value2");
	});

	it("when merge empty runtime and empty default tool context", () => {
		const runtimeToolContext = {};
		const defaultToolContext = {};
		const merged = ToolCallingChatOptions.mergeToolContext(
			runtimeToolContext,
			defaultToolContext,
		);
		expect(Object.keys(merged)).toHaveLength(0);
	});

	// validateToolCallbacks

	it("should ensure unique tool names", () => {
		const toolCallbacks = [
			new TestToolCallback("toolA"),
			new TestToolCallback("toolA"),
		];
		expect(() =>
			ToolCallingChatOptions.validateToolCallbacks(toolCallbacks),
		).toThrow("Multiple tools with the same name (toolA)");
	});
});
