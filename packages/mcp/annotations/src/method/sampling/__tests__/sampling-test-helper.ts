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

import type { CreateMessageRequest } from "@modelcontextprotocol/server";

/**
 * Test helper for sampling tests.
 */
export class SamplingTestHelper {
  private constructor() {}

  /**
   * Helper method to create a sample request.
   * @return A sample request
   */
  static createSampleRequest(): CreateMessageRequest {
    return {
      method: "sampling/createMessage",
      params: {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: "Hello, can you help me with a task?",
            },
          },
        ],
        modelPreferences: {
          hints: [{ name: "claude-3-haiku" }],
        },
        systemPrompt: "You are a helpful assistant.",
        temperature: 0.7,
        maxTokens: 1024,
      },
    } as unknown as CreateMessageRequest;
  }
}
