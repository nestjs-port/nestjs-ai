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

import {
  AudioTranscription,
  AudioTranscriptionPrompt,
  AudioTranscriptionResponse,
} from "@nestjs-ai/model";
import type { OpenAI } from "openai";
import { assert, describe, expect, it, vi } from "vitest";

import { OpenAiAudioTranscriptionModel } from "../../../open-ai-audio-transcription-model.js";

describe("TranscriptionModel", () => {
  it("transcrbe request returns response correctly", async () => {
    const mockAudioFile = "/mock/audio.flac";

    const mockClient = {} as OpenAI;
    const model = new OpenAiAudioTranscriptionModel({
      openAiClient: mockClient,
    });

    const mockTranscription = "All your bases are belong to us";

    // Create a mock Transcript
    const transcript = new AudioTranscription(mockTranscription);

    // Create a mock TranscriptionResponse with the mock Transcript
    const response = new AudioTranscriptionResponse(transcript);

    // Transcript transcript = spy(new Transcript(responseMessage));
    // TranscriptionResponse response = spy(new
    // TranscriptionResponse(Collections.singletonList(transcript)));

    const callSpy = vi
      .spyOn(model, "call")
      .mockImplementation(async (transcriptionRequest) => {
        assert.exists(transcriptionRequest);
        expect(transcriptionRequest.instructions).toBe(mockAudioFile);
        return response;
      });

    expect(await model.transcribe(mockAudioFile)).toBe(mockTranscription);

    expect(callSpy).toHaveBeenCalledTimes(1);
    expect(callSpy).toHaveBeenCalledWith(expect.any(AudioTranscriptionPrompt));
  });
});
