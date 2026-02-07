import assert from "node:assert/strict";
import type { ToolCallback } from "../tool-callback";
import type { ToolCallbackResolver } from "./tool-callback-resolver.interface";

export class DelegatingToolCallbackResolver implements ToolCallbackResolver {
	private readonly _toolCallbackResolvers: ToolCallbackResolver[];

	constructor(toolCallbackResolvers: ToolCallbackResolver[]) {
		assert(
			toolCallbackResolvers != null,
			"toolCallbackResolvers cannot be null",
		);
		assert(
			toolCallbackResolvers.every((r) => r != null),
			"toolCallbackResolvers cannot contain null elements",
		);
		this._toolCallbackResolvers = toolCallbackResolvers;
	}

	resolve(toolName: string): ToolCallback | null {
		assert(toolName?.trim(), "toolName cannot be null or empty");

		for (const resolver of this._toolCallbackResolvers) {
			const toolCallback = resolver.resolve(toolName);
			if (toolCallback != null) {
				return toolCallback;
			}
		}
		return null;
	}
}
