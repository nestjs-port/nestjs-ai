import type { ToolCallingManager, ToolDefinition } from "@nestjs-ai/model";

/**
 * Wrapper for ToolCallingManager that ensures compatibility with Vertex AI's OpenAPI schema format.
 * Wraps the provided ToolCallingManager to convert tool definitions as needed.
 */
export class GoogleGenAiToolCallingManager implements ToolCallingManager {
	private readonly delegate: ToolCallingManager;

	constructor(delegate: ToolCallingManager) {
		this.delegate = delegate;
	}

	resolveToolDefinitions(options: unknown): ToolDefinition[] {
		return this.delegate.resolveToolDefinitions(options);
	}

	async executeToolCalls(prompt: any, chatResponse: any): Promise<any> {
		return this.delegate.executeToolCalls(prompt, chatResponse);
	}
}

/**
 * Create default ToolCallingManager instance.
 */
export function createDefaultToolCallingManager(): ToolCallingManager {
	return {
		resolveToolDefinitions: () => [],
		executeToolCalls: async () => ({
			returnDirect: false,
			conversationHistory: [],
		}),
	};
}
