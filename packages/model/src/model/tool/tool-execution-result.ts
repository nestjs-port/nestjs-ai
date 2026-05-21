import { AssistantMessage } from "../../chat/messages/assistant-message.js";
import { ChatGenerationMetadata } from "../../chat/metadata/chat-generation-metadata.interface.js";
import { Generation } from "../../chat/model/generation.js";
import type { Message } from "../../chat/messages/message.interface.js";
import { ToolResponseMessage } from "../../chat/messages/tool-response-message.js";

/**
 * The result of a tool execution.
 */
export abstract class ToolExecutionResult {
  static readonly FINISH_REASON = "returnDirect" as const;
  static readonly METADATA_TOOL_ID = "toolId" as const;
  static readonly METADATA_TOOL_NAME = "toolName" as const;

  readonly FINISH_REASON = "returnDirect" as const;
  readonly METADATA_TOOL_ID = "toolId" as const;
  readonly METADATA_TOOL_NAME = "toolName" as const;

  /**
   * The history of messages exchanged during the conversation, including the tool
   * execution result.
   */
  abstract conversationHistory(): Message[];

  /**
   * Whether the tool execution result should be returned directly or passed back to the
   * model.
   */
  returnDirect(): boolean {
    return false;
  }

  /**
   * Build a list of {@link Generation} from the tool execution result, useful for
   * sending the tool execution result to the client directly.
   */
  static buildGenerations(
    toolExecutionResult: ToolExecutionResult,
  ): Generation[] {
    const conversationHistory = toolExecutionResult.conversationHistory();
    const generations: Generation[] = [];
    const lastMessage = conversationHistory[conversationHistory.length - 1];
    if (lastMessage instanceof ToolResponseMessage) {
      for (const response of lastMessage.responses) {
        const assistantMessage = new AssistantMessage({
          content: response.responseData,
        });
        const generation = new Generation({
          assistantMessage,
          chatGenerationMetadata: ChatGenerationMetadata.builder()
            .metadata(ToolExecutionResult.METADATA_TOOL_ID, response.id)
            .metadata(ToolExecutionResult.METADATA_TOOL_NAME, response.name)
            .finishReason(ToolExecutionResult.FINISH_REASON)
            .build(),
        });
        generations.push(generation);
      }
    }
    return generations;
  }
}
