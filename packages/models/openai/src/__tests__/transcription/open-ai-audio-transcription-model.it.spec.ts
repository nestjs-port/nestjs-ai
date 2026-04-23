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

import { resolve } from "node:path";

import {
  AudioTranscriptionPrompt,
  type AudioTranscriptionResponse,
} from "@nestjs-ai/model";
import { LoggerFactory, LogLevel } from "@nestjs-port/core";
import { ConsoleLoggerFactory } from "@nestjs-port/testing";
import { describe, expect, it } from "vitest";

import { OpenAiAudioTranscriptionModel } from "../../open-ai-audio-transcription-model.js";
import { OpenAiAudioTranscriptionOptions } from "../../open-ai-audio-transcription-options.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const SPEECH_RESOURCE = resolve(__dirname, "./speech.flac");

describe.skipIf(!OPENAI_API_KEY)("OpenAiAudioTranscriptionModelIT", () => {
  LoggerFactory.bind(new ConsoleLoggerFactory(LogLevel.DEBUG));
  const logger = LoggerFactory.getLogger("OpenAiAudioTranscriptionModelIT");

  const transcriptionModel = new OpenAiAudioTranscriptionModel({
    options: OpenAiAudioTranscriptionOptions.builder()
      .apiKey(OPENAI_API_KEY ?? "")
      .build(),
  });

  it("call test", async () => {
    const prompt = new AudioTranscriptionPrompt(SPEECH_RESOURCE);
    const response: AudioTranscriptionResponse =
      await transcriptionModel.call(prompt);

    expect(response.results).toHaveLength(1);
    expect(response.result.output).toBeTruthy();
    expect(response.result.output).not.toBe("");
    logger.info("Transcription: %s", response.result.output);
  });

  it("transcribe test", async () => {
    const text = await transcriptionModel.transcribe(SPEECH_RESOURCE);

    expect(text).toBeTruthy();
    expect(text).not.toBe("");
    logger.info("Transcription: %s", text);
  });

  it("transcribe with options test", async () => {
    const options = OpenAiAudioTranscriptionOptions.builder()
      .language("en")
      .temperature(0)
      .responseFormat("text")
      .build();

    const prompt = new AudioTranscriptionPrompt(SPEECH_RESOURCE, options);
    const response: AudioTranscriptionResponse =
      await transcriptionModel.call(prompt);

    expect(response.results).toHaveLength(1);
    expect(response.result.output).toBeTruthy();
    expect(response.result.output).not.toBe("");
    logger.info("Transcription with options: %s", response.result.output);
  });

  it("transcribe with verbose format test", async () => {
    const options = OpenAiAudioTranscriptionOptions.builder()
      .responseFormat("verbose_json")
      .build();

    const text = await transcriptionModel.transcribe(SPEECH_RESOURCE, options);

    expect(text).toBeTruthy();
    expect(text).not.toBe("");
    logger.info("Verbose transcription: %s", text);
  });

  it("transcribe test with options", async () => {
    const options = OpenAiAudioTranscriptionOptions.builder()
      .language("en")
      .prompt("Ask not this, but ask that")
      .temperature(0)
      .responseFormat("text")
      .build();

    const text = await transcriptionModel.transcribe(SPEECH_RESOURCE, options);

    expect(text).toBeTruthy();
    expect(text).not.toBe("");
    logger.info("Transcription with options: %s", text);
  });

  it("call test with vtt format", async () => {
    const options = OpenAiAudioTranscriptionOptions.builder()
      .language("en")
      .prompt("Ask not this, but ask that")
      .temperature(0)
      .responseFormat("vtt")
      .build();

    const prompt = new AudioTranscriptionPrompt(SPEECH_RESOURCE, options);
    const response: AudioTranscriptionResponse =
      await transcriptionModel.call(prompt);

    expect(response.results).toHaveLength(1);
    expect(response.result.output).toBeTruthy();
    expect(response.result.output).not.toBe("");
    logger.info("VTT transcription: %s", response.result.output);
  });
});
