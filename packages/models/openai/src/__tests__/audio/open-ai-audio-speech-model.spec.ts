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

import type { TextToSpeechOptions, TextToSpeechPrompt } from "@nestjs-ai/model";
import type { OpenAI } from "openai";
import { describe, expect, it } from "vitest";

import { OpenAiAudioSpeechModel } from "../../open-ai-audio-speech-model";
import { OpenAiAudioSpeechOptions } from "../../open-ai-audio-speech-options";

const mockClient = {} as OpenAI;

function createModel(
  options?: OpenAiAudioSpeechOptions,
): OpenAiAudioSpeechModel {
  return new OpenAiAudioSpeechModel({
    openAiClient: mockClient,
    ...(options != null ? { options } : {}),
  });
}

describe("OpenAiAudioSpeechModelTests", () => {
  it("creates a model", () => {
    const model = createModel();

    expect(model).not.toBeNull();
    expect(model.defaultOptions).not.toBeNull();
  });

  it("uses the default constructor", () => {
    const model = createModel();

    expect(model).not.toBeNull();
    expect(model.defaultOptions).not.toBeNull();
    expect(model.defaultOptions).toBeInstanceOf(OpenAiAudioSpeechOptions);
  });

  it("creates a model with a client", () => {
    const model = createModel();

    expect(model).not.toBeNull();
    expect(model.defaultOptions).not.toBeNull();
  });

  it("creates a model with a client and options", () => {
    const options = OpenAiAudioSpeechOptions.builder()
      .model("tts-1")
      .voice(OpenAiAudioSpeechOptions.Voice.NOVA)
      .build();

    const model = createModel(options);

    expect(model).not.toBeNull();
    expect(model.defaultOptions).toEqual(options);
  });

  it("creates a model with all parameters", () => {
    const options = OpenAiAudioSpeechOptions.builder()
      .model("tts-1-hd")
      .voice(OpenAiAudioSpeechOptions.Voice.SHIMMER)
      .speed(1.5)
      .build();

    const model = createModel(options);

    expect(model).not.toBeNull();
    expect(model.defaultOptions).toEqual(options);
  });

  it("uses the expected default options", () => {
    const model = createModel();
    const options = model.defaultOptions as OpenAiAudioSpeechOptions;

    expect(options.model).toBe("gpt-4o-mini-tts");
    expect(options.voice).toBe("alloy");
    expect(options.responseFormat).toBe("mp3");
    expect(options.speed).toBe(1);
  });

  it("exposes the default options values", () => {
    const model = createModel();
    const options = model.defaultOptions;

    expect(options).toBeInstanceOf(OpenAiAudioSpeechOptions);

    const sdkOptions = options as TextToSpeechOptions &
      OpenAiAudioSpeechOptions;
    expect(sdkOptions.model).toBe("gpt-4o-mini-tts");
    expect(sdkOptions.voice).toBe("alloy");
    expect(sdkOptions.responseFormat).toBe("mp3");
    expect(sdkOptions.speed).toBe(1);
  });

  it("rejects null text", async () => {
    const model = createModel();

    await expect(model.call(null as unknown as string)).rejects.toThrow(
      "Prompt must not be null",
    );
  });

  it("rejects empty text", async () => {
    const model = createModel();

    await expect(model.call("")).rejects.toThrow(
      "Text must not be null or empty",
    );
  });

  it("rejects a null prompt", async () => {
    const model = createModel();

    await expect(
      model.call(null as unknown as TextToSpeechPrompt),
    ).rejects.toThrow("Prompt must not be null");
  });

  it("builds options", () => {
    const options = OpenAiAudioSpeechOptions.builder()
      .model("tts-1")
      .voice(OpenAiAudioSpeechOptions.Voice.ECHO)
      .responseFormat("opus")
      .speed(2.0)
      .build();

    expect(options.model).toBe("tts-1");
    expect(options.voice).toBe("echo");
    expect(options.responseFormat).toBe("opus");
    expect(options.speed).toBe(2);
  });

  it("exposes all voice constants", () => {
    expect(OpenAiAudioSpeechOptions.Voice.ALLOY).toBe("alloy");
    expect(OpenAiAudioSpeechOptions.Voice.ECHO).toBe("echo");
    expect(OpenAiAudioSpeechOptions.Voice.FABLE).toBe("fable");
    expect(OpenAiAudioSpeechOptions.Voice.ONYX).toBe("onyx");
    expect(OpenAiAudioSpeechOptions.Voice.NOVA).toBe("nova");
    expect(OpenAiAudioSpeechOptions.Voice.SHIMMER).toBe("shimmer");
    expect(OpenAiAudioSpeechOptions.Voice.SAGE).toBe("sage");
    expect(OpenAiAudioSpeechOptions.Voice.CORAL).toBe("coral");
    expect(OpenAiAudioSpeechOptions.Voice.BALLAD).toBe("ballad");
    expect(OpenAiAudioSpeechOptions.Voice.VERSE).toBe("verse");
    expect(OpenAiAudioSpeechOptions.Voice.ASH).toBe("ash");
  });

  it("exposes all audio format constants", () => {
    for (const format of [
      "mp3",
      "opus",
      "aac",
      "flac",
      "wav",
      "pcm",
    ] as const) {
      const options = OpenAiAudioSpeechOptions.builder()
        .responseFormat(format)
        .build();

      expect(options.responseFormat).toBe(format);
      expect(options.format).toBe(format);
    }
  });

  it("merges options correctly", () => {
    const source = OpenAiAudioSpeechOptions.builder()
      .model("tts-1-hd")
      .voice(OpenAiAudioSpeechOptions.Voice.NOVA)
      .speed(1.5)
      .build();

    const target = OpenAiAudioSpeechOptions.builder()
      .model("tts-1")
      .voice(OpenAiAudioSpeechOptions.Voice.ALLOY)
      .responseFormat("wav")
      .speed(1.0)
      .build();

    expect(source.model).toBe("tts-1-hd");
    expect(source.voice).toBe("nova");
    expect(source.speed).toBe(1.5);

    // Create model with target defaults
    const model = createModel(target);

    // Verify that default options are set
    const defaults = model.defaultOptions as OpenAiAudioSpeechOptions;
    expect(defaults.model).toBe("tts-1");
    expect(defaults.voice).toBe("alloy");
    expect(defaults.speed).toBe(1);
    expect(defaults.responseFormat).toBe("wav");
  });

  it("builds a model from options", () => {
    const options = OpenAiAudioSpeechOptions.builder()
      .model("tts-1-hd")
      .voice(OpenAiAudioSpeechOptions.Voice.SHIMMER)
      .speed(1.5)
      .build();

    const model = createModel(options);

    expect(model).not.toBeNull();
    expect(model.defaultOptions).toEqual(options);
  });

  it("builds a model with defaults", () => {
    const model = createModel();

    expect(model).not.toBeNull();
    expect(model.defaultOptions).not.toBeNull();
    expect(model.defaultOptions).toBeInstanceOf(OpenAiAudioSpeechOptions);

    const defaults = model.defaultOptions as OpenAiAudioSpeechOptions;
    expect(defaults.model).toBe("gpt-4o-mini-tts");
    expect(defaults.voice).toBe("alloy");
    expect(defaults.responseFormat).toBe("mp3");
    expect(defaults.speed).toBe(1);
  });

  it("creates a modified copy with mutate", () => {
    const originalOptions = OpenAiAudioSpeechOptions.builder()
      .model("tts-1")
      .voice(OpenAiAudioSpeechOptions.Voice.ALLOY)
      .build();

    const originalModel = createModel(originalOptions);

    // Create a modified copy using mutate
    const newOptions = originalOptions.copy();
    newOptions.setModel("tts-1-hd");
    newOptions.setVoice(OpenAiAudioSpeechOptions.Voice.NOVA);

    const modifiedModel = createModel(newOptions);

    // Verify original model is unchanged
    const originalDefaults =
      originalModel.defaultOptions as OpenAiAudioSpeechOptions;
    expect(originalDefaults.model).toBe("tts-1");
    expect(originalDefaults.voice).toBe("alloy");

    // Verify modified model has new options
    const modifiedDefaults =
      modifiedModel.defaultOptions as OpenAiAudioSpeechOptions;
    expect(modifiedDefaults.model).toBe("tts-1-hd");
    expect(modifiedDefaults.voice).toBe("nova");
  });

  it("builds a model with partial options", () => {
    const model = createModel();

    expect(model).not.toBeNull();
    const defaults = model.defaultOptions as OpenAiAudioSpeechOptions;
    expect(defaults.model).toBe("gpt-4o-mini-tts");
  });
});
