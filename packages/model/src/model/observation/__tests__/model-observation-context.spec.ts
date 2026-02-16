import {
  AiOperationMetadata,
  AiOperationType,
  AiProvider,
} from "@nestjs-ai/commons";
import { describe, expect, it } from "vitest";
import { ModelObservationContext } from "../model-observation-context";

describe("ModelObservationContext", () => {
  it("when request and metadata then return", () => {
    const observationContext = new ModelObservationContext<string, string>(
      "test request",
      new AiOperationMetadata(
        AiOperationType.CHAT.value,
        AiProvider.OLLAMA.value,
      ),
    );

    expect(observationContext).toBeDefined();
  });

  it("when request is null then throw", () => {
    expect(
      () =>
        new ModelObservationContext<string, string>(
          null as unknown as string,
          new AiOperationMetadata(
            AiOperationType.EMBEDDING.value,
            AiProvider.OLLAMA.value,
          ),
        ),
    ).toThrow("request cannot be null");
  });

  it("when operation metadata is null then throw", () => {
    expect(
      () =>
        new ModelObservationContext<string, string>(
          "test request",
          null as unknown as AiOperationMetadata,
        ),
    ).toThrow("operationMetadata cannot be null");
  });

  it("when operation metadata is missing operation type then throw", () => {
    expect(
      () =>
        new ModelObservationContext<string, string>("test request", {
          provider: AiProvider.OLLAMA.value,
        } as unknown as AiOperationMetadata),
    ).toThrow("operationType cannot be null or empty");
  });

  it("when operation metadata is missing provider then throw", () => {
    expect(
      () =>
        new ModelObservationContext<string, string>("test request", {
          operationType: AiOperationType.IMAGE.value,
        } as unknown as AiOperationMetadata),
    ).toThrow("provider cannot be null or empty");
  });

  it("when response then return", () => {
    const observationContext = new ModelObservationContext<string, string>(
      "test request",
      new AiOperationMetadata(
        AiOperationType.CHAT.value,
        AiProvider.OLLAMA.value,
      ),
    );
    observationContext.response = "test response";

    expect(observationContext).toBeDefined();
  });

  it("when response is null then throw", () => {
    const observationContext = new ModelObservationContext<string, string>(
      "test request",
      new AiOperationMetadata(
        AiOperationType.CHAT.value,
        AiProvider.OLLAMA.value,
      ),
    );

    expect(() => {
      observationContext.response = null as unknown as string;
    }).toThrow("response cannot be null");
  });

  it("when empty operation type then throw", () => {
    expect(
      () =>
        new ModelObservationContext<string, string>(
          "test request",
          new AiOperationMetadata("", AiProvider.OLLAMA.value),
        ),
    ).toThrow();
  });

  it("when empty provider then throw", () => {
    expect(
      () =>
        new ModelObservationContext<string, string>(
          "test request",
          new AiOperationMetadata(AiOperationType.CHAT.value, ""),
        ),
    ).toThrow();
  });

  it("when different providers then return", () => {
    const ollamaContext = new ModelObservationContext<string, string>(
      "test request",
      new AiOperationMetadata(
        AiOperationType.CHAT.value,
        AiProvider.OLLAMA.value,
      ),
    );

    const openaiContext = new ModelObservationContext<string, string>(
      "test request",
      new AiOperationMetadata(
        AiOperationType.CHAT.value,
        AiProvider.OPENAI.value,
      ),
    );

    const anthropicContext = new ModelObservationContext<string, string>(
      "test request",
      new AiOperationMetadata(
        AiOperationType.CHAT.value,
        AiProvider.ANTHROPIC.value,
      ),
    );

    expect(ollamaContext).toBeDefined();
    expect(openaiContext).toBeDefined();
    expect(anthropicContext).toBeDefined();
  });

  it("when complex object types are used then return", () => {
    const observationContext = new ModelObservationContext<number, boolean>(
      12345,
      new AiOperationMetadata(
        AiOperationType.CHAT.value,
        AiProvider.OLLAMA.value,
      ),
    );
    observationContext.response = true;

    expect(observationContext).toBeDefined();
  });

  it("when get request then return", () => {
    const testRequest = "test request content";
    const observationContext = new ModelObservationContext<string, string>(
      testRequest,
      new AiOperationMetadata(
        AiOperationType.CHAT.value,
        AiProvider.OLLAMA.value,
      ),
    );

    expect(observationContext.request).toBe(testRequest);
  });

  it("when get response before setting then return null", () => {
    const observationContext = new ModelObservationContext<string, string>(
      "test request",
      new AiOperationMetadata(
        AiOperationType.CHAT.value,
        AiProvider.OLLAMA.value,
      ),
    );

    expect(observationContext.response).toBeNull();
  });

  it("when get response after setting then return", () => {
    const testResponse = "test response content";
    const observationContext = new ModelObservationContext<string, string>(
      "test request",
      new AiOperationMetadata(
        AiOperationType.CHAT.value,
        AiProvider.OLLAMA.value,
      ),
    );
    observationContext.response = testResponse;

    expect(observationContext.response).toBe(testResponse);
  });

  it("when get operation metadata then return", () => {
    const metadata = new AiOperationMetadata(
      AiOperationType.EMBEDDING.value,
      AiProvider.OPENAI.value,
    );
    const observationContext = new ModelObservationContext<string, string>(
      "test request",
      metadata,
    );

    expect(observationContext.operationMetadata).toBe(metadata);
  });

  it("when set response multiple times then last value wins", () => {
    const observationContext = new ModelObservationContext<string, string>(
      "test request",
      new AiOperationMetadata(
        AiOperationType.CHAT.value,
        AiProvider.OLLAMA.value,
      ),
    );

    observationContext.response = "first response";
    observationContext.response = "second response";
    observationContext.response = "final response";

    expect(observationContext.response).toBe("final response");
  });

  it("when whitespace only operation type then throw", () => {
    expect(
      () =>
        new ModelObservationContext<string, string>(
          "test request",
          new AiOperationMetadata("   ", AiProvider.OLLAMA.value),
        ),
    ).toThrow("operationType cannot be null or empty");
  });

  it("when whitespace only provider then throw", () => {
    expect(
      () =>
        new ModelObservationContext<string, string>(
          "test request",
          new AiOperationMetadata(AiOperationType.CHAT.value, "   "),
        ),
    ).toThrow("provider cannot be null or empty");
  });

  it("when empty string request then return", () => {
    const observationContext = new ModelObservationContext<string, string>(
      "",
      new AiOperationMetadata(
        AiOperationType.CHAT.value,
        AiProvider.OLLAMA.value,
      ),
    );

    expect(observationContext).toBeDefined();
    expect(observationContext.request).toBe("");
  });

  it("when empty string response then return", () => {
    const observationContext = new ModelObservationContext<string, string>(
      "test request",
      new AiOperationMetadata(
        AiOperationType.CHAT.value,
        AiProvider.OLLAMA.value,
      ),
    );
    observationContext.response = "";

    expect(observationContext.response).toBe("");
  });
});
