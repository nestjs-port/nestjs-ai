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
import { OpenAiSdkChatModel } from "../open-ai-sdk-chat-model";
import { OpenAiSdkChatOptions } from "../open-ai-sdk-chat-options";

class TestToolCallback extends ToolCallback {
  constructor(
    private readonly name: string,
    private readonly result: string,
  ) {
    super();
  }

  get toolDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: `${this.name} description`,
      inputSchema: "{}",
    };
  }

  async call(): Promise<string> {
    return this.result;
  }
}

describe("OpenAiSdkChatOptions", () => {
  it("test builder with all fields", () => {
    const logitBias = { token1: 1, token2: -1 };
    const stop = ["stop1", "stop2"];
    const metadata = { key1: "value1" };
    const toolContext = { keyA: "valueA" };
    const customHeaders = { header1: "value1" };
    const extraBody = { custom_flag: true };
    const responseFormat = OpenAiSdkChatModel.ResponseFormat.builder()
      .type(OpenAiSdkChatModel.ResponseFormat.Type.JSON_SCHEMA)
      .jsonSchema('{"type":"object"}')
      .build();

    const options = OpenAiSdkChatOptions.builder()
      .model("test-model")
      .deploymentName("test-deployment")
      .frequencyPenalty(0.5)
      .logitBias(logitBias)
      .logprobs(true)
      .topLogprobs(5)
      .maxTokens(100)
      .maxCompletionTokens(50)
      .N(2)
      .presencePenalty(0.8)
      .responseFormat(responseFormat)
      .streamOptions(
        OpenAiSdkChatOptions.StreamOptions.builder().includeUsage(true).build(),
      )
      .seed(12345)
      .stop(stop)
      .temperature(0.7)
      .topP(0.9)
      .toolChoice("auto")
      .user("test-user")
      .parallelToolCalls(true)
      .store(false)
      .metadata(metadata)
      .reasoningEffort("medium")
      .verbosity("low")
      .serviceTier("auto")
      .extraBody(extraBody)
      .internalToolExecutionEnabled(false)
      .customHeaders(customHeaders)
      .toolContext(toolContext)
      .build();

    expect(options.model).toBe("test-model");
    expect(options.deploymentName).toBe("test-deployment");
    expect(options.frequencyPenalty).toBe(0.5);
    expect(options.logitBias).toEqual(logitBias);
    expect(options.logprobs).toBe(true);
    expect(options.topLogprobs).toBe(5);
    expect(options.maxTokens).toBeNull();
    expect(options.maxCompletionTokens).toBe(50);
    expect(options.n).toBe(2);
    expect(options.presencePenalty).toBe(0.8);
    expect(options.streamOptions?.includeUsage).toBe(true);
    expect(options.seed).toBe(12345);
    expect(options.stop).toEqual(stop);
    expect(options.stopSequences).toEqual(stop);
    expect(options.temperature).toBe(0.7);
    expect(options.topP).toBe(0.9);
    expect(options.user).toBe("test-user");
    expect(options.parallelToolCalls).toBe(true);
    expect(options.store).toBe(false);
    expect(options.metadata).toEqual(metadata);
    expect(options.reasoningEffort).toBe("medium");
    expect(options.verbosity).toBe("low");
    expect(options.serviceTier).toBe("auto");
    expect(options.extraBody).toEqual(extraBody);
    expect(options.internalToolExecutionEnabled).toBe(false);
    expect(options.customHeaders).toEqual(customHeaders);
    expect(options.toolContext).toEqual(toolContext);
    expect(options.responseFormat).toEqual(responseFormat);
  });

  it("test copy", () => {
    const logitBias = { token1: 1 };
    const stop = ["stop1"];
    const metadata = { key1: "value1" };
    const extraBody = { custom_flag: true };

    const originalOptions = OpenAiSdkChatOptions.builder()
      .model("test-model")
      .deploymentName("test-deployment")
      .frequencyPenalty(0.5)
      .logitBias(logitBias)
      .logprobs(true)
      .topLogprobs(5)
      .maxCompletionTokens(50)
      .N(2)
      .presencePenalty(0.8)
      .streamOptions(
        OpenAiSdkChatOptions.StreamOptions.builder()
          .includeUsage(false)
          .build(),
      )
      .seed(12345)
      .stop(stop)
      .temperature(0.7)
      .topP(0.9)
      .user("test-user")
      .parallelToolCalls(false)
      .store(true)
      .metadata(metadata)
      .reasoningEffort("low")
      .verbosity("high")
      .serviceTier("default")
      .extraBody(extraBody)
      .internalToolExecutionEnabled(true)
      .customHeaders({ header1: "value1" })
      .build();

    const copiedOptions = originalOptions.copy();

    expect(copiedOptions).not.toBe(originalOptions);
    expect(copiedOptions).toEqual(originalOptions);

    originalOptions.model = "modified-model";
    originalOptions.setStop(["stop2"]);
    originalOptions.customHeaders = { header2: "value2" };
    originalOptions.setToolCallbacks([new TestToolCallback("tool", "result")]);
    originalOptions.setToolNames(new Set(["tool2"]));
    originalOptions.setToolContext({ key: "value2" });
    originalOptions.setExtraBody({ custom_flag: false });

    expect(copiedOptions.model).toBe("test-model");
    expect(copiedOptions.stop).toEqual(stop);
    expect(copiedOptions.customHeaders).toEqual({ header1: "value1" });
    expect(copiedOptions.extraBody).toEqual(extraBody);
    expect(copiedOptions.toolCallbacks).toEqual([]);
    expect(copiedOptions.toolNames).toEqual(new Set<string>());
    expect(copiedOptions.toolContext).toEqual({});
  });

  it("test setters", () => {
    const logitBias = { token1: 1 };
    const stop = ["stop1", "stop2"];
    const metadata = { key2: "value2" };

    const options = new OpenAiSdkChatOptions();
    options.model = "test-model";
    options.deploymentName = "test-deployment";
    options.setFrequencyPenalty(0.5);
    options.setLogitBias(logitBias);
    options.setLogprobs(true);
    options.setTopLogprobs(5);
    options.setMaxTokens(100);
    options.setMaxCompletionTokens(50);
    options.setN(2);
    options.setPresencePenalty(0.8);
    options.setStreamOptions(
      OpenAiSdkChatOptions.StreamOptions.builder().includeUsage(true).build(),
    );
    options.setSeed(12345);
    options.setStop(stop);
    options.setTemperature(0.7);
    options.setTopP(0.9);
    options.setUser("test-user");
    options.setParallelToolCalls(true);
    options.setStore(false);
    options.setMetadata(metadata);
    options.setReasoningEffort("high");
    options.setVerbosity("medium");
    options.setServiceTier("auto");
    options.setExtraBody({});
    options.setInternalToolExecutionEnabled(false);
    options.customHeaders = { header2: "value2" };

    expect(options.model).toBe("test-model");
    expect(options.deploymentName).toBe("test-deployment");
    expect(options.frequencyPenalty).toBe(0.5);
    expect(options.logitBias).toEqual(logitBias);
    expect(options.logprobs).toBe(true);
    expect(options.topLogprobs).toBe(5);
    expect(options.maxTokens).toBe(100);
    expect(options.maxCompletionTokens).toBe(50);
    expect(options.n).toBe(2);
    expect(options.presencePenalty).toBe(0.8);
    expect(options.streamOptions?.includeUsage).toBe(true);
    expect(options.seed).toBe(12345);
    expect(options.stop).toEqual(stop);
    expect(options.stopSequences).toEqual(stop);
    expect(options.temperature).toBe(0.7);
    expect(options.topP).toBe(0.9);
    expect(options.user).toBe("test-user");
    expect(options.parallelToolCalls).toBe(true);
    expect(options.store).toBe(false);
    expect(options.metadata).toEqual(metadata);
    expect(options.reasoningEffort).toBe("high");
    expect(options.verbosity).toBe("medium");
    expect(options.serviceTier).toBe("auto");
    expect(options.extraBody).toEqual({});
    expect(options.internalToolExecutionEnabled).toBe(false);
    expect(options.customHeaders).toEqual({ header2: "value2" });
  });

  it("test default values", () => {
    const options = new OpenAiSdkChatOptions();

    expect(options.model).toBeNull();
    expect(options.deploymentName).toBeNull();
    expect(options.frequencyPenalty).toBeNull();
    expect(options.logitBias).toBeNull();
    expect(options.logprobs).toBeNull();
    expect(options.topLogprobs).toBeNull();
    expect(options.maxTokens).toBeNull();
    expect(options.maxCompletionTokens).toBeNull();
    expect(options.n).toBeNull();
    expect(options.outputAudio).toBeNull();
    expect(options.presencePenalty).toBeNull();
    expect(options.responseFormat).toBeNull();
    expect(options.streamOptions).toBeNull();
    expect(options.seed).toBeNull();
    expect(options.stop).toBeNull();
    expect(options.stopSequences).toBeNull();
    expect(options.temperature).toBeNull();
    expect(options.topP).toBeNull();
    expect(options.topK).toBeNull();
    expect(options.toolChoice).toBeNull();
    expect(options.user).toBeNull();
    expect(options.parallelToolCalls).toBeNull();
    expect(options.store).toBeNull();
    expect(options.metadata).toBeNull();
    expect(options.reasoningEffort).toBeNull();
    expect(options.verbosity).toBeNull();
    expect(options.serviceTier).toBeNull();
    expect(options.extraBody).toBeNull();
    expect(options.toolCallbacks).toEqual([]);
    expect(options.toolNames).toEqual(new Set<string>());
    expect(options.internalToolExecutionEnabled).toBeNull();
    expect(options.customHeaders).toEqual({});
    expect(options.toolContext).toEqual({});
    expect(options.outputSchema).toBeNull();
  });

  it("test builder with null values", () => {
    const options = OpenAiSdkChatOptions.builder()
      .temperature(null)
      .logitBias(null)
      .stop(null)
      .metadata(null)
      .extraBody(null)
      .build();

    expect(options.model).toBeNull();
    expect(options.temperature).toBeNull();
    expect(options.logitBias).toBeNull();
    expect(options.stop).toBeNull();
    expect(options.metadata).toBeNull();
    expect(options.extraBody).toBeNull();
  });

  it("test builder chaining", () => {
    const builder = OpenAiSdkChatOptions.builder();
    const result = builder.model("test-model").temperature(0.7).maxTokens(100);

    expect(result).toBe(builder);

    const options = result.build();
    expect(options.model).toBe("test-model");
    expect(options.temperature).toBe(0.7);
    expect(options.maxTokens).toBe(100);
  });

  it("test null and empty collections", () => {
    const options = new OpenAiSdkChatOptions();

    options.setLogitBias(null);
    options.setStop(null);
    options.setMetadata(null);
    options.customHeaders = null;

    expect(options.logitBias).toBeNull();
    expect(options.stop).toBeNull();
    expect(options.metadata).toBeNull();
    expect(options.customHeaders).toEqual({});

    options.setLogitBias({});
    options.setStop([]);
    options.setMetadata({});
    options.customHeaders = {};

    expect(options.logitBias).toEqual({});
    expect(options.stop).toEqual([]);
    expect(options.metadata).toEqual({});
    expect(options.customHeaders).toEqual({});
  });

  it("test stop sequences alias", () => {
    const options = new OpenAiSdkChatOptions();
    const stopSequences = ["stop1", "stop2"];

    options.setStopSequences(stopSequences);
    expect(options.stopSequences).toEqual(stopSequences);
    expect(options.stop).toEqual(stopSequences);

    const newStop = ["stop3", "stop4"];
    options.setStop(newStop);
    expect(options.stop).toEqual(newStop);
    expect(options.stopSequences).toEqual(newStop);
  });

  it("test copy change independence", () => {
    const original = OpenAiSdkChatOptions.builder()
      .model("original-model")
      .temperature(0.5)
      .build();

    const copied = original.copy();

    original.model = "modified-model";
    original.setTemperature(0.9);

    expect(copied.model).toBe("original-model");
    expect(copied.temperature).toBe(0.5);
  });

  it("test maxTokens is deprecated", () => {
    const options = OpenAiSdkChatOptions.builder()
      .maxCompletionTokens(100)
      .maxTokens(50)
      .build();

    expect(options.maxTokens).toBeNull();
    expect(options.maxCompletionTokens).toBe(100);
  });

  it("test maxCompletionTokens mutual exclusivity validation", () => {
    const options = OpenAiSdkChatOptions.builder()
      .maxTokens(50)
      .maxCompletionTokens(100)
      .build();

    expect(options.maxTokens).toBeNull();
    expect(options.maxCompletionTokens).toBe(100);
  });

  it("test maxTokens with null does not clear maxCompletionTokens", () => {
    const options = OpenAiSdkChatOptions.builder()
      .maxCompletionTokens(100)
      .maxTokens(null)
      .build();

    expect(options.maxTokens).toBeNull();
    expect(options.maxCompletionTokens).toBe(100);
  });

  it("test maxCompletionTokens with null does not clear maxTokens", () => {
    const options = OpenAiSdkChatOptions.builder()
      .maxTokens(50)
      .maxCompletionTokens(null)
      .build();

    expect(options.maxTokens).toBe(50);
    expect(options.maxCompletionTokens).toBeNull();
  });

  it("test builder can set only maxTokens", () => {
    const options = OpenAiSdkChatOptions.builder().maxTokens(100).build();

    expect(options.maxTokens).toBe(100);
    expect(options.maxCompletionTokens).toBeNull();
  });

  it("test builder can set only maxCompletionTokens", () => {
    const options = OpenAiSdkChatOptions.builder()
      .maxCompletionTokens(150)
      .build();

    expect(options.maxTokens).toBeNull();
    expect(options.maxCompletionTokens).toBe(150);
  });

  it("test setters mutual exclusivity not enforced", () => {
    const options = new OpenAiSdkChatOptions();
    options.setMaxTokens(50);
    options.setMaxCompletionTokens(100);

    expect(options.maxTokens).toBe(50);
    expect(options.maxCompletionTokens).toBe(100);
  });

  it("test tool callbacks and names", () => {
    const callback1 = new TestToolCallback("tool1", "result1");
    const callback2 = new TestToolCallback("tool2", "result2");

    const options = OpenAiSdkChatOptions.builder()
      .toolCallbacks(callback1, callback2)
      .toolNames("tool1", "tool2")
      .build();

    expect(options.toolCallbacks).toHaveLength(2);
    expect(options.toolCallbacks[0]).toBe(callback1);
    expect(options.toolCallbacks[1]).toBe(callback2);
    expect(options.toolNames).toEqual(new Set(["tool1", "tool2"]));
  });

  it("test toolCallbacks list", () => {
    const callback = new TestToolCallback("tool", "result");
    const callbacks = [callback];

    const options = OpenAiSdkChatOptions.builder()
      .toolCallbacks(callbacks)
      .build();

    expect(options.toolCallbacks).toHaveLength(1);
    expect(options.toolCallbacks[0]).toBe(callback);
  });

  it("test toolNames set", () => {
    const toolNames = new Set(["tool1", "tool2", "tool3"]);

    const options = OpenAiSdkChatOptions.builder().toolNames(toolNames).build();

    expect(options.toolNames).toEqual(toolNames);
  });

  it("test setToolCallbacks validation", () => {
    const options = new OpenAiSdkChatOptions();

    expect(() =>
      options.setToolCallbacks(null as unknown as ToolCallback[]),
    ).toThrow("toolCallbacks cannot be null");
    expect(() =>
      options.setToolCallbacks([null as unknown as ToolCallback]),
    ).toThrow("toolCallbacks cannot contain null elements");
  });

  it("test setToolNames validation", () => {
    const options = new OpenAiSdkChatOptions();

    expect(() => options.setToolNames(null as unknown as Set<string>)).toThrow(
      "toolNames cannot be null",
    );
    expect(() =>
      options.setToolNames(new Set([null as unknown as string])),
    ).toThrow("toolNames cannot contain null elements");
    expect(() => options.setToolNames(new Set([""]))).toThrow(
      "toolNames cannot contain empty elements",
    );
    expect(() => options.setToolNames(new Set(["   "]))).toThrow(
      "toolNames cannot contain empty elements",
    );
  });

  it("test copy", () => {
    const logitBias = { token: 1 };
    const stop = ["stop"];
    const metadata = { key: "value" };

    const source = OpenAiSdkChatOptions.builder()
      .model("source-model")
      .temperature(0.7)
      .maxTokens(100)
      .logitBias(logitBias)
      .stop(stop)
      .metadata(metadata)
      .build();

    const copy = source.copy();

    expect(copy.model).toBe("source-model");
    expect(copy.temperature).toBe(0.7);
    expect(copy.maxTokens).toBe(100);
    expect(copy.logitBias).toEqual(logitBias);
    expect(copy.stop).toEqual(stop);
    expect(copy.metadata).toEqual(metadata);
    expect(copy.stop).not.toBe(source.stop);
  });

  it("test mutate", () => {
    const options = OpenAiSdkChatOptions.builder()
      .model("source-model")
      .temperature(0.7)
      .maxTokens(100)
      .build();

    const mutated = options.mutate().topP(0.9).build();

    expect(mutated.model).toBe("source-model");
    expect(mutated.temperature).toBe(0.7);
    expect(mutated.maxTokens).toBe(100);
    expect(mutated.topP).toBe(0.9);
  });

  it("test builder combineWith", () => {
    const callback = new TestToolCallback("tool", "result");

    const base = OpenAiSdkChatOptions.builder()
      .model("base-model")
      .temperature(0.5)
      .toolCallbacks(callback)
      .customHeaders({ base: "header" });

    const override = OpenAiSdkChatOptions.builder()
      .deploymentName("override-deployment")
      .topP(0.9)
      .toolContext({ key: "value" })
      .customHeaders({ override: "header" });

    const combined = base.combineWith(override).build();

    expect(combined.model).toBe("base-model");
    expect(combined.deploymentName).toBe("override-deployment");
    expect(combined.temperature).toBe(0.5);
    expect(combined.topP).toBe(0.9);
    expect(combined.toolCallbacks).toHaveLength(1);
    expect(combined.toolCallbacks[0]).toBe(callback);
    expect(combined.toolContext).toEqual({ key: "value" });
    expect(combined.customHeaders).toEqual({ override: "header" });
  });

  it("test toString", () => {
    const options = OpenAiSdkChatOptions.builder()
      .model("test-model")
      .temperature(0.7)
      .build();

    const text = options.toString();
    expect(text).toContain("OpenAiSdkChatOptions");
    expect(text).toContain("test-model");
    expect(text).toContain("0.7");
  });

  it("test topK returns null", () => {
    const options = new OpenAiSdkChatOptions();
    expect(options.topK).toBeNull();
  });

  it("test set output schema", () => {
    const options = new OpenAiSdkChatOptions();
    const schema = `{
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    }
  }
}`;

    options.setOutputSchema(schema);

    expect(options.responseFormat).not.toBeNull();
    expect(options.responseFormat?.type).toBe(
      OpenAiSdkChatModel.ResponseFormat.Type.JSON_SCHEMA,
    );
    expect(options.responseFormat?.jsonSchema).toBe(schema);
    expect(options.outputSchema).toBe(schema);

    options.setOutputSchema(null);
    expect(options.responseFormat).toBeNull();
    expect(options.outputSchema).toBeNull();
  });
});
