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

import { ToolCallback, type ToolDefinition } from "@nestjs-ai/model";
import { describe, expect, it } from "vitest";
import {
  type AudioParameters,
  AudioResponseFormat,
  type FunctionTool,
  type ResponseFormat,
  SearchContextSize,
  ServiceTier,
  Voice,
  type WebSearchOptions,
} from "../api";
import { OpenAiChatOptions } from "../open-ai-chat-options";

class TestToolCallback extends ToolCallback {
  get toolDefinition(): ToolDefinition {
    return {
      name: "test-tool",
      description: "test tool",
      inputSchema: "{}",
    };
  }

  async call(toolInput: string): Promise<string> {
    return toolInput;
  }
}

describe("OpenAiChatOptions", () => {
  it("test builder with all fields", () => {
    const logitBias: Record<string, number> = { token1: 1, token2: -1 };
    const outputModalities = ["text", "audio"];
    const outputAudio: AudioParameters = {
      voice: Voice.ALLOY,
      format: AudioResponseFormat.MP3,
    };
    const responseFormat: ResponseFormat = { type: "text" };
    const stopSequences = ["stop1", "stop2"];
    const tools: FunctionTool[] = [];
    const toolChoice = "auto";
    const metadata = { key1: "value1" };
    const toolContext = { keyA: "valueA" };

    const options = new OpenAiChatOptions({
      model: "test-model",
      frequencyPenalty: 0.5,
      logitBias,
      logprobs: true,
      topLogprobs: 5,
      maxCompletionTokens: 50,
      n: 2,
      outputModalities,
      outputAudio,
      presencePenalty: 0.8,
      responseFormat,
      seed: 12345,
      stop: stopSequences,
      temperature: 0.7,
      topP: 0.9,
      tools,
      toolChoice,
      user: "test-user",
      parallelToolCalls: true,
      store: false,
      metadata,
      reasoningEffort: "medium",
      internalToolExecutionEnabled: false,
      httpHeaders: { header1: "value1" },
      toolContext,
      serviceTier: ServiceTier.PRIORITY,
      promptCacheKey: "test-cache-key",
      safetyIdentifier: "test-safety-id",
    });

    // streamUsage set separately since it's a derived property
    options.streamUsage = true;

    expect(options.model).toBe("test-model");
    expect(options.frequencyPenalty).toBe(0.5);
    expect(options.logitBias).toEqual(logitBias);
    expect(options.logprobs).toBe(true);
    expect(options.topLogprobs).toBe(5);
    expect(options.maxTokens).toBeUndefined();
    expect(options.maxCompletionTokens).toBe(50);
    expect(options.n).toBe(2);
    expect(options.outputModalities).toEqual(outputModalities);
    expect(options.outputAudio).toEqual(outputAudio);
    expect(options.presencePenalty).toBe(0.8);
    expect(options.responseFormat).toEqual(responseFormat);
    expect(options.streamOptions).toEqual({ include_usage: true });
    expect(options.seed).toBe(12345);
    expect(options.stop).toEqual(stopSequences);
    expect(options.temperature).toBe(0.7);
    expect(options.topP).toBe(0.9);
    expect(options.tools).toEqual(tools);
    expect(options.toolChoice).toBe(toolChoice);
    expect(options.user).toBe("test-user");
    expect(options.parallelToolCalls).toBe(true);
    expect(options.store).toBe(false);
    expect(options.metadata).toEqual(metadata);
    expect(options.reasoningEffort).toBe("medium");
    expect(options.internalToolExecutionEnabled).toBe(false);
    expect(options.httpHeaders).toEqual({ header1: "value1" });
    expect(options.toolContext).toEqual(toolContext);
    expect(options.serviceTier).toBe(ServiceTier.PRIORITY);
    expect(options.promptCacheKey).toBe("test-cache-key");
    expect(options.safetyIdentifier).toBe("test-safety-id");

    expect(options.streamUsage).toBe(true);
    expect(options.streamOptions).toEqual({ include_usage: true });
  });

  it("test copy", () => {
    const logitBias: Record<string, number> = { token1: 1 };
    const outputModalities = ["text"];
    const outputAudio: AudioParameters = {
      voice: Voice.ALLOY,
      format: AudioResponseFormat.MP3,
    };
    const responseFormat: ResponseFormat = { type: "text" };
    const stopSequences = ["stop1"];
    const tools: FunctionTool[] = [];
    const toolChoice = "none";
    const metadata = { key1: "value1" };

    const originalOptions = new OpenAiChatOptions({
      model: "test-model",
      frequencyPenalty: 0.5,
      logitBias,
      logprobs: true,
      topLogprobs: 5,
      maxCompletionTokens: 50,
      n: 2,
      outputModalities,
      outputAudio,
      presencePenalty: 0.8,
      responseFormat,
      seed: 12345,
      stop: stopSequences,
      temperature: 0.7,
      topP: 0.9,
      tools,
      toolChoice,
      user: "test-user",
      parallelToolCalls: false,
      store: true,
      metadata,
      reasoningEffort: "low",
      internalToolExecutionEnabled: true,
      httpHeaders: { header1: "value1" },
      serviceTier: ServiceTier.DEFAULT,
      promptCacheKey: "copy-test-cache",
      safetyIdentifier: "copy-test-safety",
    });

    const copiedOptions = originalOptions.copy();
    expect(copiedOptions).not.toBe(originalOptions);
    expect(copiedOptions).toEqual(originalOptions);
  });

  it("test setters", () => {
    const logitBias: Record<string, number> = { token1: 1 };
    const outputModalities = ["audio"];
    const outputAudio: AudioParameters = {
      voice: Voice.ALLOY,
      format: AudioResponseFormat.MP3,
    };
    const responseFormat: ResponseFormat = { type: "text" };
    const stopSequences = ["stop1", "stop2"];
    const tools: FunctionTool[] = [];
    const toolChoice = "auto";
    const metadata = { key2: "value2" };

    const options = new OpenAiChatOptions();
    options.model = "test-model";
    options.frequencyPenalty = 0.5;
    options.logitBias = logitBias;
    options.logprobs = true;
    options.topLogprobs = 5;
    options.maxTokens = 100;
    options.maxCompletionTokens = 50;
    options.n = 2;
    options.outputModalities = outputModalities;
    options.outputAudio = outputAudio;
    options.presencePenalty = 0.8;
    options.responseFormat = responseFormat;
    options.streamOptions = { include_usage: true };
    options.seed = 12345;
    options.stop = stopSequences;
    options.temperature = 0.7;
    options.topP = 0.9;
    options.tools = tools;
    options.toolChoice = toolChoice;
    options.user = "test-user";
    options.parallelToolCalls = true;
    options.store = false;
    options.metadata = metadata;
    options.reasoningEffort = "high";
    options.internalToolExecutionEnabled = false;
    options.httpHeaders = { header2: "value2" };
    options.serviceTier = ServiceTier.DEFAULT;

    expect(options.model).toBe("test-model");
    expect(options.frequencyPenalty).toBe(0.5);
    expect(options.logitBias).toEqual(logitBias);
    expect(options.logprobs).toBe(true);
    expect(options.topLogprobs).toBe(5);
    expect(options.maxTokens).toBe(100);
    expect(options.maxCompletionTokens).toBe(50);
    expect(options.n).toBe(2);
    expect(options.outputModalities).toEqual(outputModalities);
    expect(options.outputAudio).toEqual(outputAudio);
    expect(options.presencePenalty).toBe(0.8);
    expect(options.responseFormat).toEqual(responseFormat);
    expect(options.streamOptions).toEqual({ include_usage: true });
    expect(options.seed).toBe(12345);
    expect(options.stop).toEqual(stopSequences);
    expect(options.temperature).toBe(0.7);
    expect(options.topP).toBe(0.9);
    expect(options.tools).toEqual(tools);
    expect(options.toolChoice).toBe(toolChoice);
    expect(options.user).toBe("test-user");
    expect(options.parallelToolCalls).toBe(true);
    expect(options.store).toBe(false);
    expect(options.metadata).toEqual(metadata);
    expect(options.reasoningEffort).toBe("high");
    expect(options.internalToolExecutionEnabled).toBe(false);
    expect(options.httpHeaders).toEqual({ header2: "value2" });
    expect(options.streamUsage).toBe(true);
    options.streamUsage = false;
    expect(options.streamUsage).toBe(false);
    expect(options.streamOptions).toBeUndefined();
    options.stopSequences = ["s1", "s2"];
    expect(options.stopSequences).toEqual(["s1", "s2"]);
    expect(options.stop).toEqual(["s1", "s2"]);
    expect(options.serviceTier).toBe("default");
  });

  it("test default values", () => {
    const options = new OpenAiChatOptions();
    expect(options.model).toBeUndefined();
    expect(options.frequencyPenalty).toBeUndefined();
    expect(options.logitBias).toBeUndefined();
    expect(options.logprobs).toBeUndefined();
    expect(options.topLogprobs).toBeUndefined();
    expect(options.maxTokens).toBeUndefined();
    expect(options.maxCompletionTokens).toBeUndefined();
    expect(options.n).toBeUndefined();
    expect(options.outputModalities).toBeUndefined();
    expect(options.outputAudio).toBeUndefined();
    expect(options.presencePenalty).toBeUndefined();
    expect(options.responseFormat).toBeUndefined();
    expect(options.outputSchema).toBe("");
    expect(options.streamOptions).toBeUndefined();
    expect(options.seed).toBeUndefined();
    expect(options.stop).toBeUndefined();
    expect(options.temperature).toBeUndefined();
    expect(options.topP).toBeUndefined();
    expect(options.tools).toBeUndefined();
    expect(options.toolChoice).toBeUndefined();
    expect(options.user).toBeUndefined();
    expect(options.parallelToolCalls).toBeUndefined();
    expect(options.store).toBeUndefined();
    expect(options.metadata).toBeUndefined();
    expect(options.reasoningEffort).toBeUndefined();
    expect(options.toolCallbacks).toEqual([]);
    expect(options.internalToolExecutionEnabled).toBeNull();
    expect(options.httpHeaders).toEqual({});
    expect(options.toolContext).toEqual({});
    expect(options.streamUsage).toBe(false);
    expect(options.stopSequences).toBeUndefined();
    expect(options.serviceTier).toBeUndefined();
  });

  it("test from options web search options", () => {
    const webSearchOptions: WebSearchOptions = {
      search_context_size: SearchContextSize.MEDIUM,
      user_location: {
        type: "type",
        approximate: {
          city: "beijing",
          country: "china",
          region: "region",
          timezone: "UTC+8",
        },
      },
    };

    const chatOptions = new OpenAiChatOptions({ webSearchOptions });
    const target = chatOptions.copy();

    expect(target.webSearchOptions).not.toBeUndefined();
    expect(target.webSearchOptions?.search_context_size).toBe(
      SearchContextSize.MEDIUM,
    );
    expect(target.webSearchOptions?.user_location).not.toBeUndefined();
    expect(target.webSearchOptions?.user_location?.type).toBe("type");
    expect(
      target.webSearchOptions?.user_location?.approximate,
    ).not.toBeUndefined();
    expect(target.webSearchOptions?.user_location?.approximate?.city).toBe(
      "beijing",
    );
    expect(target.webSearchOptions?.user_location?.approximate?.country).toBe(
      "china",
    );
    expect(target.webSearchOptions?.user_location?.approximate?.region).toBe(
      "region",
    );
    expect(target.webSearchOptions?.user_location?.approximate?.timezone).toBe(
      "UTC+8",
    );
  });

  it("test output schema setter preserves the original schema string", () => {
    const schema = `{
      "type": "object",
      "properties": {
        "name": {
          "type": "string"
        }
      }
    }`;

    const options = new OpenAiChatOptions();
    options.outputSchema = schema;

    expect(options.responseFormat).toEqual({
      type: "json_schema",
      json_schema: JSON.parse(schema),
    });
    expect(options.outputSchema).toBe(schema);
  });

  it("test output schema falls back to response format json schema", () => {
    const schema = {
      type: "object",
      properties: {
        name: {
          type: "string",
        },
      },
    };

    const options = new OpenAiChatOptions({
      responseFormat: {
        type: "json_schema",
        json_schema: schema,
      },
    });

    expect(options.outputSchema).toBe(JSON.stringify(schema));
  });

  it("test null and empty collections", () => {
    const options = new OpenAiChatOptions();

    // Test setting undefined (null equivalent)
    options.logitBias = undefined;
    options.stop = undefined;
    options.tools = undefined;
    options.metadata = undefined;
    options.outputModalities = undefined;

    expect(options.logitBias).toBeUndefined();
    expect(options.stop).toBeUndefined();
    expect(options.tools).toBeUndefined();
    expect(options.metadata).toBeUndefined();
    expect(options.outputModalities).toBeUndefined();

    // Test setting empty collections
    options.logitBias = {};
    options.stop = [];
    options.tools = [];
    options.metadata = {};
    options.outputModalities = [];

    expect(Object.keys(options.logitBias)).toHaveLength(0);
    expect(options.stop).toHaveLength(0);
    expect(options.tools).toHaveLength(0);
    expect(Object.keys(options.metadata)).toHaveLength(0);
    expect(options.outputModalities).toHaveLength(0);
  });

  it("test stream usage stream options interaction", () => {
    const options = new OpenAiChatOptions();

    // Initially false
    expect(options.streamUsage).toBe(false);
    expect(options.streamOptions).toBeUndefined();

    // Setting streamUsage to true should set streamOptions
    options.streamUsage = true;
    expect(options.streamUsage).toBe(true);
    expect(options.streamOptions).toEqual({ include_usage: true });

    // Setting streamUsage to false should clear streamOptions
    options.streamUsage = false;
    expect(options.streamUsage).toBe(false);
    expect(options.streamOptions).toBeUndefined();

    // Setting streamOptions directly should update streamUsage
    options.streamOptions = { include_usage: true };
    expect(options.streamUsage).toBe(true);
    expect(options.streamOptions).toEqual({ include_usage: true });

    // Setting streamOptions to undefined should set streamUsage to false
    options.streamOptions = undefined;
    expect(options.streamUsage).toBe(false);
    expect(options.streamOptions).toBeUndefined();
  });

  it("test stop sequences alias", () => {
    const options = new OpenAiChatOptions();
    const stopSequences = ["stop1", "stop2"];

    // Setting stopSequences should also set stop
    options.stopSequences = stopSequences;
    expect(options.stopSequences).toEqual(stopSequences);
    expect(options.stop).toEqual(stopSequences);

    // Setting stop should also update stopSequences
    const newStop = ["stop3", "stop4"];
    options.stop = newStop;
    expect(options.stop).toEqual(newStop);
    expect(options.stopSequences).toEqual(newStop);
  });

  it("test from options with web search options null", () => {
    const source = new OpenAiChatOptions({
      model: "test-model",
      temperature: 0.7,
    });

    const result = source.copy();
    expect(result.model).toBe("test-model");
    expect(result.temperature).toBe(0.7);
    expect(result.webSearchOptions).toBeUndefined();
  });

  it("test copy change independence", () => {
    const original = new OpenAiChatOptions({
      model: "original-model",
      temperature: 0.5,
    });

    const copied = original.copy();

    // Modify original
    original.model = "modified-model";
    original.temperature = 0.9;

    // Verify copy is unchanged
    expect(copied.model).toBe("original-model");
    expect(copied.temperature).toBe(0.5);
  });

  it("test setters mutual exclusivity not enforced", () => {
    // Direct property assignment does NOT enforce mutual exclusivity
    const options = new OpenAiChatOptions();
    options.maxTokens = 50;
    options.maxCompletionTokens = 100;

    // Both should be set when using direct assignment
    expect(options.maxTokens).toBe(50);
    expect(options.maxCompletionTokens).toBe(100);
  });

  it("test tool callback setter", () => {
    const options = new OpenAiChatOptions();
    const callbacks = [new TestToolCallback()];

    options.setToolCallbacks(callbacks);

    expect(options.toolCallbacks).toBe(callbacks);
    callbacks.push(new TestToolCallback());
    expect(options.toolCallbacks).toHaveLength(2);
    expect(() => {
      options.setToolCallbacks(null as unknown as ToolCallback[]);
    }).toThrow("toolCallbacks cannot be null");
    expect(() => {
      options.setToolCallbacks([
        new TestToolCallback(),
        null as unknown as ToolCallback,
      ]);
    }).toThrow("toolCallbacks cannot contain null elements");
  });

  it("test tool names setter", () => {
    const options = new OpenAiChatOptions();
    const toolNames = new Set(["tool1"]);

    options.setToolNames(toolNames);

    expect(options.toolNames).toBe(toolNames);
    toolNames.add("tool2");
    expect(options.toolNames.has("tool2")).toBe(true);
    expect(() => {
      options.setToolNames(null as unknown as Set<string>);
    }).toThrow("toolNames cannot be null");
    expect(() => {
      options.setToolNames(new Set(["tool1", null as unknown as string]));
    }).toThrow("toolNames cannot contain null elements");
    expect(() => {
      options.setToolNames(new Set(["", "tool1"]));
    }).toThrow("toolNames cannot contain empty elements");
  });

  it("test internal tool execution enabled setter", () => {
    const options = new OpenAiChatOptions();

    options.setInternalToolExecutionEnabled(true);
    expect(options.internalToolExecutionEnabled).toBe(true);
    options.setInternalToolExecutionEnabled(null);
    expect(options.internalToolExecutionEnabled).toBeNull();
  });

  it("test tool context setter", () => {
    const options = new OpenAiChatOptions();
    const toolContext = { key: "value" };

    options.setToolContext(toolContext);

    expect(options.toolContext).toBe(toolContext);
    toolContext.key = "updated";
    expect(options.toolContext.key).toBe("updated");
  });
});
