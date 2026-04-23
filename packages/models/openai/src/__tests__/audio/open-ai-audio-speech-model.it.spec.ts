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

import { lastValueFrom, toArray } from "rxjs";
import { describe, expect, it } from "vitest";

import {
  TextToSpeechPrompt,
  type TextToSpeechResponse,
} from "@nestjs-ai/model";

import {
  OpenAiAudioSpeechModel,
  OpenAiAudioSpeechOptions,
  type OpenAiAudioSpeechResponseMetadata,
} from "../../index.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

describe.skipIf(!OPENAI_API_KEY)("OpenAiAudioSpeechModelIT", () => {
  it("generates simple speech", async () => {
    const speechModel = new OpenAiAudioSpeechModel();
    const prompt = new TextToSpeechPrompt({ text: "Hello world" });

    const response = await speechModel.call(prompt);

    expect(response).not.toBeNull();
    expect(response.results).toHaveLength(1);

    const speech = response.result;
    expect(speech).not.toBeNull();
    if (speech == null) {
      throw new Error("Expected speech generation to be present");
    }
    expect(speech.output.byteLength).toBeGreaterThan(0);
  });

  it("uses custom options", async () => {
    const options = OpenAiAudioSpeechOptions.builder()
      .model("tts-1-hd")
      .voice(OpenAiAudioSpeechOptions.Voice.NOVA)
      .responseFormat("opus")
      .speed(1.5)
      .build();

    const model = new OpenAiAudioSpeechModel({ options });

    // Verify that the custom options were set on the model
    const defaultOptions = model.defaultOptions as OpenAiAudioSpeechOptions;
    expect(defaultOptions.model).toBe("tts-1-hd");
    expect(defaultOptions.voice).toBe("nova");
    expect(defaultOptions.responseFormat).toBe("opus");
    expect(defaultOptions.speed).toBe(1.5);

    const prompt = new TextToSpeechPrompt({
      text: "Testing custom options",
    });

    const response = await model.call(prompt);

    expect(response).not.toBeNull();
    expect(response.results).toHaveLength(1);
    expect(response.result?.output.byteLength).toBeGreaterThan(0);
  });

  it("uses new voice options", async () => {
    const options = OpenAiAudioSpeechOptions.builder()
      .model("gpt-4o-mini-tts")
      .voice(OpenAiAudioSpeechOptions.Voice.BALLAD)
      .build();

    const model = new OpenAiAudioSpeechModel({ options });
    const prompt = new TextToSpeechPrompt({ text: "Testing new voice" });

    const response = await model.call(prompt);

    expect(response).not.toBeNull();
    expect(response.result?.output.byteLength).toBeGreaterThan(0);
  });

  it("uses new format options", async () => {
    const options = OpenAiAudioSpeechOptions.builder()
      .model("gpt-4o-mini-tts")
      .voice(OpenAiAudioSpeechOptions.Voice.ALLOY)
      .responseFormat("wav")
      .build();

    const model = new OpenAiAudioSpeechModel({ options });
    const prompt = new TextToSpeechPrompt({ text: "Testing WAV format" });

    const response = await model.call(prompt);

    expect(response).not.toBeNull();
    expect(response.result?.output.byteLength).toBeGreaterThan(0);
  });

  it("accepts simple string input", async () => {
    const speechModel = new OpenAiAudioSpeechModel();
    const audioBytes = await speechModel.call(
      "Today is a wonderful day to build something people love!",
    );

    expect(audioBytes).toBeInstanceOf(Uint8Array);
    expect(audioBytes.byteLength).toBeGreaterThan(0);
  });

  it("returns streaming behavior as a single response", async () => {
    const speechModel = new OpenAiAudioSpeechModel();
    const prompt = new TextToSpeechPrompt({
      text: "Today is a wonderful day to build something people love!",
    });

    const responseFlux = speechModel.stream(prompt);

    expect(responseFlux).not.toBeNull();
    const responses: TextToSpeechResponse[] = await lastValueFrom(
      responseFlux.pipe(toArray()),
    );
    expect(responses).not.toBeNull();

    // SDK doesn't support true streaming - should return single response
    expect(responses).toHaveLength(1);
    expect(responses[0]?.result?.output.byteLength).toBeGreaterThan(0);
  });

  it.each([
    "alloy",
    "echo",
    "fable",
    "onyx",
    "nova",
    "shimmer",
    "sage",
    "coral",
    "ash",
  ])("supports voice %s", async (voice) => {
    const options = OpenAiAudioSpeechOptions.builder()
      .model("gpt-4o-mini-tts")
      .voice(voice)
      .build();

    const model = new OpenAiAudioSpeechModel({ options });
    const prompt = new TextToSpeechPrompt({
      text: "Today is a wonderful day to build something people love!",
    });

    const response = await model.call(prompt);

    expect(response).not.toBeNull();
    expect(response.results).toHaveLength(1);
    expect(response.result?.output.byteLength).toBeGreaterThan(0);
  });

  it("exposes rate limit metadata", async () => {
    // Verify that SDK extracts rate limit metadata from response headers
    const speechModel = new OpenAiAudioSpeechModel();
    const prompt = new TextToSpeechPrompt({
      text: "Today is a wonderful day to build something people love!",
    });

    const response = await speechModel.call(prompt);
    const metadata = response.metadata as OpenAiAudioSpeechResponseMetadata;

    // Metadata should be present with rate limit information
    expect(metadata).not.toBeNull();
    expect(metadata.rateLimit).not.toBeNull();

    // Rate limit values should be populated from response headers
    const hasRateLimitData =
      metadata.rateLimit.requestsLimit !== 0 ||
      metadata.rateLimit.tokensLimit !== 0;
    expect(hasRateLimitData).toBe(true);
  });

  it("supports the tts-1 model", async () => {
    const options = OpenAiAudioSpeechOptions.builder()
      .model("tts-1")
      .voice(OpenAiAudioSpeechOptions.Voice.ALLOY)
      .responseFormat("wav")
      .speed(1.0)
      .build();

    const model = new OpenAiAudioSpeechModel({ options });
    const prompt = new TextToSpeechPrompt({
      text: "Today is a wonderful day to build something people love!",
    });

    const response = await model.call(prompt);

    expect(response).not.toBeNull();
    expect(response.results).toHaveLength(1);
    expect(response.result?.output.byteLength).toBeGreaterThan(0);
  });

  it("supports the tts-1-hd model", async () => {
    const options = OpenAiAudioSpeechOptions.builder()
      .model("tts-1-hd")
      .voice(OpenAiAudioSpeechOptions.Voice.SHIMMER)
      .responseFormat("opus")
      .speed(1.0)
      .build();

    const model = new OpenAiAudioSpeechModel({ options });
    const prompt = new TextToSpeechPrompt({
      text: "Testing high definition audio model",
    });

    const response = await model.call(prompt);

    expect(response).not.toBeNull();
    expect(response.results).toHaveLength(1);
    expect(response.result?.output.byteLength).toBeGreaterThan(0);
  });
});
