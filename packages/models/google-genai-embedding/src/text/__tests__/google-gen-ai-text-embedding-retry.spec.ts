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

import { EmbeddingRequest } from "@nestjs-ai/model";
import { RetryUtils, TransientAiException } from "@nestjs-ai/retry";
import {
  RetryTemplate,
  type RetryListener,
  type RetryPolicy,
  type Retryable,
} from "@nestjs-port/core";
import type {
  ContentEmbedding,
  EmbedContentResponse,
  GoogleGenAI,
} from "@google/genai";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { GoogleGenAiEmbeddingConnectionDetails } from "../../google-gen-ai-embedding-connection-details.js";
import { GoogleGenAiTextEmbeddingModel } from "../google-gen-ai-text-embedding-model.js";
import { GoogleGenAiTextEmbeddingOptions } from "../google-gen-ai-text-embedding-options.js";

describe("GoogleGenAiTextEmbeddingRetryTests", () => {
  let retryListener: TestRetryListener;
  let retryTemplate: RetryTemplate;
  let embedContent: ReturnType<typeof vi.fn>;
  let embeddingModel: GoogleGenAiTextEmbeddingModel;

  beforeEach(() => {
    retryTemplate = new RetryTemplate(
      RetryUtils.SHORT_RETRY_TEMPLATE.retryPolicy,
    );
    retryListener = new TestRetryListener();
    retryTemplate.setRetryListener(retryListener);

    embedContent = vi.fn();
    const genAiClient = {
      models: { embedContent },
    } as unknown as GoogleGenAI;

    // Set up the mock connection details to return the mock client
    const connectionDetails = {
      genAiClient,
      getModelEndpointName: (modelName: string) => modelName,
    } as unknown as GoogleGenAiEmbeddingConnectionDetails;

    embeddingModel = new GoogleGenAiTextEmbeddingModel({
      connectionDetails,
      defaultOptions: GoogleGenAiTextEmbeddingOptions.builder().build(),
      retryTemplate,
    });
  });

  it("vertex ai embedding transient error", async () => {
    // Create mock embedding response
    const mockEmbedding: ContentEmbedding = { values: [9.9, 8.8] };
    const mockResponse = {
      embeddings: [mockEmbedding],
    } as EmbedContentResponse;

    // Setup the mock client to throw transient errors then succeed
    embedContent
      .mockRejectedValueOnce(new TransientAiException("Transient Error 1"))
      .mockRejectedValueOnce(new TransientAiException("Transient Error 2"))
      .mockResolvedValueOnce(mockResponse);

    const options = GoogleGenAiTextEmbeddingOptions.builder()
      .model("model")
      .build();
    const result = await embeddingModel.call(
      new EmbeddingRequest(["text1", "text2"], options),
    );

    expect(result).not.toBeNull();
    expect(result.results).toHaveLength(1);
    expect(result.results[0].output).toEqual([9.9, 8.8]);
    expect(retryListener.onSuccessRetryCount).toBe(1);
    expect(retryListener.onErrorRetryCount).toBe(2);

    expect(embedContent).toHaveBeenCalledTimes(3);
  });

  it("vertex ai embedding non transient error", async () => {
    // Setup the mock client to throw a non-transient error
    embedContent.mockRejectedValueOnce(new Error("Non Transient Error"));

    const options = GoogleGenAiTextEmbeddingOptions.builder()
      .model("model")
      .build();
    // Assert that a RuntimeException is thrown and not retried
    await expect(
      embeddingModel.call(new EmbeddingRequest(["text1", "text2"], options)),
    ).rejects.toThrow("Non Transient Error");

    // Verify that embedContent was called only once (no retries for non-transient
    // errors)
    expect(embedContent).toHaveBeenCalledTimes(1);
  });
});

class TestRetryListener implements RetryListener {
  onErrorRetryCount = 0;

  onSuccessRetryCount = 0;

  beforeRetry(
    _retryPolicy: RetryPolicy,
    _retryable: Retryable,
    _retryableName: string,
  ): void {
    // Count each retry attempt
    this.onErrorRetryCount++;
  }

  onRetrySuccess(
    _retryPolicy: RetryPolicy,
    _retryable: Retryable,
    _retryableName: string,
    _result: unknown,
  ): void {
    // Count successful retries - we increment when we succeed after a failure
    this.onSuccessRetryCount++;
  }
}
