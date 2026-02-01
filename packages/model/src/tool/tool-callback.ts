import { type Logger, LoggerFactory } from "@nestjs-ai/commons";
import type { ToolContext } from "../chat";
import type { ToolDefinition } from "./definition";
import { ToolMetadata } from "./metadata";

/**
 * Represents a tool whose execution can be triggered by an AI model.
 */
export abstract class ToolCallback {
	private readonly logger: Logger = LoggerFactory.getLogger(ToolCallback.name);

	/**
	 * Definition used by the AI model to determine when and how to call the tool.
	 */
	abstract get toolDefinition(): ToolDefinition;

	/**
	 * Metadata providing additional information on how to handle the tool.
	 */
	get toolMetadata(): ToolMetadata {
		return ToolMetadata.create({});
	}

	/**
	 * Execute tool with the given input and return the result to send back to the AI model.
	 */
	abstract call(toolInput: string): string;

	/**
	 * Execute tool with the given input and context, and return the result to send back
	 * to the AI model.
	 */
	callTool(toolInput: string, toolContext: ToolContext | null): string {
		if (toolContext != null && Object.keys(toolContext.context).length > 0) {
			this.logger.info(
				"By default the tool context is not used, " +
					"override the method 'call(toolInput: string, toolContext: ToolContext | null)' to support the use of tool context. " +
					`Review the ToolCallback implementation for ${this.toolDefinition.name}`,
			);
		}
		return this.call(toolInput);
	}
}
