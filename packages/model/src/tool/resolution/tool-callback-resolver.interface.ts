import type { ToolCallback } from "../index";

/**
 * A resolver for {@link ToolCallback} instances.
 */
export interface ToolCallbackResolver {
	/**
	 * Resolve the {@link ToolCallback} for the given tool name.
	 */
	resolve(toolName: string): ToolCallback | null;
}
