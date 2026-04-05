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

import type { FactoryProvider } from "@nestjs/common";
import {
  EMBEDDING_MODEL_TOKEN,
  MetadataMode,
  NoopObservationRegistry,
} from "@nestjs-ai/commons";
import { DefaultEmbeddingModelObservationConvention } from "@nestjs-ai/model";
import { describe, expect, it } from "vitest";
import {
  TRANSFORMERS_EMBEDDING_PROPERTIES_TOKEN,
  TransformersEmbeddingModelModule,
} from "../transformers-embedding-model.module";
import type { TransformersEmbeddingModelProperties } from "../transformers-embedding-model-properties";

describe("TransformersEmbeddingModelModule", () => {
  it("registers observation and embedding model providers via forFeature", () => {
    const dynamicModule = TransformersEmbeddingModelModule.forFeature();
    const providers = dynamicModule.providers as FactoryProvider[];

    expect(providers.some((p) => p.provide === EMBEDDING_MODEL_TOKEN)).toBe(
      true,
    );
    expect(
      providers.some(
        (p) => p.provide === TRANSFORMERS_EMBEDDING_PROPERTIES_TOKEN,
      ),
    ).toBe(true);
  });

  it("injects properties via TRANSFORMERS_EMBEDDING_PROPERTIES_TOKEN", () => {
    const dynamicModule = TransformersEmbeddingModelModule.forFeature();
    const providers = dynamicModule.providers as FactoryProvider[];

    const modelProvider = providers.find(
      (p) => p.provide === EMBEDDING_MODEL_TOKEN,
    ) as FactoryProvider;

    expect(modelProvider.inject).toContain(
      TRANSFORMERS_EMBEDDING_PROPERTIES_TOKEN,
    );
  });

  it("exports feature providers but not the properties token", () => {
    const dynamicModule = TransformersEmbeddingModelModule.forFeature();
    const exports = dynamicModule.exports as symbol[];

    expect(exports).toContain(EMBEDDING_MODEL_TOKEN);
    expect(exports).not.toContain(TRANSFORMERS_EMBEDDING_PROPERTIES_TOKEN);
  });

  it("maps properties into the model", () => {
    const dynamicModule = TransformersEmbeddingModelModule.forFeature();
    const providers = dynamicModule.providers as FactoryProvider[];

    const modelProvider = providers.find(
      (p) => p.provide === EMBEDDING_MODEL_TOKEN,
    ) as FactoryProvider;

    const observationRegistry = NoopObservationRegistry.INSTANCE;
    const observationConvention =
      new DefaultEmbeddingModelObservationConvention();

    const properties: TransformersEmbeddingModelProperties = {
      model: "Xenova/custom-model",
      cache: { directory: "/tmp/transformers-cache" },
      quantized: true,
      config: { pad_token_id: 0 },
      localFilesOnly: true,
      revision: "main",
      metadataMode: MetadataMode.ALL,
    };

    const model = (modelProvider.useFactory as (...args: unknown[]) => unknown)(
      properties,
      observationRegistry,
      observationConvention,
    ) as {
      _model: string;
      _cacheDir: string | null;
      _quantized: boolean;
      _config: Record<string, unknown> | null;
      _localFilesOnly: boolean;
      _revision: string | undefined;
      _metadataMode: MetadataMode;
      _observationRegistry: unknown;
      _observationConvention: unknown;
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

  it("registers async properties provider via forFeatureAsync", () => {
    const dynamicModule = TransformersEmbeddingModelModule.forFeatureAsync({
      useFactory: () => ({ model: "Xenova/async-model" }),
    });
    const providers = dynamicModule.providers as FactoryProvider[];

    const propertiesProvider = providers.find(
      (p) => p.provide === TRANSFORMERS_EMBEDDING_PROPERTIES_TOKEN,
    ) as FactoryProvider;

    expect(propertiesProvider).toBeDefined();
    expect(propertiesProvider.useFactory).toBeDefined();
  });
});
