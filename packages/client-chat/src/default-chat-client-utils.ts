import assert from "node:assert/strict";
import {
  type ChatOptions,
  DefaultChatOptions,
  DefaultToolCallingChatOptions,
  type Message,
  Prompt,
  PromptTemplate,
  SystemMessage,
  ToolCallingChatOptions,
  UserMessage,
} from "@nestjs-ai/model";
import { ChatClientRequest } from "./chat-client-request";
import type { DefaultChatClient } from "./default-chat-client";

export abstract class DefaultChatClientUtils {
  private constructor() {
    // Utility class
  }

  static toChatClientRequest(
    inputRequest: DefaultChatClient.DefaultChatClientRequestSpec,
  ): ChatClientRequest {
    assert(inputRequest, "inputRequest cannot be null");

    /*
     * ==========* MESSAGES * ==========
     */
    const processedMessages: Message[] = [];

    // System Text => First in the list
    let processedSystemText = inputRequest.systemText;
    if (DefaultChatClientUtils.hasText(processedSystemText)) {
      if (inputRequest.systemParams.size > 0) {
        processedSystemText = PromptTemplate.builder()
          .template(processedSystemText)
          .variables(
            DefaultChatClientUtils.mapToRecord(inputRequest.systemParams),
          )
          .renderer(inputRequest.getTemplateRenderer())
          .build()
          .render();
      }
      processedMessages.push(
        new SystemMessage({
          content: processedSystemText,
          properties: DefaultChatClientUtils.mapToRecord(
            inputRequest.systemMetadata,
          ),
        }),
      );
    }

    // Messages => In the middle of the list
    if (inputRequest.getMessages().length > 0) {
      processedMessages.push(...inputRequest.getMessages());
    }

    // User Text => Last in the list
    let processedUserText = inputRequest.userText;
    if (DefaultChatClientUtils.hasText(processedUserText)) {
      if (inputRequest.userParams.size > 0) {
        processedUserText = PromptTemplate.builder()
          .template(processedUserText)
          .variables(
            DefaultChatClientUtils.mapToRecord(inputRequest.userParams),
          )
          .renderer(inputRequest.getTemplateRenderer())
          .build()
          .render();
      }
      processedMessages.push(
        new UserMessage({
          content: processedUserText,
          media: [...inputRequest.media],
          properties: DefaultChatClientUtils.mapToRecord(
            inputRequest.userMetadata,
          ),
        }),
      );
    }

    /*
     * ==========* OPTIONS * ==========
     */
    let processedChatOptions = inputRequest.chatOptions;

    // If we have tool-related configuration but no tool or non-tool options,
    // create ToolCallingChatOptions
    if (
      inputRequest.getToolNames().length > 0 ||
      inputRequest.getToolCallbacks().length > 0 ||
      inputRequest.toolCallbackProviders.length > 0 ||
      inputRequest.getToolContext().size > 0
    ) {
      if (processedChatOptions == null) {
        processedChatOptions = new DefaultToolCallingChatOptions();
      } else if (processedChatOptions instanceof DefaultChatOptions) {
        processedChatOptions =
          DefaultChatClientUtils.copyToDefaultToolCallingChatOptions(
            processedChatOptions,
          );
      }
    }

    if (
      processedChatOptions != null &&
      DefaultChatClientUtils.isToolCallingChatOptions(processedChatOptions)
    ) {
      if (inputRequest.getToolNames().length > 0) {
        processedChatOptions.toolNames = ToolCallingChatOptions.mergeToolNames(
          new Set(inputRequest.getToolNames()),
          processedChatOptions.toolNames,
        );
      }

      // Lazily resolve ToolCallbackProvider instances to ToolCallback instances
      const allToolCallbacks = [...inputRequest.getToolCallbacks()];
      for (const provider of inputRequest.toolCallbackProviders) {
        allToolCallbacks.push(...provider.toolCallbacks);
      }

      if (allToolCallbacks.length > 0) {
        const toolCallbacks = ToolCallingChatOptions.mergeToolCallbacks(
          allToolCallbacks,
          processedChatOptions.toolCallbacks,
        );
        ToolCallingChatOptions.validateToolCallbacks(toolCallbacks);
        processedChatOptions.toolCallbacks = toolCallbacks;
      }

      if (inputRequest.getToolContext().size > 0) {
        processedChatOptions.toolContext =
          ToolCallingChatOptions.mergeToolContext(
            DefaultChatClientUtils.mapToRecord(inputRequest.getToolContext()),
            processedChatOptions.toolContext,
          );
      }
    }

    /*
     * ==========* REQUEST * ==========
     */
    const promptBuilder = Prompt.builder().messages(processedMessages);
    if (processedChatOptions != null) {
      promptBuilder.chatOptions(processedChatOptions);
    }

    return ChatClientRequest.builder()
      .prompt(promptBuilder.build())
      .context(new Map(inputRequest.advisorParams))
      .build();
  }

  private static copyToDefaultToolCallingChatOptions(
    source: DefaultChatOptions,
  ): DefaultToolCallingChatOptions {
    const target = new DefaultToolCallingChatOptions();
    target.model = source.model ?? null;
    target.frequencyPenalty = source.frequencyPenalty ?? null;
    target.maxTokens = source.maxTokens ?? null;
    target.presencePenalty = source.presencePenalty ?? null;
    target.stopSequences = source.stopSequences ?? null;
    target.temperature = source.temperature ?? null;
    target.topK = source.topK ?? null;
    target.topP = source.topP ?? null;
    return target;
  }

  private static isToolCallingChatOptions(
    options: ChatOptions,
  ): options is ToolCallingChatOptions {
    return (
      "toolCallbacks" in options &&
      "toolNames" in options &&
      "toolContext" in options
    );
  }

  private static hasText(value: string | null | undefined): value is string {
    return value != null && value.trim().length > 0;
  }

  private static mapToRecord(
    map: Map<string, unknown>,
  ): Record<string, unknown> {
    const record: Record<string, unknown> = {};
    for (const [key, value] of map.entries()) {
      record[key] = value;
    }
    return record;
  }
}
