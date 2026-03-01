import assert from "node:assert/strict";
import { type Logger, LoggerFactory } from "@nestjs-ai/commons";
import {
  AssistantMessage,
  type ChatResponse,
  type Message,
  type Prompt,
  ToolContext,
  type ToolResponse,
  ToolResponseMessage,
} from "../../chat";
import {
  DefaultToolExecutionExceptionProcessor,
  DelegatingToolCallbackResolver,
  type ToolCallback,
  type ToolCallbackResolver,
  type ToolDefinition,
  ToolExecutionException,
  type ToolExecutionExceptionProcessor,
} from "../../tool";
import { DefaultToolExecutionResult } from "./default-tool-execution-result";
import type { ToolCallingChatOptions } from "./tool-calling-chat-options.interface";
import type { ToolCallingManager } from "./tool-calling-manager.interface";
import type { ToolExecutionResult } from "./tool-execution-result";

const POSSIBLE_LLM_TOOL_NAME_CHANGE_WARNING =
  "LLM may have adapted the tool name '%s', especially if the name was truncated due to length limits. If this is the case, you can customize the prefixing and processing logic using McpToolNamePrefixGenerator";

interface InternalToolExecutionResult {
  toolResponseMessage: ToolResponseMessage;
  returnDirect: boolean;
}

export interface DefaultToolCallingManagerProps {
  toolCallbackResolver?: ToolCallbackResolver;
  toolExecutionExceptionProcessor?: ToolExecutionExceptionProcessor;
}

export class DefaultToolCallingManager implements ToolCallingManager {
  private readonly logger: Logger = LoggerFactory.getLogger(
    DefaultToolCallingManager.name,
  );

  private static readonly DEFAULT_TOOL_CALLBACK_RESOLVER: ToolCallbackResolver =
    new DelegatingToolCallbackResolver([]);

  private static readonly DEFAULT_TOOL_EXECUTION_EXCEPTION_PROCESSOR: ToolExecutionExceptionProcessor =
    new DefaultToolExecutionExceptionProcessor(false);

  private readonly _toolCallbackResolver: ToolCallbackResolver;
  private readonly _toolExecutionExceptionProcessor: ToolExecutionExceptionProcessor;

  constructor(props: DefaultToolCallingManagerProps = {}) {
    this._toolCallbackResolver =
      props.toolCallbackResolver ??
      DefaultToolCallingManager.DEFAULT_TOOL_CALLBACK_RESOLVER;
    this._toolExecutionExceptionProcessor =
      props.toolExecutionExceptionProcessor ??
      DefaultToolCallingManager.DEFAULT_TOOL_EXECUTION_EXCEPTION_PROCESSOR;
  }

  resolveToolDefinitions(
    chatOptions: ToolCallingChatOptions,
  ): ToolDefinition[] {
    assert(chatOptions, "chatOptions cannot be null");

    const toolCallbacks: ToolCallback[] = [...chatOptions.toolCallbacks];

    for (const toolName of chatOptions.toolNames) {
      // Skip the tool if it is already present in the request toolCallbacks.
      // That might happen if a tool is defined in the options
      // both as a ToolCallback and as a tool name.
      if (
        chatOptions.toolCallbacks.some(
          (tool) => tool.toolDefinition.name === toolName,
        )
      ) {
        continue;
      }
      const toolCallback = this._toolCallbackResolver.resolve(toolName);
      if (toolCallback == null) {
        this.logger.warn(
          POSSIBLE_LLM_TOOL_NAME_CHANGE_WARNING.replace("%s", toolName),
        );
        throw new Error(`No ToolCallback found for tool name: ${toolName}`);
      }
      toolCallbacks.push(toolCallback);
    }

    return toolCallbacks.map((cb) => cb.toolDefinition);
  }

  async executeToolCalls(
    prompt: Prompt,
    chatResponse: ChatResponse,
  ): Promise<ToolExecutionResult> {
    assert(prompt, "prompt cannot be null");
    assert(chatResponse, "chatResponse cannot be null");

    const toolCallGeneration = chatResponse.results.find(
      (g) => g.output.toolCalls.length > 0,
    );

    if (!toolCallGeneration) {
      throw new Error("No tool call requested by the chat model");
    }

    const assistantMessage = toolCallGeneration.output;

    const toolContext = DefaultToolCallingManager.buildToolContext(
      prompt,
      assistantMessage,
    );

    const internalResult = await this.executeToolCall(
      prompt,
      assistantMessage,
      toolContext,
    );

    const conversationHistory =
      DefaultToolCallingManager.buildConversationHistoryAfterToolExecution(
        prompt.instructions,
        assistantMessage,
        internalResult.toolResponseMessage,
      );

    return new DefaultToolExecutionResult({
      conversationHistory,
      returnDirect: internalResult.returnDirect,
    });
  }

