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

import type { GoogleGenAI } from "@google/genai";
import { Media, MediaFormat } from "@nestjs-ai/commons";
import {
  FunctionToolCallback,
  Prompt,
  SystemMessage,
  UserMessage,
} from "@nestjs-ai/model";
import { describe, expect, it } from "vitest";
import { GoogleGenAiThinkingLevel } from "../common/index.js";
import { GoogleGenAiChatModel } from "../google-gen-ai-chat-model.js";
import { GoogleGenAiChatOptions } from "../google-gen-ai-chat-options.js";

function createModel(
  defaultOptions?: GoogleGenAiChatOptions,
): GoogleGenAiChatModel {
  const genAiClient = {
    caches: {},
    models: {},
  } as GoogleGenAI;

  return new GoogleGenAiChatModel({
    genAiClient,
    defaultOptions:
      defaultOptions ??
      new GoogleGenAiChatOptions({
        model: GoogleGenAiChatModel.ChatModel.GEMINI_2_0_FLASH,
      }),
  });
}

function createWeatherToolCallback() {
  return FunctionToolCallback.builder(
    "CurrentWeather",
    (input: { location: string }) => `Weather for ${input.location}`,
  )
    .description("Get the weather in location")
    .inputType({
      toJSONSchema: () => ({
        type: "object",
        properties: {
          location: { type: "string" },
        },
        required: ["location"],
      }),
    } as never)
    .build();
}

type TestRequestContent = {
  parts: Array<{
    text?: string;
    fileData?: {
      fileUri?: string;
      mimeType?: string;
    };
  }>;
};

type TestRequestTool = {
  functionDeclarations?: Array<{
    name?: string;
    description?: string;
  }>;
};

type TestSystemInstruction = {
  parts?: Array<{
    text?: string;
  }>;
};

