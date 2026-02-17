import { type Logger, ObservationContext } from "@nestjs-ai/commons";
import { Prompt, SystemMessage, UserMessage } from "@nestjs-ai/model";
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
