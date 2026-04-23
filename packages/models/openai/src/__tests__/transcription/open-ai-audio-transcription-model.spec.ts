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

import { AudioTranscriptionPrompt } from "@nestjs-ai/model";
import type { OpenAI } from "openai";
import { describe, expect, it, vi } from "vitest";

import { OpenAiAudioTranscriptionModel } from "../../open-ai-audio-transcription-model.js";
import { OpenAiAudioTranscriptionOptions } from "../../open-ai-audio-transcription-options.js";

function createMockClient(mockResponse: { text: string } | unknown): {
  client: OpenAI;
  create: ReturnType<typeof vi.fn>;
} {
  const create = vi.fn().mockResolvedValue(mockResponse);
  const client = {
    audio: {
      transcriptions: {
        create,
      },
    },
  } as unknown as OpenAI;
  return { client, create };
}

const speechResource = Buffer.from("fake audio bytes");

describe("OpenAiAudioTranscriptionModel", () => {
  it("call returns transcription text", async () => {
    const mockResponse = { text: "Hello, transcribed text" };

    const { client } = createMockClient(mockResponse);

    const model = new OpenAiAudioTranscriptionModel({ openAiClient: client });
    const prompt = new AudioTranscriptionPrompt(speechResource);
    const response = await model.call(prompt);

    expect(response.result.output).toBe("Hello, transcribed text");
  });

  it("call with default options", async () => {
    const mockResponse = { text: "Hello, this is a test transcription." };

    const { client } = createMockClient(mockResponse);

    const model = new OpenAiAudioTranscriptionModel({ openAiClient: client });

    const prompt = new AudioTranscriptionPrompt(speechResource);
    const response = await model.call(prompt);

    expect(response.result.output).toBe("Hello, this is a test transcription.");
    expect(response.results).toHaveLength(1);
  });

  it("call with prompt options", async () => {
    const mockResponse = {
      text: "Hello, this is a test transcription with options.",
    };

    const { client } = createMockClient(mockResponse);

    const options = OpenAiAudioTranscriptionOptions.builder()
      .temperature(0.5)
      .responseFormat("json")
      .build();

    const model = new OpenAiAudioTranscriptionModel({ openAiClient: client });

    const prompt = new AudioTranscriptionPrompt(speechResource, options);
    const response = await model.call(prompt);

    expect(response.result.output).toBe(
      "Hello, this is a test transcription with options.",
    );
  });

  it("transcribe with resource returns text", async () => {
    const mockResponse = { text: "Simple output" };

    const { client } = createMockClient(mockResponse);

    const model = new OpenAiAudioTranscriptionModel({ openAiClient: client });
    const text = await model.transcribe(speechResource);

    expect(text).toBe("Simple output");
  });

  it("transcribe with options uses merged options", async () => {
    const mockResponse = { text: "With options" };

    const { client } = createMockClient(mockResponse);

    const options = OpenAiAudioTranscriptionOptions.builder()
      .model("whisper-1")
      .language("en")
      .build();
    const model = new OpenAiAudioTranscriptionModel({
      openAiClient: client,
      options,
    });
    const text = await model.transcribe(speechResource, options);

    expect(text).toBe("With options");
  });

  it("options builder from copies all fields", () => {
    const original = OpenAiAudioTranscriptionOptions.builder()
      .model("whisper-1")
      .responseFormat("verbose_json")
      .language("en")
      .prompt("test prompt")
      .temperature(0.5)
      .baseUrl("https://custom.api.com")
      .apiKey("test-key")
      .organizationId("org-123")
      .build();

    const copied = OpenAiAudioTranscriptionOptions.builder()
      .from(original)
      .build();

    expect(copied.model).toBe("whisper-1");
    expect(copied.responseFormat).toBe("verbose_json");
    expect(copied.language).toBe("en");
    expect(copied.prompt).toBe("test prompt");
    expect(copied.temperature).toBe(0.5);
    expect(copied.baseUrl).toBe("https://custom.api.com");
    expect(copied.apiKey).toBe("test-key");
    expect(copied.organizationId).toBe("org-123");
  });

  it("options builder merge overrides non null values", () => {
    const base = OpenAiAudioTranscriptionOptions.builder()
      .model("whisper-1")
      .language("en")
      .temperature(0.5)
      .build();

    const override = OpenAiAudioTranscriptionOptions.builder()
      .language("de")
      .prompt("new prompt")
      .build();

    const merged = OpenAiAudioTranscriptionOptions.builder()
      .from(base)
      .merge(override)
      .build();

    expect(merged.model).toBe("whisper-1");
    expect(merged.language).toBe("de");
    expect(merged.prompt).toBe("new prompt");
    expect(merged.temperature).toBe(0.5);
  });

  it("options copy creates independent instance", () => {
    const original = OpenAiAudioTranscriptionOptions.builder()
      .model("whisper-1")
      .language("en")
      .build();

    const copy = original.copy();

    expect(copy).not.toBe(original);
    expect(copy.model).toBe(original.model);
    expect(copy.language).toBe(original.language);
  });

  it("options equals and hash code", () => {
    const options1 = OpenAiAudioTranscriptionOptions.builder()
      .model("whisper-1")
      .language("en")
      .temperature(0.5)
      .build();

    const options2 = OpenAiAudioTranscriptionOptions.builder()
      .model("whisper-1")
      .language("en")
      .temperature(0.5)
      .build();

    const options3 = OpenAiAudioTranscriptionOptions.builder()
      .model("whisper-1")
      .language("de")
      .temperature(0.5)
      .build();

    expect(options1.equals(options2)).toBe(true);
    expect(options1.hashCode()).toBe(options2.hashCode());
    expect(options1.equals(options3)).toBe(false);
  });

  it("options to string contains fields", () => {
    const options = OpenAiAudioTranscriptionOptions.builder()
      .model("whisper-1")
      .language("en")
      .build();

    const str = options.toString();
    expect(str).toContain("whisper-1");
    expect(str).toContain("en");
  });

  it("options builder with azure configuration", () => {
    const options = new OpenAiAudioTranscriptionOptions({
      model: "whisper-1",
      deploymentName: "my-deployment",
      microsoftFoundry: true,
      baseUrl: "https://my-resource.openai.azure.com",
    });

    expect(options.deploymentName).toBe("my-deployment");
    expect(options.microsoftFoundry).toBe(true);
    expect(options.baseUrl).toBe("https://my-resource.openai.azure.com");
  });
});
