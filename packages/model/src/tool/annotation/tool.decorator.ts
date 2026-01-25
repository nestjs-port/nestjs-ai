import "reflect-metadata";
import type { ToolCallResultConverter } from "../execution";
import { DefaultToolCallResultConverter } from "../execution";

/**
 * Metadata stored for methods decorated with @Tool
 */
export interface ToolAnnotationMetadata {
	/**
	 * The name of the tool. If not provided, the method name will be used.
	 *
	 * For maximum compatibility across different LLMs, it is recommended to use only
	 * alphanumeric characters, underscores, hyphens, and dots in tool names. Using spaces
	 * or special characters may cause issues with some LLMs (e.g., OpenAI).
	 *
	 * Examples of recommended names: "get_weather", "search-docs", "tool.v1"
	 *
	 * Examples of names that may cause compatibility issues: "get weather" (contains
	 * space), "tool()" (contains parentheses)
	 */
	name?: string;
	/**
	 * The description of the tool. If not provided, the method name will be used.
	 */
	description?: string;
	/**
	 * Whether the tool result should be returned directly or passed back to the model.
	 */
	returnDirect?: boolean;
	/**
	 * The class to use to convert the tool call result to a String.
	 */
	resultConverter?: new () => ToolCallResultConverter;
}

/**
 * Symbol key for storing tool metadata on methods
 */
const TOOL_METADATA_KEY = Symbol("tool:metadata");

/**
 * Marks a method as a tool in Spring AI.
 */
export function Tool(options?: ToolAnnotationMetadata): MethodDecorator {
	return (target: object, propertyKey: string | symbol) => {
		const metadata: ToolAnnotationMetadata = {
			name: options?.name ?? "",
			description: options?.description ?? "",
			returnDirect: options?.returnDirect ?? false,
			resultConverter:
				options?.resultConverter ?? DefaultToolCallResultConverter,
		};

		Reflect.defineMetadata(TOOL_METADATA_KEY, metadata, target, propertyKey);
	};
}
