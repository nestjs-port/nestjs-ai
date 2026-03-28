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
  AssistantMessage,
  ChatGenerationMetadata,
  ChatResponse,
  type ChatResponse as ChatResponseType,
  Generation,
} from "@nestjs-ai/model";
import { describe, expect, it } from "vitest";
import { ChatClientResponse } from "../../chat-client-response";
import { AdvisorUtils } from "../advisor-utils";

describe("AdvisorUtils", () => {
  describe("onFinishReason", () => {
    it("when chat response is null then return false", () => {
      const chatClientResponse = new ChatClientResponse(null, new Map());

      const result = AdvisorUtils.onFinishReason()(chatClientResponse);

      expect(result).toBe(false);
    });

    it("when chat response results is null then return false", () => {
      const chatResponseWithNullResults = {
        get results(): null {
          return null;
        },
      } as unknown as ChatResponseType;
      const chatClientResponse = new ChatClientResponse(
        chatResponseWithNullResults,
        new Map(),
      );

      const result = AdvisorUtils.onFinishReason()(chatClientResponse);

      expect(result).toBe(false);
    });

    it("when chat is running then return false", () => {
      const generation = new Generation({
        assistantMessage: AssistantMessage.of("running.."),
        chatGenerationMetadata: ChatGenerationMetadata.NULL,
      });
      const chatResponse = new ChatResponse({
        generations: [generation],
      });
      const chatClientResponse = new ChatClientResponse(
        chatResponse,
        new Map(),
      );

      const result = AdvisorUtils.onFinishReason()(chatClientResponse);

      expect(result).toBe(false);
    });

    it("when chat is stop then return true", () => {
      const generation = new Generation({
        assistantMessage: AssistantMessage.of("finish."),
        chatGenerationMetadata: ChatGenerationMetadata.builder()
          .finishReason("STOP")
          .build(),
      });
      const chatResponse = new ChatResponse({
        generations: [generation],
      });
      const chatClientResponse = new ChatClientResponse(
        chatResponse,
        new Map(),
      );

      const result = AdvisorUtils.onFinishReason()(chatClientResponse);

      expect(result).toBe(true);
    });
  });
});
