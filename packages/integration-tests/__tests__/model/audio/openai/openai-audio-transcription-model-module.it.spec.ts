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

import { Test } from "@nestjs/testing";
import { AUDIO_TRANSCRIPTION_MODEL_TOKEN } from "@nestjs-ai/commons";
import { AudioTranscriptionPrompt } from "@nestjs-ai/model";
import {
  type OpenAiAudioTranscriptionModel,
  OpenAiAudioTranscriptionModelModule,
  type OpenAiAudioTranscriptionProperties,
} from "@nestjs-ai/model-openai";
import { LoggerFactory, LogLevel } from "@nestjs-port/core";
import { ConsoleLoggerFactory } from "@nestjs-port/testing";
import { describe, expect, it } from "vitest";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

describe.skipIf(!OPENAI_API_KEY)(
  "OpenAiAudioTranscriptionModelModuleIT",
  () => {
    LoggerFactory.bind(new ConsoleLoggerFactory(LogLevel.DEBUG));
    const logger = LoggerFactory.getLogger(
      "OpenAiAudioTranscriptionModelModuleIT",
    );

    it("transcribe", async () => {
      const transcriptionModel = await createTranscriptionModel({
        apiKey: OPENAI_API_KEY ?? "",
      });

      const speechFile = new URL("speech.flac", import.meta.url);

      const response = await transcriptionModel.call(
        new AudioTranscriptionPrompt(speechFile),
      );

      expect(response.results).toHaveLength(1);
      expect(response.result?.output).toBeTruthy();
      expect(response.result?.output).not.toBe("");
      logger.info("Transcription: %s", response.result?.output);
    });
  },
);

async function createTranscriptionModel(
  properties: OpenAiAudioTranscriptionProperties,
): Promise<OpenAiAudioTranscriptionModel> {
  const moduleRef = await Test.createTestingModule({
    imports: [OpenAiAudioTranscriptionModelModule.forFeature(properties)],
  }).compile();

  return moduleRef.get<OpenAiAudioTranscriptionModel>(
    AUDIO_TRANSCRIPTION_MODEL_TOKEN,
  );
}
