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

import { type Observable, of } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import { Speech } from "../speech.js";
import { TextToSpeechModel } from "../text-to-speech-model.js";
import { TextToSpeechPrompt } from "../text-to-speech-prompt.js";
import { TextToSpeechResponse } from "../text-to-speech-response.js";
import { TextToSpeechResponseMetadata } from "../text-to-speech-response-metadata.js";

class TestTextToSpeechModel extends TextToSpeechModel {
  constructor(
    private readonly _callPromptImpl: (
      prompt: TextToSpeechPrompt,
    ) => Promise<TextToSpeechResponse>,
    private readonly _streamPromptImpl: (
      prompt: TextToSpeechPrompt,
    ) => Observable<TextToSpeechResponse>,
  ) {
    super();
  }

  protected override callPrompt(
    prompt: TextToSpeechPrompt,
  ): Promise<TextToSpeechResponse> {
    return this._callPromptImpl(prompt);
  }

  protected override streamPrompt(
    prompt: TextToSpeechPrompt,
  ): Observable<TextToSpeechResponse> {
    return this._streamPromptImpl(prompt);
  }
}

function createResponse(audioOutput: Uint8Array): TextToSpeechResponse {
  return new TextToSpeechResponse({
    results: [new Speech(audioOutput)],
  });
}

describe("TextToSpeechModel", () => {
  it("call with string calls call with prompt and returns audio correctly", async () => {
    const inputText = "Hello, world!";
    const expectedAudio = Buffer.from([1, 2, 3, 4, 5]);
    const callPrompt = vi.fn(async (prompt: TextToSpeechPrompt) => {
      expect(prompt).toBeInstanceOf(TextToSpeechPrompt);
      expect(prompt.instructions.text).toBe(inputText);
      return createResponse(expectedAudio);
    });

    const model = new TestTextToSpeechModel(callPrompt, () =>
      of(createResponse(Buffer.from([]))),
    );

    const actualAudio = await model.call(inputText);

    expect(Buffer.from(actualAudio)).toEqual(expectedAudio);
    expect(callPrompt).toHaveBeenCalledTimes(1);
  });

  it("call with empty string returns empty audio", async () => {
    const inputText = "";
    const expectedAudio = Buffer.from([]);
    const callPrompt = vi.fn(async () => createResponse(expectedAudio));
    const model = new TestTextToSpeechModel(callPrompt, () =>
      of(createResponse(Buffer.from([]))),
    );

    const result = await model.call(inputText);

    expect(Buffer.from(result)).toEqual(expectedAudio);
    expect(callPrompt).toHaveBeenCalledTimes(1);
    expect(callPrompt).toHaveBeenCalledWith(expect.any(TextToSpeechPrompt));
  });

  it("call when prompt call throws exception propagates correctly", async () => {
    const inputText = "Test message";
    const expectedException = new Error("API call failed");
    const callPrompt = vi.fn(async () => {
      throw expectedException;
    });
    const model = new TestTextToSpeechModel(callPrompt, () =>
      of(createResponse(Buffer.from([]))),
    );

    await expect(model.call(inputText)).rejects.toBe(expectedException);

    expect(callPrompt).toHaveBeenCalledTimes(1);
    expect(callPrompt).toHaveBeenCalledWith(expect.any(TextToSpeechPrompt));
  });

  it("call when response is null handles gracefully", async () => {
    const inputText = "Test message";
    const callPrompt = vi.fn(
      async () => null as unknown as TextToSpeechResponse,
    );
    const model = new TestTextToSpeechModel(callPrompt, () =>
      of(createResponse(Buffer.from([]))),
    );

    await expect(model.call(inputText)).rejects.toBeInstanceOf(TypeError);

    expect(callPrompt).toHaveBeenCalledTimes(1);
    expect(callPrompt).toHaveBeenCalledWith(expect.any(TextToSpeechPrompt));
  });

  it("call when speech is null returns empty array", async () => {
    const inputText = "Test message";
    const callPrompt = vi.fn(async () => {
      return {
        result: null,
        results: [],
        metadata: new TextToSpeechResponseMetadata(),
      } as unknown as TextToSpeechResponse;
    });
    const model = new TestTextToSpeechModel(callPrompt, () =>
      of(createResponse(Buffer.from([]))),
    );

    const result = await model.call(inputText);

    expect(Buffer.from(result)).toEqual(Buffer.from([]));
    expect(callPrompt).toHaveBeenCalledTimes(1);
  });

  it("call multiple times with same model maintains state", async () => {
    const callPrompt = vi.fn();
    const model = new TestTextToSpeechModel(
      async (prompt) => callPrompt(prompt),
      () => of(createResponse(Buffer.from([]))),
    );

    // First call
    callPrompt.mockResolvedValueOnce(createResponse(Buffer.from([1, 2, 3])));
    const result1 = await model.call("Message 1");
    expect(Buffer.from(result1)).toEqual(Buffer.from([1, 2, 3]));

    // Second call
    callPrompt.mockResolvedValueOnce(createResponse(Buffer.from([4, 5, 6])));
    const result2 = await model.call("Message 2");
    expect(Buffer.from(result2)).toEqual(Buffer.from([4, 5, 6]));

    expect(callPrompt).toHaveBeenCalledTimes(2);
    expect(callPrompt.mock.calls[0][0]).toBeInstanceOf(TextToSpeechPrompt);
    expect(callPrompt.mock.calls[1][0]).toBeInstanceOf(TextToSpeechPrompt);
  });
});
