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
import { LoggerFactory } from "@nestjs-port/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantMessage } from "../../messages";
import { ChatResponse, Generation } from "../../model";
import { DefaultChatOptions, Prompt } from "../../prompt";
import { ChatModelCompletionObservationHandler } from "../chat-model-completion-observation-handler";
import { ChatModelObservationContext } from "../chat-model-observation-context";

describe("ChatModelCompletionObservationHandler", () => {
  let infoMock: (message: string, ...args: unknown[]) => void;

  beforeEach(() => {
    infoMock = vi.fn<(message: string, ...args: unknown[]) => void>();
    vi.spyOn(LoggerFactory, "getLogger").mockReturnValue({
      name: "ChatModelCompletionObservationHandler",
      info: infoMock,
      warn: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
      error: vi.fn(),
      isDebugEnabled: () => false,
      isTraceEnabled: () => false,
      isInfoEnabled: () => true,
      isWarnEnabled: () => true,
      isErrorEnabled: () => true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createContext(): ChatModelObservationContext {
    return new ChatModelObservationContext(
      new Prompt(
        "supercalifragilisticexpialidocious",
        new DefaultChatOptions({ model: "mistral" }),
      ),
      "superprovider",
    );
  }

  it("when not supported observation context then return false", () => {
    const observationHandler = new ChatModelCompletionObservationHandler();
    const context = new ObservationContext();

    expect(observationHandler.supportsContext(context)).toBe(false);
  });

  it("when supported observation context then return true", () => {
    const observationHandler = new ChatModelCompletionObservationHandler();
    const context = createContext();

    expect(observationHandler.supportsContext(context)).toBe(true);
  });

  it("when empty response then output nothing", () => {
    const observationHandler = new ChatModelCompletionObservationHandler();
    const context = createContext();

    observationHandler.onStop(context);

    expect(infoMock).toHaveBeenCalledWith("Chat Model Completion:\n[]");
  });

  it("when empty completion then output nothing", () => {
    const observationHandler = new ChatModelCompletionObservationHandler();
    const context = createContext();
    context.setResponse(
      new ChatResponse({
        generations: [
          new Generation({
            assistantMessage: AssistantMessage.of(""),
          }),
        ],
      }),
    );

    observationHandler.onStop(context);

    expect(infoMock).toHaveBeenCalledWith("Chat Model Completion:\n[]");
  });

  it("when completion with text then output it", () => {
    const observationHandler = new ChatModelCompletionObservationHandler();
    const context = createContext();
    context.setResponse(
      new ChatResponse({
        generations: [
          new Generation({
            assistantMessage: AssistantMessage.of("say please"),
          }),
          new Generation({
            assistantMessage: AssistantMessage.of("seriously, say please"),
          }),
        ],
      }),
    );

    observationHandler.onStop(context);

    expect(infoMock).toHaveBeenCalledWith(
      'Chat Model Completion:\n["say please", "seriously, say please"]',
    );
  });
});