describe("GoogleGenAiChatModel", () => {
  it("create request with chat options", () => {
    const model = createModel(
      new GoogleGenAiChatOptions({
        model: "DEFAULT_MODEL",
        temperature: 66.6,
      }),
    );

    let request = model.createGeminiRequest(
      model.buildRequestPrompt(
        new Prompt("Test message content", model.defaultOptions.copy()),
      ),
    );

    expect(request.contents).toHaveLength(1);
    expect(request.config.systemInstruction).toBeUndefined();
    expect(request.modelName).toBe("DEFAULT_MODEL");
    expect(request.config.temperature).toBe(66.6);

    request = model.createGeminiRequest(
      model.buildRequestPrompt(
        new Prompt(
          "Test message content",
          new GoogleGenAiChatOptions({
            model: "PROMPT_MODEL",
            temperature: 99.9,
          }),
        ),
      ),
    );

    expect(request.contents).toHaveLength(1);
    expect(request.config.systemInstruction).toBeUndefined();
    expect(request.modelName).toBe("PROMPT_MODEL");
    expect(request.config.temperature).toBe(99.9);
  });

  it("create request with frequency and presence penalty", () => {
    const model = createModel(
      new GoogleGenAiChatOptions({
        model: "DEFAULT_MODEL",
        frequencyPenalty: 0.25,
        presencePenalty: 0.75,
      }),
    );

    const request = model.createGeminiRequest(
      model.buildRequestPrompt(new Prompt("Test message content")),
    );

    expect(request.contents).toHaveLength(1);
    expect(request.config.frequencyPenalty).toBe(0.25);
    expect(request.config.presencePenalty).toBe(0.75);
  });

  it("create request with system message", () => {
    const model = createModel(
      new GoogleGenAiChatOptions({
        model: "DEFAULT_MODEL",
        temperature: 66.6,
      }),
    );

    const request = model.createGeminiRequest(
      model.buildRequestPrompt(
        new Prompt([
          SystemMessage.of("System Message Text"),
          new UserMessage({
            content: "User Message Text",
            media: [
              new Media({
                mimeType: MediaFormat.IMAGE_PNG,
                data: "http://example.com",
              }),
            ],
          }),
        ]),
      ),
    );

    expect(request.modelName).toBe("DEFAULT_MODEL");
    expect(request.config.temperature).toBe(66.6);
    const systemInstruction = request.config
      .systemInstruction as TestSystemInstruction;
    expect(systemInstruction.parts?.[0]?.text).toBe("System Message Text");
    expect(request.contents).toHaveLength(1);
    const content = request.contents[0] as TestRequestContent;
    expect(content.parts).toHaveLength(2);
    expect(content.parts?.[0]?.text).toBe("User Message Text");
    expect(content.parts?.[1]?.fileData?.fileUri).toBe("http://example.com");
    expect(content.parts?.[1]?.fileData?.mimeType).toBe(MediaFormat.IMAGE_PNG);
  });

  it("prompt options tools", () => {
    const model = createModel(
      new GoogleGenAiChatOptions({
        model: "DEFAULT_MODEL",
      }),
    );

    const promptOptions = new GoogleGenAiChatOptions({
      model: "PROMPT_MODEL",
      toolCallbacks: [createWeatherToolCallback()],
    });

    const requestPrompt = model.buildRequestPrompt(
      new Prompt("Test message content", promptOptions),
    );

    const request = model.createGeminiRequest(requestPrompt);

    expect(request.contents).toHaveLength(1);
    expect(request.config.systemInstruction).toBeUndefined();
    expect(request.modelName).toBe("PROMPT_MODEL");
    const tools = request.config.tools as TestRequestTool[];
    expect(tools).toHaveLength(1);
    expect(tools?.[0].functionDeclarations?.[0].name).toBe("CurrentWeather");
  });

  it("default options tools", () => {
    const tool = createWeatherToolCallback();
    const model = createModel(
      new GoogleGenAiChatOptions({
        model: "DEFAULT_MODEL",
        toolCallbacks: [tool],
      }),
    );

    let requestPrompt = model.buildRequestPrompt(
      new Prompt("Test message content"),
    );
    let request = model.createGeminiRequest(requestPrompt);

    expect(request.contents).toHaveLength(1);
    expect(request.config.systemInstruction).toBeUndefined();
    expect(request.modelName).toBe("DEFAULT_MODEL");
    const tools = request.config.tools as TestRequestTool[];
    expect(tools).toHaveLength(1);
    expect(tools?.[0].functionDeclarations).toHaveLength(1);
    expect(tools?.[0].functionDeclarations?.[0].name).toBe("CurrentWeather");

    const promptOptions = model.defaultOptions.copy() as GoogleGenAiChatOptions;
    promptOptions.toolNames = new Set(["CurrentWeather"]);

    requestPrompt = model.buildRequestPrompt(
      new Prompt("Test message content", promptOptions),
    );
    request = model.createGeminiRequest(requestPrompt);

    expect(request.config.tools).toHaveLength(1);
    expect(
      (request.config.tools as TestRequestTool[])?.[0].functionDeclarations?.[0]
        .name,
    ).toBe("CurrentWeather");

    requestPrompt = model.buildRequestPrompt(
      new Prompt(
        "Test message content",
        new GoogleGenAiChatOptions({
          toolCallbacks: [
            FunctionToolCallback.builder(
              "CurrentWeather",
              (input: { location: string }) => `Weather for ${input.location}`,
            )
              .description("Overridden function description")
              .inputType({
                toJSONSchema: () => ({
                  type: "object",
                  properties: {
                    location: { type: "string" },
                  },
                  required: ["location"],
                }),
              } as never)
              .build(),
          ],
        }),
      ),
    );
    request = model.createGeminiRequest(requestPrompt);

    expect(request.config.tools).toHaveLength(1);
    expect(
      (request.config.tools as TestRequestTool[])?.[0].functionDeclarations?.[0]
        .description,
    ).toBe("Overridden function description");
  });

  it("create request with generation config options", () => {
    const model = createModel(
      new GoogleGenAiChatOptions({
        model: "DEFAULT_MODEL",
        temperature: 66.6,
        maxOutputTokens: 100,
        topK: 10,
        topP: 5.0,
        stopSequences: ["stop1", "stop2"],
        candidateCount: 1,
        responseMimeType: "application/json",
      }),
    );

    const request = model.createGeminiRequest(
      model.buildRequestPrompt(new Prompt("Test message content")),
    );

    expect(request.contents).toHaveLength(1);
    expect(request.config.systemInstruction).toBeUndefined();
    expect(request.modelName).toBe("DEFAULT_MODEL");
    expect(request.config.temperature).toBe(66.6);
    expect(request.config.maxOutputTokens).toBe(100);
    expect(request.config.topK).toBe(10);
    expect(request.config.topP).toBe(5);
    expect(request.config.candidateCount).toBe(1);
    expect(request.config.stopSequences).toEqual(["stop1", "stop2"]);
    expect(request.config.responseMimeType).toBe("application/json");
  });

  it("create request with thinking budget", () => {
    const model = createModel(
      new GoogleGenAiChatOptions({
        model: "DEFAULT_MODEL",
        thinkingBudget: 12853,
      }),
    );

    const request = model.createGeminiRequest(
      model.buildRequestPrompt(new Prompt("Test message content")),
    );

    expect(request.contents).toHaveLength(1);
    expect(request.modelName).toBe("DEFAULT_MODEL");
    expect(request.config.thinkingConfig?.thinkingBudget).toBe(12853);
  });

  it("create request with thinking budget override", () => {
    const model = createModel(
      new GoogleGenAiChatOptions({
        model: "DEFAULT_MODEL",
        thinkingBudget: 10000,
      }),
    );

    const request = model.createGeminiRequest(
      model.buildRequestPrompt(
        new Prompt(
          "Test message content",
          new GoogleGenAiChatOptions({ thinkingBudget: 25000 }),
        ),
      ),
    );

    expect(request.contents).toHaveLength(1);
    expect(request.modelName).toBe("DEFAULT_MODEL");
    expect(request.config.thinkingConfig?.thinkingBudget).toBe(25000);
  });

  it("create request with null thinking budget", () => {
    const model = createModel(
      new GoogleGenAiChatOptions({
        model: "DEFAULT_MODEL",
        thinkingBudget: null as unknown as number,
      }),
    );

    const request = model.createGeminiRequest(
      model.buildRequestPrompt(new Prompt("Test message content")),
    );

    expect(request.contents).toHaveLength(1);
    expect(request.modelName).toBe("DEFAULT_MODEL");
    expect(request.config.thinkingConfig).toBeUndefined();
  });

  it("create request with zero thinking budget", () => {
    const model = createModel(
      new GoogleGenAiChatOptions({
        model: "DEFAULT_MODEL",
        thinkingBudget: 0,
      }),
    );

    const request = model.createGeminiRequest(
      model.buildRequestPrompt(new Prompt("Test message content")),
    );

    expect(request.config.thinkingConfig?.thinkingBudget).toBe(0);
  });

  it("create request with no messages", () => {
    const model = createModel(
      new GoogleGenAiChatOptions({
        model: "DEFAULT_MODEL",
      }),
    );

    const request = model.createGeminiRequest(
      model.buildRequestPrompt(new Prompt([])),
    );

    expect(request.contents).toEqual([]);
  });

  it("create request with only system message", () => {
    const model = createModel(
      new GoogleGenAiChatOptions({
        model: "DEFAULT_MODEL",
      }),
    );

    const request = model.createGeminiRequest(
      model.buildRequestPrompt(
        new Prompt([SystemMessage.of("System Message Only")]),
      ),
    );

    expect(request.config.systemInstruction).toBeDefined();
    expect(request.contents).toEqual([]);
  });

  it("create request with labels", () => {
    const model = createModel(
      new GoogleGenAiChatOptions({
        model: "DEFAULT_MODEL",
        labels: { org: "my-org", env: "test" },
      }),
    );

    const request = model.createGeminiRequest(
      model.buildRequestPrompt(new Prompt("Test message content")),
    );

    expect(request.config.labels).toEqual({ org: "my-org", env: "test" });
  });

  it("create request with thinking level", () => {
    const model = createModel(
      new GoogleGenAiChatOptions({
        model: "DEFAULT_MODEL",
        thinkingLevel: GoogleGenAiThinkingLevel.HIGH,
      }),
    );

    const request = model.createGeminiRequest(
      model.buildRequestPrompt(new Prompt("Test message content")),
    );

    expect(request.contents).toHaveLength(1);
    expect(request.modelName).toBe("DEFAULT_MODEL");
    expect(request.config.thinkingConfig?.thinkingLevel).toBe(
      GoogleGenAiThinkingLevel.HIGH,
    );
  });

  it("create request with thinking level override", () => {
    const model = createModel(
      new GoogleGenAiChatOptions({
        model: "DEFAULT_MODEL",
        thinkingLevel: GoogleGenAiThinkingLevel.LOW,
      }),
    );

    const request = model.createGeminiRequest(
      model.buildRequestPrompt(
        new Prompt(
          "Test message content",
          new GoogleGenAiChatOptions({
            thinkingLevel: GoogleGenAiThinkingLevel.HIGH,
          }),
        ),
      ),
    );

    expect(request.config.thinkingConfig?.thinkingLevel).toBe(
      GoogleGenAiThinkingLevel.HIGH,
    );
  });

  it("create request with thinking level and budget combined", () => {
    const model = createModel(
      new GoogleGenAiChatOptions({
        model: "DEFAULT_MODEL",
        thinkingBudget: 8192,
        thinkingLevel: GoogleGenAiThinkingLevel.HIGH,
        includeThoughts: true,
      }),
    );

    const request = model.createGeminiRequest(
      model.buildRequestPrompt(new Prompt("Test message content")),
    );

    expect(request.config.thinkingConfig?.thinkingBudget).toBe(8192);
    expect(request.config.thinkingConfig?.thinkingLevel).toBe(
      GoogleGenAiThinkingLevel.HIGH,
    );
    expect(request.config.thinkingConfig?.includeThoughts).toBe(true);
  });

  it("create request with null thinking level", () => {
    const model = createModel(
      new GoogleGenAiChatOptions({
        model: "DEFAULT_MODEL",
        thinkingLevel: null as unknown as never,
      }),
    );

    const request = model.createGeminiRequest(
      model.buildRequestPrompt(new Prompt("Test message content")),
    );

    expect(request.config.thinkingConfig).toBeUndefined();
  });

  it("create request with only thinking level", () => {
    const model = createModel(
      new GoogleGenAiChatOptions({
        model: "DEFAULT_MODEL",
        thinkingLevel: GoogleGenAiThinkingLevel.LOW,
      }),
    );

    const request = model.createGeminiRequest(
      model.buildRequestPrompt(new Prompt("Test message content")),
    );

    expect(request.config.thinkingConfig?.thinkingLevel).toBe(
      GoogleGenAiThinkingLevel.LOW,
    );
    expect(request.config.thinkingConfig?.thinkingBudget).toBeUndefined();
  });

  it("create request with thinking level minimal", () => {
    const model = createModel(
      new GoogleGenAiChatOptions({
        model: "gemini-3-flash-preview",
        thinkingLevel: GoogleGenAiThinkingLevel.MINIMAL,
      }),
    );

    const request = model.createGeminiRequest(
      model.buildRequestPrompt(new Prompt("Test message content")),
    );

    expect(request.config.thinkingConfig?.thinkingLevel).toBe(
      GoogleGenAiThinkingLevel.MINIMAL,
    );
  });

  it("create request with thinking level medium", () => {
    const model = createModel(
      new GoogleGenAiChatOptions({
        model: "gemini-3-flash-preview",
        thinkingLevel: GoogleGenAiThinkingLevel.MEDIUM,
      }),
    );

    const request = model.createGeminiRequest(
      model.buildRequestPrompt(new Prompt("Test message content")),
    );

    expect(request.config.thinkingConfig?.thinkingLevel).toBe(
      GoogleGenAiThinkingLevel.MEDIUM,
    );
  });

  it("create request with thinking level minimal on pro model throws", () => {
    const model = createModel(
      new GoogleGenAiChatOptions({
        model: "gemini-3.1-pro-preview",
        thinkingLevel: GoogleGenAiThinkingLevel.MINIMAL,
      }),
    );

    expect(() =>
      model.createGeminiRequest(
        model.buildRequestPrompt(new Prompt("Test message content")),
      ),
    ).toThrow(/MINIMAL.*Gemini 3 Pro/);
  });

  it("create request with thinking level medium on pro model throws", () => {
    const model = createModel(
      new GoogleGenAiChatOptions({
        model: "gemini-3.1-pro-preview",
        thinkingLevel: GoogleGenAiThinkingLevel.MEDIUM,
      }),
    );

    expect(() =>
      model.createGeminiRequest(
        model.buildRequestPrompt(new Prompt("Test message content")),
      ),
    ).toThrow(/MEDIUM.*Gemini 3 Pro/);
  });

  it("create request with thinking level low on pro model", () => {
    const model = createModel(
      new GoogleGenAiChatOptions({
        model: "gemini-3.1-pro-preview",
        thinkingLevel: GoogleGenAiThinkingLevel.LOW,
      }),
    );

    const request = model.createGeminiRequest(
      model.buildRequestPrompt(new Prompt("Test message content")),
    );

    expect(request.config.thinkingConfig?.thinkingLevel).toBe(
      GoogleGenAiThinkingLevel.LOW,
    );
  });

  it("create request with thinking level high on pro model", () => {
    const model = createModel(
      new GoogleGenAiChatOptions({
        model: "gemini-3.1-pro-preview",
        thinkingLevel: GoogleGenAiThinkingLevel.HIGH,
      }),
    );

    const request = model.createGeminiRequest(
      model.buildRequestPrompt(new Prompt("Test message content")),
    );

    expect(request.config.thinkingConfig?.thinkingLevel).toBe(
      GoogleGenAiThinkingLevel.HIGH,
    );
  });

  it("create request with all thinking levels on flash model", () => {
    for (const level of [
      GoogleGenAiThinkingLevel.MINIMAL,
      GoogleGenAiThinkingLevel.LOW,
      GoogleGenAiThinkingLevel.MEDIUM,
      GoogleGenAiThinkingLevel.HIGH,
    ] as const) {
      const model = createModel(
        new GoogleGenAiChatOptions({
          model: "gemini-3-flash-preview",
          thinkingLevel: level,
        }),
      );

      const request = model.createGeminiRequest(
        model.buildRequestPrompt(new Prompt("Test message content")),
      );

      expect(request.config.thinkingConfig?.thinkingLevel).toBe(level);
    }
  });

  it("create request with runtime thinking level override on pro model throws", () => {
    const model = createModel(
      new GoogleGenAiChatOptions({
        model: "gemini-3.1-pro-preview",
        thinkingLevel: GoogleGenAiThinkingLevel.LOW,
      }),
    );

    expect(() =>
      model.createGeminiRequest(
        model.buildRequestPrompt(
          new Prompt(
            "Test message content",
            new GoogleGenAiChatOptions({
              thinkingLevel: GoogleGenAiThinkingLevel.MINIMAL,
            }),
          ),
        ),
      ),
    ).toThrow(/MINIMAL.*Gemini 3 Pro/);
  });

  it("create request with thinking level unspecified on pro model", () => {
    const model = createModel(
      new GoogleGenAiChatOptions({
        model: "gemini-3.1-pro-preview",
        thinkingLevel: GoogleGenAiThinkingLevel.THINKING_LEVEL_UNSPECIFIED,
      }),
    );

    const request = model.createGeminiRequest(
      model.buildRequestPrompt(new Prompt("Test message content")),
    );

    expect(request.config.thinkingConfig?.thinkingLevel).toBeDefined();
  });

  it("create request with pro model in custom path", () => {
    const model = createModel(
      new GoogleGenAiChatOptions({
        model:
          "projects/my-project/locations/us-central1/publishers/google/models/gemini-3.1-pro-preview",
        thinkingLevel: GoogleGenAiThinkingLevel.MINIMAL,
      }),
    );

    expect(() =>
      model.createGeminiRequest(
        model.buildRequestPrompt(new Prompt("Test message content")),
      ),
    ).toThrow(/MINIMAL.*Gemini 3 Pro/);
  });

  it("create request with include server side tool invocations enabled", () => {
    const model = createModel();

    const request = model.createGeminiRequest(
      model.buildRequestPrompt(
        new Prompt(
          "Test message content",
          new GoogleGenAiChatOptions({
            googleSearchRetrieval: true,
            includeServerSideToolInvocations: true,
          }),
        ),
      ),
    );

    expect(request.config.toolConfig?.includeServerSideToolInvocations).toBe(
      true,
    );
    expect(request.config.tools).toHaveLength(1);
  });

  it("create request with include server side tool invocations disabled", () => {
    const model = createModel();

    const request = model.createGeminiRequest(
      model.buildRequestPrompt(
        new Prompt(
          "Test message content",
          new GoogleGenAiChatOptions({
            googleSearchRetrieval: true,
            includeServerSideToolInvocations: false,
          }),
        ),
      ),
    );

    expect(request.config.toolConfig).toBeUndefined();
  });

  it("create request with include server side tool invocations default", () => {
    const model = createModel(
      new GoogleGenAiChatOptions({
        model: "DEFAULT_MODEL",
        googleSearchRetrieval: true,
      }),
    );

    const request = model.createGeminiRequest(
      model.buildRequestPrompt(new Prompt("Test message content")),
    );

    expect(request.config.toolConfig).toBeUndefined();
  });

  it("create request with include server side tool invocations runtime override", () => {
    const model = createModel(
      new GoogleGenAiChatOptions({
        model: "DEFAULT_MODEL",
        includeServerSideToolInvocations: false,
      }),
    );

    const request = model.createGeminiRequest(
      model.buildRequestPrompt(
        new Prompt(
          "Test message content",
          new GoogleGenAiChatOptions({
            googleSearchRetrieval: true,
            includeServerSideToolInvocations: true,
          }),
        ),
      ),
    );

    expect(request.config.toolConfig?.includeServerSideToolInvocations).toBe(
      true,
    );
  });
});
