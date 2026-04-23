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

import { LoggerFactory, LogLevel, ObservationContext } from "@nestjs-port/core";
import { RecordingLogger } from "@nestjs-port/testing";
import { beforeEach, describe, expect, it } from "vitest";
import { AssistantMessage } from "../../messages/index.js";
import { ChatResponse, Generation } from "../../model/index.js";
import { DefaultChatOptions, Prompt } from "../../prompt/index.js";
import { ChatModelCompletionObservationHandler } from "../chat-model-completion-observation-handler.js";
import { ChatModelObservationContext } from "../chat-model-observation-context.js";

describe("ChatModelCompletionObservationHandler", () => {
  let recordingLogger: RecordingLogger;

  beforeEach(() => {
    recordingLogger = new RecordingLogger(
      "ChatModelCompletionObservationHandler",
    );
    LoggerFactory.bind({
      getLogger: () => recordingLogger,
    });
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

    expect(recordingLogger.entries).toHaveLength(1);
    expect(recordingLogger.entries[0]).toMatchObject({
      level: LogLevel.INFO,
      message: "Chat Model Completion:\n[]",
      args: [],
    });
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

    expect(recordingLogger.entries).toHaveLength(1);
    expect(recordingLogger.entries[0]).toMatchObject({
      level: LogLevel.INFO,
      message: "Chat Model Completion:\n[]",
      args: [],
    });
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

    expect(recordingLogger.entries).toHaveLength(1);
    expect(recordingLogger.entries[0]).toMatchObject({
      level: LogLevel.INFO,
      message:
        'Chat Model Completion:\n["say please", "seriously, say please"]',
      args: [],
    });
  });
});
