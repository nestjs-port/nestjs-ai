import { describe, expect, it, vi } from "vitest";
import { AbstractEmbeddingModel } from "../abstract-embedding-model";
import type { EmbeddingModel } from "../embedding-model";

describe("AbstractEmbeddingModel", () => {
  it("unknown model dimension", async () => {
    const embedMock = vi
      .fn<(text: string) => Promise<number[]>>()
      .mockResolvedValue([0.1, 0.1, 0.1]);
    const embeddingModel = { embed: embedMock } as unknown as EmbeddingModel;

    await expect(
      AbstractEmbeddingModel.dimensions(
        embeddingModel,
        "unknown_model",
        "Hello world!",
      ),
    ).resolves.toBe(3);
    expect(embedMock).toHaveBeenCalledOnce();
    expect(embedMock).toHaveBeenCalledWith("Hello world!");
  });
});
