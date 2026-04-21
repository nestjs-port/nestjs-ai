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

import { Prompt, SystemMessage, UserMessage } from "@nestjs-ai/model";
import type { Logger } from "@nestjs-port/core";
import { ObservationContext } from "@nestjs-port/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ChatClientRequest } from "../../chat-client-request";
import { ChatClientObservationContext } from "../chat-client-observation-context";
import { ChatClientPromptContentObservationHandler } from "../chat-client-prompt-content-observation-handler";

function createObservationContext(
  prompt = new Prompt([]),
): ChatClientObservationContext {
  return ChatClientObservationContext.builder()
    .request(ChatClientRequest.builder().prompt(prompt).build())
    .build();
}

describe("ChatClientPromptContentObservationHandler", () => {
  let infoSpy: ReturnType<typeof vi.fn>;
  let observationHandler: ChatClientPromptContentObservationHandler;

  beforeEach(() => {
    infoSpy = vi.fn();
    const mockLogger = { info: infoSpy } as unknown as Logger;
    observationHandler = new ChatClientPromptContentObservationHandler();
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

  it("when empty prompt then output nothing", () => {
    const context = createObservationContext();

    observationHandler.onStop(context);

    expect(infoSpy).toHaveBeenCalledWith("Chat Client Prompt Content:\n[]");
  });

  it("when prompt with text then output it", () => {
    const context = createObservationContext(
      new Prompt("supercalifragilisticexpialidocious"),
    );

    observationHandler.onStop(context);

    expect(infoSpy).toHaveBeenCalledWith(
      'Chat Client Prompt Content:\n["user":"supercalifragilisticexpialidocious"]',
    );
  });

  it("when prompt with messages then output it", () => {
    const context = createObservationContext(
      new Prompt([
        SystemMessage.of("you're a chimney sweep"),
        UserMessage.of("supercalifragilisticexpialidocious"),
      ]),
    );

    observationHandler.onStop(context);

    expect(infoSpy).toHaveBeenCalledWith(
      `Chat Client Prompt Content:\n["system":"you're a chimney sweep", "user":"supercalifragilisticexpialidocious"]`,
    );
  });
});
