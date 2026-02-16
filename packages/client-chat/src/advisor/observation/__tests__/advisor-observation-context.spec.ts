import { Prompt } from "@nestjs-ai/model";
import { describe, expect, it } from "vitest";
import { ChatClientRequest } from "../../../chat-client-request";
import { AdvisorObservationContext } from "../advisor-observation-context";

describe("AdvisorObservationContext", () => {
  it("when mandatory options then return", () => {
    const observationContext = new AdvisorObservationContext(
      "AdvisorName",
      ChatClientRequest.builder().prompt(new Prompt("Hello")).build(),
      0,
    );

    expect(observationContext).toBeDefined();
  });

  it("missing advisor name", () => {
    expect(() => {
      new AdvisorObservationContext(
        "",
        ChatClientRequest.builder().prompt(new Prompt("Hello")).build(),
        0,
      );
    }).toThrow("advisorName cannot be null or empty");
  });

  it("missing chat client request", () => {
    expect(() => {
      new AdvisorObservationContext(
        "AdvisorName",
        null as unknown as ChatClientRequest,
        0,
      );
    }).toThrow("chatClientRequest cannot be null");
  });

  it("when builder with chat client request then return", () => {
    const observationContext = new AdvisorObservationContext(
      "AdvisorName",
      ChatClientRequest.builder().prompt(new Prompt("")).build(),
      0,
    );

    expect(observationContext).toBeDefined();
  });
});