  private static buildToolContext(
    prompt: Prompt,
    assistantMessage: AssistantMessage,
  ): ToolContext {
    let toolContextMap: Record<string, unknown> = {};

    const options = prompt.options;
    if (options && "toolContext" in options) {
      const toolCallingChatOptions = options as ToolCallingChatOptions;
      const ctx = toolCallingChatOptions.toolContext;
      if (ctx && Object.keys(ctx).length > 0) {
        toolContextMap = { ...ctx };
        toolContextMap[ToolContext.TOOL_CALL_HISTORY] =
          DefaultToolCallingManager.buildConversationHistoryBeforeToolExecution(
            prompt,
            assistantMessage,
          );
      }
    }

    return new ToolContext(toolContextMap);
  }

  private static buildConversationHistoryBeforeToolExecution(
    prompt: Prompt,
    assistantMessage: AssistantMessage,
  ): Message[] {
    const messageHistory: Message[] = [...prompt.copy().instructions];
    messageHistory.push(
      new AssistantMessage({
        content: assistantMessage.text ?? "",
        properties: assistantMessage.metadata,
        toolCalls: assistantMessage.toolCalls,
      }),
    );
    return messageHistory;
  }

  private async executeToolCall(
    prompt: Prompt,
    assistantMessage: AssistantMessage,
    toolContext: ToolContext,
  ): Promise<InternalToolExecutionResult> {
    let toolCallbacks: ToolCallback[] = [];
    const options = prompt.options;
    if (options && "toolCallbacks" in options) {
      const toolCallingChatOptions = options as ToolCallingChatOptions;
      toolCallbacks = toolCallingChatOptions.toolCallbacks;
    }

    const toolResponses: ToolResponse[] = [];

    let returnDirect: boolean | null = null;

    for (const toolCall of assistantMessage.toolCalls) {
      this.logger.debug(`Executing tool call: ${toolCall.name}`);

      const toolName = toolCall.name;
      let toolInputArguments = toolCall.arguments;

      // Handle the possible null parameter situation in streaming mode.
      if (!toolInputArguments || toolInputArguments.trim() === "") {
        this.logger.warn(
          `Tool call arguments are null or empty for tool: ${toolName}. Using empty JSON object as default.`,
        );
        toolInputArguments = "{}";
      }

      const toolCallback =
        toolCallbacks.find((tool) => toolName === tool.toolDefinition.name) ??
        this._toolCallbackResolver.resolve(toolName);

      if (toolCallback == null) {
        this.logger.warn(
          POSSIBLE_LLM_TOOL_NAME_CHANGE_WARNING.replace("%s", toolName),
        );
        throw new Error(`No ToolCallback found for tool name: ${toolName}`);
      }

      if (returnDirect === null) {
        returnDirect = toolCallback.toolMetadata.returnDirect();
      } else {
        returnDirect = returnDirect && toolCallback.toolMetadata.returnDirect();
      }

      let toolResult: string;
      try {
        toolResult = await toolCallback.callTool(
          toolInputArguments,
          toolContext,
        );
      } catch (ex) {
        if (ex instanceof ToolExecutionException) {
          toolResult = this._toolExecutionExceptionProcessor.process(ex);
        } else {
          throw ex;
        }
      }

      toolResponses.push({
        id: toolCall.id,
        name: toolName,
        responseData: toolResult ?? "",
      });
    }

    return {
      toolResponseMessage: new ToolResponseMessage({
        responses: toolResponses,
      }),
      returnDirect: returnDirect ?? false,
    };
  }

  private static buildConversationHistoryAfterToolExecution(
    previousMessages: Message[],
    assistantMessage: AssistantMessage,
    toolResponseMessage: ToolResponseMessage,
  ): Message[] {
    const messages: Message[] = [...previousMessages];
    messages.push(assistantMessage);
    messages.push(toolResponseMessage);
    return messages;
  }
}
