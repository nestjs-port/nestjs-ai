/*
 * Copyright 2023-present the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { OllamaApi } from "./ollama-api.js";

type ChatResponse = OllamaApi.ChatResponse;
type Message = OllamaApi.Message;
type ToolCall = OllamaApi.Message.ToolCall;

export abstract class OllamaApiHelper {
  /**
   * @param ollamaChatResponse the Ollama chat response chunk to check
   * @returns true if the chunk is a streaming tool call.
   */
  static isStreamingToolCall(
    ollamaChatResponse: ChatResponse | null | undefined,
  ): boolean {
    if (
      ollamaChatResponse == null ||
      ollamaChatResponse.message == null ||
      ollamaChatResponse.message.tool_calls == null
    ) {
      return false;
    }

    return ollamaChatResponse.message.tool_calls.length > 0;
  }

  /**
   * @param ollamaChatResponse the Ollama chat response chunk to check
   * @returns true if the chunk is final
   */
  static isStreamingDone(
    ollamaChatResponse: ChatResponse | null | undefined,
  ): boolean {
    if (ollamaChatResponse == null) {
      return false;
    }

    return (
      ollamaChatResponse.done === true &&
      ollamaChatResponse.done_reason === "stop"
    );
  }

  static merge(previous: ChatResponse, current: ChatResponse): ChatResponse {
    const model = concatStrings(previous.model, current.model) ?? "";
    const createdAt = current.created_at ?? previous.created_at;
    const message = mergeMessage(previous.message, current.message);
    const doneReason =
      current.done_reason != null ? current.done_reason : previous.done_reason;
    const done = current.done != null ? current.done : previous.done;
    const totalDuration = addNumbers(
      previous.total_duration,
      current.total_duration,
    );
    const loadDuration = addNumbers(
      previous.load_duration,
      current.load_duration,
    );
    const promptEvalCount = addNumbers(
      previous.prompt_eval_count,
      current.prompt_eval_count,
    );
    const promptEvalDuration = addNumbers(
      previous.prompt_eval_duration,
      current.prompt_eval_duration,
    );
    const evalCount = addNumbers(previous.eval_count, current.eval_count);
    const evalDuration = addNumbers(
      previous.eval_duration,
      current.eval_duration,
    );

    const merged: ChatResponse = {
      model,
      created_at: createdAt,
      message,
    };
    if (doneReason != null) {
      merged.done_reason = doneReason;
    }
    if (done != null) {
      merged.done = done;
    }
    if (totalDuration != null) {
      merged.total_duration = totalDuration;
    }
    if (loadDuration != null) {
      merged.load_duration = loadDuration;
    }
    if (promptEvalCount != null) {
      merged.prompt_eval_count = promptEvalCount;
    }
    if (promptEvalDuration != null) {
      merged.prompt_eval_duration = promptEvalDuration;
    }
    if (evalCount != null) {
      merged.eval_count = evalCount;
    }
    if (evalDuration != null) {
      merged.eval_duration = evalDuration;
    }
    return merged;
  }
}

function mergeMessage(previous: Message, current: Message): Message {
  const content = mergeContent(previous, current);
  const thinking = mergeThinking(previous, current);
  let role = current.role != null ? current.role : previous.role;
  role = role != null ? role : OllamaApi.Message.Role.ASSISTANT;
  const images = mergeImages(previous, current);
  const toolCalls = mergeToolCall(previous, current);
  const toolName = mergeToolName(previous, current);

  return OllamaApi.Message.builder(role)
    .content(content)
    .thinking(thinking)
    .images(images)
    .toolCalls(toolCalls)
    .toolName(toolName)
    .build();
}

function concatStrings(
  previous: string | null | undefined,
  current: string | null | undefined,
): string | null {
  if (previous == null) {
    return current ?? null;
  }
  if (current == null) {
    return previous;
  }
  return previous + current;
}

function addNumbers(
  previous: number | null | undefined,
  current: number | null | undefined,
): number | null {
  if (previous == null) {
    return current ?? null;
  }
  if (current == null) {
    return previous;
  }
  return previous + current;
}

function mergeContent(
  previous: Message | null | undefined,
  current: Message | null | undefined,
): string | null {
  if (previous == null || previous.content == null) {
    return current != null ? (current.content ?? null) : null;
  }
  if (current == null || current.content == null) {
    return previous.content;
  }

  return previous.content + current.content;
}

function mergeToolCall(
  previous: Message | null | undefined,
  current: Message | null | undefined,
): ToolCall[] | null {
  if (previous == null) {
    return current != null ? (current.tool_calls ?? null) : null;
  }
  if (current == null) {
    return previous.tool_calls ?? null;
  }
  return concatLists(previous.tool_calls, current.tool_calls);
}

function mergeThinking(
  previous: Message | null | undefined,
  current: Message | null | undefined,
): string | null {
  if (previous == null || previous.thinking == null) {
    return current != null ? (current.thinking ?? null) : null;
  }
  if (current == null || current.thinking == null) {
    return previous.thinking;
  }

  return previous.thinking + current.thinking;
}

function mergeToolName(
  previous: Message | null | undefined,
  current: Message | null | undefined,
): string | null {
  if (previous == null || previous.tool_name == null) {
    return current != null ? (current.tool_name ?? null) : null;
  }
  if (current == null || current.tool_name == null) {
    return previous.tool_name;
  }

  return previous.tool_name + current.tool_name;
}

function mergeImages(
  previous: Message | null | undefined,
  current: Message | null | undefined,
): string[] | null {
  if (previous == null) {
    return current != null ? (current.images ?? null) : null;
  }
  if (current == null) {
    return previous.images ?? null;
  }
  return concatLists(previous.images, current.images);
}

function concatLists<T>(
  previous: T[] | null | undefined,
  current: T[] | null | undefined,
): T[] | null {
  if (previous == null) {
    return current ?? null;
  }
  if (current == null) {
    return previous;
  }
  return [...previous, ...current];
}
