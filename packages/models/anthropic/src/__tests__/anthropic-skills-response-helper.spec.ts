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

import { ChatResponse, ChatResponseMetadata } from "@nestjs-ai/model";
import { describe, expect, it } from "vitest";

import { AnthropicSkillsResponseHelper } from "../index.js";

describe("AnthropicSkillsResponseHelper", () => {
  it("extract file ids returns empty for null response", () => {
    expect(AnthropicSkillsResponseHelper.extractFileIds(null)).toEqual([]);
  });

  it("extract file ids returns empty for null metadata", () => {
    const response = new ChatResponse({
      generations: [],
    });

    expect(AnthropicSkillsResponseHelper.extractFileIds(response)).toEqual([]);
  });

  it("extract file ids returns empty for non-message metadata", () => {
    const response = new ChatResponse({
      generations: [],
      chatResponseMetadata: new ChatResponseMetadata({
        metadata: {
          "anthropic-response": "not a message",
        },
      }),
    });

    expect(AnthropicSkillsResponseHelper.extractFileIds(response)).toEqual([]);
  });

  it("extract file ids finds container upload blocks", () => {
    const response = new ChatResponse({
      generations: [],
      chatResponseMetadata: new ChatResponseMetadata({
        metadata: {
          "anthropic-response": {
            type: "message",
            content: [
              { type: "container_upload", file_id: "file-abc-123" },
              { type: "container_upload", file_id: "file-def-456" },
            ],
          },
        },
      }),
    });

    expect(AnthropicSkillsResponseHelper.extractFileIds(response)).toEqual([
      "file-abc-123",
      "file-def-456",
    ]);
  });

  it("extract file ids skips non-container upload blocks", () => {
    const response = new ChatResponse({
      generations: [],
      chatResponseMetadata: new ChatResponseMetadata({
        metadata: {
          "anthropic-response": {
            content: [{ type: "text", text: "hello" }],
          },
        },
      }),
    });

    expect(AnthropicSkillsResponseHelper.extractFileIds(response)).toEqual([]);
  });

  it("extract container id returns null for null response", () => {
    expect(AnthropicSkillsResponseHelper.extractContainerId(null)).toBeNull();
  });

  it("extract container id returns id when present", () => {
    const response = new ChatResponse({
      generations: [],
      chatResponseMetadata: new ChatResponseMetadata({
        metadata: {
          "anthropic-response": {
            type: "message",
            container: { id: "cntr-abc-123" },
          },
        },
      }),
    });

    expect(AnthropicSkillsResponseHelper.extractContainerId(response)).toBe(
      "cntr-abc-123",
    );
  });

  it("extract container id returns null when no container", () => {
    const response = new ChatResponse({
      generations: [],
      chatResponseMetadata: new ChatResponseMetadata({
        metadata: {
          "anthropic-response": {
            container: null,
          },
        },
      }),
    });

    expect(
      AnthropicSkillsResponseHelper.extractContainerId(response),
    ).toBeNull();
  });
});
