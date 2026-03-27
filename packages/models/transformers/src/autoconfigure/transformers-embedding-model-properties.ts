import type { MetadataMode, ProviderConfiguration } from "@nestjs-ai/commons";
import type { PretrainedOptions } from "@xenova/transformers";

export interface TransformersEmbeddingModelCacheProperties {
  directory?: string | null;
}

export interface TransformersEmbeddingModelProperties {
  model?: string;
  cache?: TransformersEmbeddingModelCacheProperties;
  quantized?: boolean;
  config?: PretrainedOptions["config"];
  localFilesOnly?: boolean;
  revision?: string;
  metadataMode?: MetadataMode;
}

export interface TransformersEmbeddingModelConfiguration {
  providers: ProviderConfiguration[];
}
