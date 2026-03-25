import { Document, MetadataMode } from "@nestjs-ai/commons";
import type { EmbeddingResponse } from "@nestjs-ai/model";
import { describe, expect, it, vi } from "vitest";

const { pipelineMock } = vi.hoisted(() => {
  const pipelineMock = vi.fn();
  return { pipelineMock };
});

vi.mock("@xenova/transformers", () => ({
  env: {
    cacheDir: ".cache",
  },
  pipeline: pipelineMock,
}));

import { TransformersEmbeddingModel } from "../transformers-embedding-model";

const DF = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 5,
});

describe("TransformersEmbeddingModel", () => {
  const helloWorldVector = createVector(
    -0.19744634628295898,
    0.17298996448516846,
  );
  const worldIsBigVector = createVector(
    0.4293745160102844,
    0.05501303821802139,
  );

  it("embed", async () => {
    const embeddingModel = await createEmbeddingModel();
    const embed = await embeddingModel.embed("Hello world");

    expect(embed).toHaveLength(384);
    expect(format(embed[0])).toBe(format(-0.19744634628295898));
    expect(format(embed[383])).toBe(format(0.17298996448516846));
  });

  it("embed document", async () => {
    const embeddingModel = await createEmbeddingModel();
    const embed = await embeddingModel.embed(new Document("Hello world"));

    expect(embed).toHaveLength(384);
    expect(format(embed[0])).toBe(format(-0.19744634628295898));
    expect(format(embed[383])).toBe(format(0.17298996448516846));
  });

  it("embed list", async () => {
    const embeddingModel = await createEmbeddingModel();
    const embed = (await embeddingModel.embed([
      "Hello world",
      "World is big",
    ])) as number[][];

    expect(embed).toHaveLength(2);
    expect(embed[0]).toHaveLength(384);
    expect(format(embed[0][0])).toBe(format(-0.19744634628295898));
    expect(format(embed[0][383])).toBe(format(0.17298996448516846));

    expect(embed[1]).toHaveLength(384);
    expect(format(embed[1][0])).toBe(format(0.4293745160102844));
    expect(format(embed[1][383])).toBe(format(0.05501303821802139));

    expect(embed[0]).not.toBe(embed[1]);
  });

  it("embed for response", async () => {
    const embeddingModel = await createEmbeddingModel();
    const embed = (await embeddingModel.embedForResponse([
      "Hello world",
      "World is big",
    ])) as EmbeddingResponse;

    expect(embed.results).toHaveLength(2);
    expect(embed.metadata.isEmpty()).toBe(true);

    expect(embed.results[0].output).toHaveLength(384);
    expect(format(embed.results[0].output[0])).toBe(
      format(-0.19744634628295898),
    );
    expect(format(embed.results[0].output[383])).toBe(
      format(0.17298996448516846),
    );

    expect(embed.results[1].output).toHaveLength(384);
    expect(format(embed.results[1].output[0])).toBe(format(0.4293745160102844));
    expect(format(embed.results[1].output[383])).toBe(
      format(0.05501303821802139),
    );
  });

  it("dimensions", async () => {
    const embeddingModel = await createEmbeddingModel();

    expect(await embeddingModel.dimensions()).toBe(384);
    expect(await embeddingModel.dimensions()).toBe(384);
  });

  async function createEmbeddingModel(): Promise<TransformersEmbeddingModel> {
    pipelineMock.mockResolvedValueOnce(createFeatureExtractor());
    const embeddingModel = new TransformersEmbeddingModel({
      metadataMode: MetadataMode.NONE,
    });
    await embeddingModel.onModuleInit();
    return embeddingModel;
  }

  function createFeatureExtractor() {
    const featureExtractor = async (
      input: string | string[],
    ): Promise<{ tolist: () => number[] | number[][] }> => {
      if (typeof input === "string") {
        return {
          tolist: () => vectorForText(input),
        };
      }

      return {
        tolist: () => input.map((text) => vectorForText(text)),
      };
    };

    return Object.assign(featureExtractor, {
      tokenizer: vi.fn(),
    });
  }

  function vectorForText(text: string): number[] {
    const normalized = text.toLowerCase();
    if (normalized.includes("hello world")) {
      return helloWorldVector;
    }
    if (normalized.includes("world is big")) {
      return worldIsBigVector;
    }
    return createVector(0.1, 0.1);
  }
});

function createVector(first: number, last: number): number[] {
  const vector = new Array<number>(384).fill(0);
  vector[0] = first;
  vector[383] = last;
  return vector;
}

function format(value: number): string {
  return DF.format(value);
}
