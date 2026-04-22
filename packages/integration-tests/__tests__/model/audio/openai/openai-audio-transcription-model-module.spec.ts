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
import { Module } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AUDIO_TRANSCRIPTION_MODEL_TOKEN } from "@nestjs-ai/commons";
import {
  OPEN_AI_AUDIO_TRANSCRIPTION_DEFAULT_MODEL,
  OPEN_AI_AUDIO_TRANSCRIPTION_PROPERTIES_TOKEN,
  OpenAiAudioTranscriptionModel,
  OpenAiAudioTranscriptionModelModule,
  type OpenAiAudioTranscriptionProperties,
} from "@nestjs-ai/model-openai";
import { describe, expect, it } from "vitest";

const API_KEY_TOKEN = Symbol("API_KEY_TOKEN");

@Module({
  providers: [
    {
      provide: API_KEY_TOKEN,
      useValue: "test-api-key-from-config",
    },
  ],
  exports: [API_KEY_TOKEN],
})
class ApiKeyConfigModule {}

describe("OpenAiAudioTranscriptionModelModule", () => {
  describe("forFeature", () => {
    it("should resolve AUDIO_TRANSCRIPTION_MODEL_TOKEN via NestJS DI", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          OpenAiAudioTranscriptionModelModule.forFeature({
            apiKey: "test-key",
          }),
        ],
      }).compile();

      expect(moduleRef.get(AUDIO_TRANSCRIPTION_MODEL_TOKEN)).toBeDefined();
    });

    it("should apply feature properties to the audio transcription model options", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          OpenAiAudioTranscriptionModelModule.forFeature({
            apiKey: "test-api-key",
            model: "whisper-large-v3",
            options: {
              model: "whisper-1",
              responseFormat: "verbose_json",
              prompt: "test prompt",
              language: "ko",
              temperature: 0.2,
              timestampGranularities: ["word"],
            },
          }),
        ],
      }).compile();

      const audioTranscriptionModel =
        moduleRef.get<OpenAiAudioTranscriptionModel>(
          AUDIO_TRANSCRIPTION_MODEL_TOKEN,
        );
      const defaultOptions = audioTranscriptionModel.defaultOptions;

      expect(defaultOptions.apiKey).toBe("test-api-key");
      expect(defaultOptions.model).toBe("whisper-1");
      expect(defaultOptions.responseFormat).toBe("verbose_json");
      expect(defaultOptions.prompt).toBe("test prompt");
      expect(defaultOptions.language).toBe("ko");
      expect(defaultOptions.temperature).toBe(0.2);
      expect(defaultOptions.timestampGranularities).toEqual(["word"]);
    });

    it("should fall back to the default audio transcription model", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          OpenAiAudioTranscriptionModelModule.forFeature({
            apiKey: "test-key",
          }),
        ],
      }).compile();

      const audioTranscriptionModel =
        moduleRef.get<OpenAiAudioTranscriptionModel>(
          AUDIO_TRANSCRIPTION_MODEL_TOKEN,
        );

      expect(audioTranscriptionModel.defaultOptions.model).toBe(
        OPEN_AI_AUDIO_TRANSCRIPTION_DEFAULT_MODEL,
      );
    });

    it("should not export the properties token", async () => {
      const featureModule = OpenAiAudioTranscriptionModelModule.forFeature({
        apiKey: "test-key",
      });

      const moduleRef = await Test.createTestingModule({
        imports: [featureModule],
      }).compile();

      expect(moduleRef.get(AUDIO_TRANSCRIPTION_MODEL_TOKEN)).toBeDefined();

      const exports = featureModule.exports as symbol[];
      expect(exports).toContain(AUDIO_TRANSCRIPTION_MODEL_TOKEN);
      expect(exports).not.toContain(
        OPEN_AI_AUDIO_TRANSCRIPTION_PROPERTIES_TOKEN,
      );
    });

    it("should default global to false", () => {
      expect(
        OpenAiAudioTranscriptionModelModule.forFeature({
          apiKey: "test-key",
        }).global,
      ).toBe(false);
    });

    it("should support global option", () => {
      expect(
        OpenAiAudioTranscriptionModelModule.forFeature(
          { apiKey: "test-key" },
          { global: true },
        ).global,
      ).toBe(true);
    });
  });

  describe("forFeatureAsync", () => {
    it("should resolve AUDIO_TRANSCRIPTION_MODEL_TOKEN from async factory via NestJS DI", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          OpenAiAudioTranscriptionModelModule.forFeatureAsync({
            useFactory: () => ({
              apiKey: "async-test-key",
            }),
          }),
        ],
      }).compile();

      expect(moduleRef.get(AUDIO_TRANSCRIPTION_MODEL_TOKEN)).toBeDefined();
    });

    it("should support imports and inject for async factory", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          OpenAiAudioTranscriptionModelModule.forFeatureAsync({
            imports: [ApiKeyConfigModule],
            inject: [API_KEY_TOKEN],
            useFactory: (
              apiKey: string,
            ): OpenAiAudioTranscriptionProperties => ({
              apiKey,
              model: "whisper-large-v3",
              options: {
                prompt: "async prompt",
              },
            }),
          }),
        ],
      }).compile();

      const audioTranscriptionModel =
        moduleRef.get<OpenAiAudioTranscriptionModel>(
          AUDIO_TRANSCRIPTION_MODEL_TOKEN,
        );
      const defaultOptions = audioTranscriptionModel.defaultOptions;

      expect(defaultOptions.apiKey).toBe("test-api-key-from-config");
      expect(defaultOptions.model).toBe("whisper-large-v3");
      expect(defaultOptions.prompt).toBe("async prompt");
    });

    it("should support async factory returning a Promise", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          OpenAiAudioTranscriptionModelModule.forFeatureAsync({
            useFactory: async () => ({
              apiKey: "promise-key",
            }),
          }),
        ],
      }).compile();

      expect(moduleRef.get(AUDIO_TRANSCRIPTION_MODEL_TOKEN)).toBeDefined();
    });

    it("should default global to false for async", () => {
      expect(
        OpenAiAudioTranscriptionModelModule.forFeatureAsync({
          useFactory: () => ({ apiKey: "key" }),
        }).global,
      ).toBe(false);
    });

    it("should support global option for async", () => {
      expect(
        OpenAiAudioTranscriptionModelModule.forFeatureAsync({
          useFactory: () => ({ apiKey: "key" }),
          global: true,
        }).global,
      ).toBe(true);
    });
  });
});
