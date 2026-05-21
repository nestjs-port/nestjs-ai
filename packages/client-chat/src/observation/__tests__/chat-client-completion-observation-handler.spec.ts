import {
  AssistantMessage,
  ChatResponse,
  Generation,
  Prompt,
} from "@nestjs-ai/model";
import type { Logger } from "@nestjs-port/core";
import { ObservationContext } from "@nestjs-port/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ChatClientRequest } from "../../chat-client-request.js";
import { ChatClientResponse } from "../../chat-client-response.js";
import { ChatClientCompletionObservationHandler } from "../chat-client-completion-observation-handler.js";
import { ChatClientObservationContext } from "../chat-client-observation-context.js";

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
