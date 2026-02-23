import { AiOperationType } from "@nestjs-ai/commons";
import { describe, expect, it } from "vitest";
import { EmbeddingRequest } from "../../embedding-request";
import { EmbeddingModelObservationContext } from "../embedding-model-observation-context";

describe("EmbeddingModelObservationContext", () => {
  it("sets embedding operation metadata", () => {
    const request = new EmbeddingRequest(["test input"], null);
    const context = new EmbeddingModelObservationContext(
      request,
      "test-provider",
    );

    expect(context.operationMetadata.operationType).toBe(
      AiOperationType.EMBEDDING.value,
    );
    expect(context.operationMetadata.provider).toBe("test-provider");
  });

  it("allows request with null options", () => {
    const request = new EmbeddingRequest(["test input"], null);

    const context = new EmbeddingModelObservationContext(
      request,
      "test-provider",
    );

    expect(context.request.options).toBeNull();
  });
});
