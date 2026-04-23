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

import { describe, expect, it } from "vitest";
import { ModelProvider, OpenAiSetup } from "../../setup/index.js";

describe("OpenAiSetupTests", () => {
  it("detect model provider returns microsoft foundry when microsoft foundry flag is true", () => {
    const result = OpenAiSetup.detectModelProvider(
      true,
      false,
      null,
      null,
      null,
    );

    expect(result).toBe(ModelProvider.MICROSOFT_FOUNDRY);
  });

  it("detect model provider returns github models when github flag is true", () => {
    const result = OpenAiSetup.detectModelProvider(
      false,
      true,
      null,
      null,
      null,
    );

    expect(result).toBe(ModelProvider.GITHUB_MODELS);
  });

  it("detect model provider returns microsoft foundry when base url matches azure", () => {
    const result = OpenAiSetup.detectModelProvider(
      false,
      false,
      "https://example.openai.azure.com",
      null,
      null,
    );

    expect(result).toBe(ModelProvider.MICROSOFT_FOUNDRY);
  });

  it("detect model provider returns github models when base url matches github", () => {
    const result = OpenAiSetup.detectModelProvider(
      false,
      false,
      "https://models.github.ai/inference",
      null,
      null,
    );

    expect(result).toBe(ModelProvider.GITHUB_MODELS);
  });

  it("detect model provider returns open ai when no conditions match", () => {
    const result = OpenAiSetup.detectModelProvider(
      false,
      false,
      null,
      null,
      null,
    );

    expect(result).toBe(ModelProvider.OPEN_AI);
  });

  it("setup sync client returns client when valid api key provided", () => {
    const client = OpenAiSetup.setupClient({
      apiKey: "valid-api-key",
    });

    expect(client).not.toBeNull();
  });

  it("setup sync client applies custom headers when provided", () => {
    const client = OpenAiSetup.setupClient({
      apiKey: "valid-api-key",
      customHeaders: { "X-Custom-Header": "value" },
    });

    expect(client).not.toBeNull();
  });

  it("calculate base url returns default open ai url when base url is null", () => {
    const result = OpenAiSetup.calculateBaseUrl(
      null,
      ModelProvider.OPEN_AI,
      null,
      null,
    );

    expect(result).toBe(OpenAiSetup.OPENAI_URL);
  });

  it("calculate base url returns github url when model host is github", () => {
    const result = OpenAiSetup.calculateBaseUrl(
      null,
      ModelProvider.GITHUB_MODELS,
      null,
      null,
    );

    expect(result).toBe(OpenAiSetup.GITHUB_MODELS_URL);
  });

  it("calculate base url returns correct microsoft foundry url when microsoft foundry endpoint provided", () => {
    const endpoint = "https://xxx.openai.azure.com/openai/v1/";
    const result = OpenAiSetup.calculateBaseUrl(
      endpoint,
      ModelProvider.MICROSOFT_FOUNDRY,
      "gpt-5-mini",
      null,
    );

    expect(result).toBe("https://xxx.openai.azure.com/openai/v1");
  });

  it("setup sync client returns client when microsoft foundry endpoint and api key provided", () => {
    const client = OpenAiSetup.setupClient({
      baseUrl: "https://xxx.openai.azure.com/openai/v1/",
      apiKey: "test-foundry-api-key",
      azureDeploymentName: "gpt-5.2",
      azureOpenAiServiceVersion: "2024-02-15-preview",
      isAzure: true,
      modelName: "gpt-5-mini",
    });

    expect(client).not.toBeNull();
  });
});
