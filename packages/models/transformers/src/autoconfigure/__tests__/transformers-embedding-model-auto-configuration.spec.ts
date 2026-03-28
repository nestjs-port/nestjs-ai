import {
  EMBEDDING_MODEL_TOKEN,
  MetadataMode,
  NoopObservationRegistry,
} from "@nestjs-ai/commons";
import { DefaultEmbeddingModelObservationConvention } from "@nestjs-ai/model";
import { describe, expect, it } from "vitest";
import {
  configureTransformersEmbeddingModel,
  createTransformersEmbeddingModel,
} from "../transformers-embedding-model-auto-configuration";

describe("TransformersEmbeddingModelAutoConfiguration", () => {
  it("wires model provider and observation handlers", () => {
    const configuration = configureTransformersEmbeddingModel();

    expect(configuration.providers).toHaveLength(2);
    expect(
      configuration.providers.some(
        (provider) => provider.token === EMBEDDING_MODEL_TOKEN,
      ),
    ).toBe(true);
  });

  it("maps properties into the model", () => {
    const observationRegistry = NoopObservationRegistry.INSTANCE;
    const observationConvention =
      new DefaultEmbeddingModelObservationConvention();

    const model = createTransformersEmbeddingModel(
      {
        model: "Xenova/custom-model",
        cache: { directory: "/tmp/transformers-cache" },
        quantized: true,
        config: { pad_token_id: 0 },
        localFilesOnly: true,
        revision: "main",
        metadataMode: MetadataMode.ALL,
      },
      observationRegistry,
      observationConvention,
    ) as unknown as {
      _model: string;
      _cacheDir: string | null;
      _quantized: boolean;
      _config: Record<string, unknown> | null;
      _localFilesOnly: boolean;
      _revision: string | undefined;
      _metadataMode: MetadataMode;
      _observationRegistry: typeof observationRegistry;
      _observationConvention: DefaultEmbeddingModelObservationConvention;
    };

    expect(model._model).toBe("Xenova/custom-model");
    expect(model._cacheDir).toBe("/tmp/transformers-cache");
    expect(model._quantized).toBe(true);
    expect(model._config).toEqual({ pad_token_id: 0 });
    expect(model._localFilesOnly).toBe(true);
    expect(model._revision).toBe("main");
    expect(model._metadataMode).toBe(MetadataMode.ALL);
    expect(model._observationRegistry).toBe(observationRegistry);
    expect(model._observationConvention).toBe(observationConvention);
  });
});
