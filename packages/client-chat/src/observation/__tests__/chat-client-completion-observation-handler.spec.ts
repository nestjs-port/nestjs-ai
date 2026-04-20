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

import { ObservationContext } from "@nestjs-ai/commons";
import {
  AssistantMessage,
  ChatResponse,
  Generation,
  Prompt,
} from "@nestjs-ai/model";
import type { Logger } from "@nestjs-port/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ChatClientRequest } from "../../chat-client-request";
import { ChatClientResponse } from "../../chat-client-response";
import { ChatClientCompletionObservationHandler } from "../chat-client-completion-observation-handler";
import { ChatClientObservationContext } from "../chat-client-observation-context";

function createObservationContext(): ChatClientObservationContext {
  return ChatClientObservationContext.builder()
    .request(ChatClientRequest.builder().prompt(new Prompt([])).build())
    .build();
}

describe("ChatClientCompletionObservationHandler", () => {
  let infoSpy: ReturnType<typeof vi.fn>;
  let observationHandler: ChatClientCompletionObservationHandler;

  beforeEach(() => {
    infoSpy = vi.fn();
    const mockLogger = { info: infoSpy } as unknown as Logger;
    observationHandler = new ChatClientCompletionObservationHandler();
    (observationHandler as unknown as { logger: Logger }).logger = mockLogger;
  });

  it("when not supported observation context then return false", () => {
    const context = new ObservationContext();

    expect(observationHandler.supportsContext(context)).toBe(false);
  });

  it("when supported observation context then return true", () => {
    const context = createObservationContext();

    expect(observationHandler.supportsContext(context)).toBe(true);
  });

  it("when empty response then output nothing", () => {
    const context = createObservationContext();
    const response = ChatClientResponse.builder()
      .chatResponse(
        new ChatResponse({
          generations: [
            new Generation({
              assistantMessage: new AssistantMessage({ content: "" }),
            }),
          ],
        }),
      )
      .build();

    context.setResponse(response);
    observationHandler.onStop(context);

    expect(infoSpy).toHaveBeenCalledWith("Chat Client Completion:\n[]");
  });

  it("when null response then output nothing", () => {
    const context = createObservationContext();

    observationHandler.onStop(context);

    expect(infoSpy).toHaveBeenCalledWith("Chat Client Completion:\n[]");
  });

  it("when response with text then output it", () => {
    const context = createObservationContext();
    const response = ChatClientResponse.builder()
      .chatResponse(
        new ChatResponse({
          generations: [
            new Generation({
              assistantMessage: new AssistantMessage({
                content: "Test message",
              }),
            }),
          ],
        }),
      )
      .build();

    context.setResponse(response);
    observationHandler.onStop(context);

    expect(infoSpy).toHaveBeenCalledWith(
      'Chat Client Completion:\n["Test message"]',
    );
  });
});
