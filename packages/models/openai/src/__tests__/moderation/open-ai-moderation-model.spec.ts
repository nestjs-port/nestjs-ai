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

import type { OpenAiClient } from "../../open-ai-client";
import { OpenAiModerationModel } from "../../open-ai-moderation-model";
import { OpenAiModerationOptions } from "../../open-ai-moderation-options";
import { ModerationOptionsBuilder, ModerationPrompt } from "@nestjs-ai/model";
import { describe, expect, it, vi } from "vitest";
import { ms } from "@nestjs-port/core";

function createMockClient(): OpenAiClient {
  return {
    moderations: {
      create: vi.fn().mockResolvedValue(null),
    },
  } as unknown as OpenAiClient;
}

describe("OpenAiModerationModelTests", () => {
  it("test model creation", () => {
    const model = new OpenAiModerationModel({
      openAiClient: createMockClient(),
    });

    expect(model).not.toBeNull();
    expect(model.options).not.toBeNull();
  });

  it("test builder with defaults", () => {
    const model = new OpenAiModerationModel({
      openAiClient: createMockClient(),
    });

    expect(model).not.toBeNull();
    expect(model.options).not.toBeNull();
    expect(model.options).toBeInstanceOf(OpenAiModerationOptions);
    expect(model.options.model).toBe(
      OpenAiModerationOptions.DEFAULT_MODERATION_MODEL,
    );
  });

  it("test builder with custom options", () => {
    const options = new OpenAiModerationOptions({
      model: "omni-moderation-2024-09-26",
    });

    const model = new OpenAiModerationModel({
      openAiClient: createMockClient(),
      options,
    });

    expect(model).not.toBeNull();
    expect(model.options.model).toBe("omni-moderation-2024-09-26");
  });

  it("test builder with null client", () => {
    const model = new OpenAiModerationModel({
      options: new OpenAiModerationOptions({
        apiKey: "test-key",
      }),
    });

    expect(model).not.toBeNull();
    expect(model.options).not.toBeNull();
  });

  it("test mutate creates builder with same configuration", () => {
    const options = new OpenAiModerationOptions({
      model: "omni-moderation-2024-09-26",
      baseUrl: "https://custom.example.com",
    });

    const model = new OpenAiModerationModel({
      openAiClient: createMockClient(),
      options,
    });

    const mutatedModel = model.mutate();

    expect(mutatedModel).not.toBeNull();
    expect(mutatedModel.options.model).toBe("omni-moderation-2024-09-26");
    expect(mutatedModel.options.baseUrl).toBe("https://custom.example.com");
  });

  it("test mutate allows overriding options", async () => {
    const mockClient = createMockClient();
    const model = new OpenAiModerationModel({
      openAiClient: mockClient,
      options: new OpenAiModerationOptions({
        model: "omni-moderation-2024-09-26",
      }),
    });

    const prompt = new ModerationPrompt(
      "test prompt",
      ModerationOptionsBuilder.builder()
        .model("omni-moderation-latest")
        .build(),
    );

    await model.call(prompt);

    expect(mockClient.moderations.create).toHaveBeenCalledWith({
      input: "test prompt",
      model: "omni-moderation-latest",
    });
  });

  it("test options builder", () => {
    const options = new OpenAiModerationOptions({
      model: "omni-moderation-latest",
      baseUrl: "https://api.example.com",
      apiKey: "test-key",
      organizationId: "org-123",
      timeout: ms(30_000),
      maxRetries: 5,
    });

    expect(options.model).toBe("omni-moderation-latest");
    expect(options.baseUrl).toBe("https://api.example.com");
    expect(options.apiKey).toBe("test-key");
    expect(options.organizationId).toBe("org-123");
    expect(options.timeout).toBe(30_000);
    expect(options.maxRetries).toBe(5);
  });

  it("test options merge", async () => {
    const mockClient = createMockClient();
    const model = new OpenAiModerationModel({
      openAiClient: mockClient,
      options: new OpenAiModerationOptions({
        model: "omni-moderation-2024-09-26",
      }),
    });

    const prompt = new ModerationPrompt(
      "test prompt",
      ModerationOptionsBuilder.builder()
        .model("omni-moderation-latest")
        .build(),
    );

    await model.call(prompt);

    expect(mockClient.moderations.create).toHaveBeenCalledWith({
      input: "test prompt",
      model: "omni-moderation-latest",
    });
  });

  it("test options merge with null", async () => {
    const mockClient = createMockClient();
    const model = new OpenAiModerationModel({
      openAiClient: mockClient,
      options: new OpenAiModerationOptions({
        model: "omni-moderation-2024-09-26",
      }),
    });

    const prompt = new ModerationPrompt(
      "test prompt",
      ModerationOptionsBuilder.builder().build(),
    );

    await model.call(prompt);

    expect(mockClient.moderations.create).toHaveBeenCalledWith({
      input: "test prompt",
      model: "omni-moderation-2024-09-26",
    });
  });

  it("test default model value", () => {
    expect(OpenAiModerationOptions.DEFAULT_MODERATION_MODEL).toBe(
      "omni-moderation-latest",
    );
  });

  it("test options get model with null internal value", () => {
    const options = new OpenAiModerationOptions();

    expect(options.model).toBe(
      OpenAiModerationOptions.DEFAULT_MODERATION_MODEL,
    );
  });
});
