/*
 * Copyright 2026-present the original author or authors.
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

import "reflect-metadata";

import { Test, type TestingModule } from "@nestjs/testing";
import { AUDIO_SPEECH_MODEL_TOKEN } from "@nestjs-ai/commons";
import {
  OpenAiAudioSpeechModel,
  OpenAiAudioSpeechModelModule,
  OpenAiAudioSpeechOptions,
  type OpenAiAudioSpeechProperties,
} from "@nestjs-ai/model-openai";
import { describe, expect, it } from "vitest";

describe("OpenAiAudioSpeechModelModuleIT", () => {
  it("auto configuration enabled", async () => {
    const moduleRef = await createSpeechModel({
      apiKey: "test-api-key",
    });

    expect(moduleRef.get(AUDIO_SPEECH_MODEL_TOKEN)).toBeDefined();

    const model = moduleRef.get<OpenAiAudioSpeechModel>(
      AUDIO_SPEECH_MODEL_TOKEN,
    );

    expect(model).not.toBeNull();
    expect(model.defaultOptions).not.toBeNull();
  });

  it("default properties applied", async () => {
    const moduleRef = await createSpeechModel({
      apiKey: "test-api-key",
    });

    const model = moduleRef.get<OpenAiAudioSpeechModel>(
      AUDIO_SPEECH_MODEL_TOKEN,
    );
    const options = model.defaultOptions as OpenAiAudioSpeechOptions;

    expect(options.model).toBe(OpenAiAudioSpeechOptions.DEFAULT_SPEECH_MODEL);
    expect(options.voice).toBe(OpenAiAudioSpeechOptions.DEFAULT_VOICE);
    expect(options.responseFormat).toBe(
      OpenAiAudioSpeechOptions.DEFAULT_RESPONSE_FORMAT,
    );
    expect(options.speed).toBe(OpenAiAudioSpeechOptions.DEFAULT_SPEED);
  });

  it("custom properties applied", async () => {
    const moduleRef = await createSpeechModel({
      apiKey: "test-api-key",
      options: {
        model: "tts-1-hd",
        voice: "nova",
        responseFormat: "opus",
        speed: 1.5,
      },
    });

    const model = moduleRef.get<OpenAiAudioSpeechModel>(
      AUDIO_SPEECH_MODEL_TOKEN,
    );
    const options = model.defaultOptions as OpenAiAudioSpeechOptions;

    expect(options.model).toBe("tts-1-hd");
    expect(options.voice).toBe("nova");
    expect(options.responseFormat).toBe("opus");
    expect(options.speed).toBe(1.5);
  });
});

async function createSpeechModel(
  properties: OpenAiAudioSpeechProperties,
): Promise<TestingModule> {
  return Test.createTestingModule({
    imports: [OpenAiAudioSpeechModelModule.forFeature(properties)],
  }).compile();
}
