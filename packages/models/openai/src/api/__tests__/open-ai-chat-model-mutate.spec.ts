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

import { Prompt } from "@nestjs-ai/model";
import { describe, expect, it } from "vitest";
import { OpenAiChatModel } from "../../open-ai-chat-model";
import { OpenAiChatOptions } from "../../open-ai-chat-options";
import { OpenAiApi } from "../open-ai-api";

describe("OpenAiChatModelMutate", () => {
  const createBaseApi = (): OpenAiApi =>
    OpenAiApi.builder()
      .baseUrl("https://api.openai.com")
      .apiKey("base-key")
      .build();

  const createBaseModel = (baseApi: OpenAiApi): OpenAiChatModel =>
    OpenAiChatModel.builder()
      .openAiApi(baseApi)
      .defaultOptions(new OpenAiChatOptions({ model: "gpt-3.5-turbo" }))
      .build();

  it("test mutate creates distinct clients with different endpoints and models", () => {
    const baseApi = createBaseApi();
    const baseModel = createBaseModel(baseApi);

    const gpt4Api = baseApi
      .mutate()
      .baseUrl("https://api.openai.com")
      .apiKey("your-api-key-for-gpt4")
      .build();
    const gpt4Model = baseModel
      .mutate()
      .openAiApi(gpt4Api)
      .defaultOptions(
        new OpenAiChatOptions({ model: "gpt-4", temperature: 0.7 }),
      )
      .build();

    const llamaApi = baseApi
      .mutate()
      .baseUrl("https://your-custom-endpoint.com")
      .apiKey("your-api-key-for-llama")
      .build();
    const llamaModel = baseModel
      .mutate()
      .openAiApi(llamaApi)
      .defaultOptions(
        new OpenAiChatOptions({ model: "llama-70b", temperature: 0.5 }),
      )
      .build();

    expect(gpt4Model).not.toBe(llamaModel);
    expect(gpt4Api).not.toBe(llamaApi);
    expect((gpt4Model.defaultOptions as OpenAiChatOptions).model).toBe("gpt-4");
    expect((llamaModel.defaultOptions as OpenAiChatOptions).model).toBe(
      "llama-70b",
    );
  });

  it("test clone creates deep copy", () => {
    const baseApi = createBaseApi();
    const baseModel = createBaseModel(baseApi);
    const clone = baseModel.clone();

    expect(clone).not.toBe(baseModel);
    expect(clone.defaultOptions).toEqual(baseModel.defaultOptions);
  });

  it("mutate does not affect original", () => {
    const baseApi = createBaseApi();
    const baseModel = createBaseModel(baseApi);
    const mutated = baseModel
      .mutate()
      .defaultOptions(new OpenAiChatOptions({ model: "gpt-4" }))
      .build();

    expect(mutated).not.toBe(baseModel);
    expect((mutated.defaultOptions as OpenAiChatOptions).model).toBe("gpt-4");
    expect((baseModel.defaultOptions as OpenAiChatOptions).model).toBe(
      "gpt-3.5-turbo",
    );
  });

  it("mutate headers creates distinct headers", () => {
    const baseApi = createBaseApi();
    const headers = new Headers();
    headers.set("X-Test", "value");
    const mutatedApi = baseApi.mutate().headers(headers).build();

    expect(mutatedApi.headers.get("X-Test")).not.toBeNull();
    expect(baseApi.headers.get("X-Test")).toBeNull();
  });

  it("mutate handles null and defaults", () => {
    const apiWithDefaults = OpenAiApi.builder()
      .baseUrl("https://api.openai.com")
      .apiKey("key")
      .build();
    const mutated = apiWithDefaults.mutate().build();

    expect(mutated).toBeDefined();
    expect(mutated.baseUrl).toBe("https://api.openai.com");
    expect(mutated.apiKey.value).toBe("key");
  });

  it("multiple sequential mutations produce distinct instances", () => {
    const baseApi = createBaseApi();
    const baseModel = createBaseModel(baseApi);

    const m1 = baseModel
      .mutate()
      .defaultOptions(new OpenAiChatOptions({ model: "m1" }))
      .build();
    const m2 = m1
      .mutate()
      .defaultOptions(new OpenAiChatOptions({ model: "m2" }))
      .build();
    const m3 = m2
      .mutate()
      .defaultOptions(new OpenAiChatOptions({ model: "m3" }))
      .build();

    expect(m1).not.toBe(m2);
    expect(m2).not.toBe(m3);
    expect((m1.defaultOptions as OpenAiChatOptions).model).toBe("m1");
    expect((m2.defaultOptions as OpenAiChatOptions).model).toBe("m2");
    expect((m3.defaultOptions as OpenAiChatOptions).model).toBe("m3");
  });

  it("mutate and clone are equivalent", () => {
    const baseApi = createBaseApi();
    const baseModel = createBaseModel(baseApi);
    const mutated = baseModel.mutate().build();
    const cloned = baseModel.clone();

    expect(mutated.defaultOptions).toEqual(cloned.defaultOptions);
    expect(mutated).not.toBe(cloned);
  });

  it("test api mutate with complex headers", () => {
    const baseApi = createBaseApi();
    const complexHeaders = new Headers();
    complexHeaders.set("Authorization", "Bearer custom-token");
    complexHeaders.append("X-Custom-Header", "value1");
    complexHeaders.append("X-Custom-Header", "value2");
    complexHeaders.set("User-Agent", "Custom-Client/1.0");

    const mutatedApi = baseApi.mutate().headers(complexHeaders).build();
    const customHeader = mutatedApi.headers.get("X-Custom-Header");

    expect(mutatedApi.headers.get("Authorization")).not.toBeNull();
    expect(customHeader).not.toBeNull();
    expect(mutatedApi.headers.get("User-Agent")).not.toBeNull();
    expect(customHeader ?? "").toContain("value1");
    expect(customHeader ?? "").toContain("value2");
  });

  it("test mutate with empty options", () => {
    const baseApi = createBaseApi();
    const baseModel = createBaseModel(baseApi);
    const emptyOptions = new OpenAiChatOptions();
    const mutated = baseModel.mutate().defaultOptions(emptyOptions).build();

    expect(mutated.defaultOptions).toBeDefined();
    expect((mutated.defaultOptions as OpenAiChatOptions).model).toBeUndefined();
    expect((baseModel.defaultOptions as OpenAiChatOptions).model).toBe(
      "gpt-3.5-turbo",
    );
  });

  it("test api mutate with empty headers", () => {
    const baseApi = createBaseApi();
    const emptyHeaders = new Headers();
    const mutatedApi = baseApi.mutate().headers(emptyHeaders).build();

    expect(Array.from(mutatedApi.headers.keys())).toHaveLength(0);
  });

  it("test clone and mutate independence", () => {
    const baseApi = createBaseApi();
    const baseModel = createBaseModel(baseApi);
    const cloned = baseModel.clone();
    const mutated = baseModel.mutate().build();

    expect(cloned).not.toBe(mutated);
    expect(cloned).not.toBe(baseModel);
    expect(mutated).not.toBe(baseModel);
  });

  it("test mutate builder validation", () => {
    const baseApi = createBaseApi();
    const baseModel = createBaseModel(baseApi);

    expect(baseModel.mutate()).toBeDefined();

    const unchanged = baseModel.mutate().build();
    expect(unchanged).toBeDefined();
    expect(unchanged).not.toBe(baseModel);
  });

  it("test mutate with invalid base url", () => {
    const baseApi = createBaseApi();

    expect(() => baseApi.mutate().baseUrl("").build()).toThrow("baseUrl");
    expect(() =>
      baseApi
        .mutate()
        .baseUrl(null as unknown as string)
        .build(),
    ).toThrow("baseUrl");
  });

  it("test mutate with null open ai api", () => {
    const baseApi = createBaseApi();
    const baseModel = createBaseModel(baseApi);

    expect(() =>
      baseModel
        .mutate()
        .openAiApi(null as unknown as OpenAiApi)
        .build(),
    ).toThrow();
  });

  it("test mutate preserves unchanged fields", () => {
    const baseApi = createBaseApi();
    const originalBaseUrl = baseApi.baseUrl;
    const newApiKey = "new-test-key";
    const mutated = baseApi.mutate().apiKey(newApiKey).build();

    expect(mutated.baseUrl).toBe(originalBaseUrl);
    expect(mutated.apiKey.value).toBe(newApiKey);
  });

  it("buildRequestPrompt promotes default prompt options", () => {
    const baseApi = createBaseApi();
    const model = createBaseModel(baseApi);
    const prompt = new Prompt("test input");

    const requestPrompt = model.buildRequestPrompt(prompt);

    expect(requestPrompt.options).toBeDefined();
    expect(requestPrompt.options).toBeInstanceOf(OpenAiChatOptions);
    expect(requestPrompt.instructions).toEqual(prompt.instructions);
  });
});
