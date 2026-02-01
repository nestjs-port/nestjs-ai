import type {
	ChatResponse,
	Prompt,
	ToolCallingManager,
	ToolDefinition,
	ToolExecutionResult,
} from "@nestjs-ai/model";
import type { ToolCallingChatOptions } from "../chat.options";

/**
 * Google GenAI Tool Calling Manager implementation.
 * It delegates the actual tool execution to another {@link ToolCallingManager} while
 * handling Google-specific requirements.
 */
export class GoogleGenAiToolCallingManager implements ToolCallingManager {
	private readonly delegateToolCallingManager: ToolCallingManager;

	/**
	 * Creates a new instance of GoogleGenAiToolCallingManager.
	 * @param delegateToolCallingManager the underlying tool calling manager that handles
	 * the actual tool execution.
	 */
	constructor(delegateToolCallingManager: ToolCallingManager) {
		this.delegateToolCallingManager = delegateToolCallingManager;
	}

	/**
	 * Resolve the tool definitions from the model's tool calling options.
	 * Adapt tool definitions to be compatible with Google GenAI's format.
	 * @param chatOptions - Chat options with tool configuration
	 * @returns Array of resolved ToolDefinitions
	 */
	resolveToolDefinitions(
		chatOptions: ToolCallingChatOptions,
	): ToolDefinition[] {
		const toolDefinitions =
			this.delegateToolCallingManager.resolveToolDefinitions(chatOptions);

		return toolDefinitions.map((td: ToolDefinition) => {
			// TODO: Implement JsonSchemaConverter and JsonSchemaGenerator for OpenAPI conversion
			// and type value upper-casing to match Spring AI adaptation logic.
			return td;
		});
	}

	/**
	 * Execute the tool calls requested by the model.
	 * @param prompt - Original prompt sent to model
	 * @param chatResponse - Response containing tool calls
	 * @returns Promise with execution result and updated conversation
	 */
	async executeToolCalls(
		prompt: Prompt,
		chatResponse: ChatResponse,
	): Promise<ToolExecutionResult> {
		return this.delegateToolCallingManager.executeToolCalls(
			prompt,
			chatResponse,
		);
	}
}
