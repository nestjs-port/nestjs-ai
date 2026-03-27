import assert from "node:assert/strict";
import {
  type Document,
  MetadataMode,
  NoopObservationRegistry,
  type ObservationRegistry,
} from "@nestjs-ai/commons";
import {
  AbstractEmbeddingModel,
  DefaultEmbeddingModelObservationConvention,
  Embedding,
  EmbeddingModelObservationContext,
  type EmbeddingModelObservationConvention,
  EmbeddingModelObservationDocumentation,
  type EmbeddingRequest,
  EmbeddingResponse,
  EmbeddingResponseMetadata,
} from "@nestjs-ai/model";
import {
  env,
  type FeatureExtractionPipelineOptions,
  type FeatureExtractionPipelineType,
  type PretrainedOptions,
  pipeline,
  type Tensor,
} from "@xenova/transformers";

export interface TransformersEmbeddingModelProps {
  model?: string;
  cacheDir?: string | null;
  quantized?: boolean;
  config?: PretrainedOptions["config"];
  localFilesOnly?: boolean;
  revision?: string;
  metadataMode?: MetadataMode;
  observationRegistry?: ObservationRegistry;
}

/**
 * Embedding model backed by `@xenova/transformers`.
 */
export class TransformersEmbeddingModel extends AbstractEmbeddingModel {
  static readonly DEFAULT_MODEL = "Xenova/all-MiniLM-L6-v2";

  private _metadataMode: MetadataMode;
  private _model: string;
  private _cacheDir: string | null;
  private _quantized: boolean;
  private _config: PretrainedOptions["config"] | null;
  private _localFilesOnly: boolean;
  private _revision: string | undefined;
  private readonly _observationRegistry: ObservationRegistry;
  private _observationConvention: EmbeddingModelObservationConvention =
    new DefaultEmbeddingModelObservationConvention();
  private _featureExtractor: FeatureExtractionPipelineType | null = null;

  constructor(props: TransformersEmbeddingModelProps = {}) {
    super();
    this._model = props.model ?? TransformersEmbeddingModel.DEFAULT_MODEL;
    this._cacheDir = props.cacheDir ?? null;
    this._quantized = props.quantized ?? false;
    this._config = props.config ?? null;
    this._localFilesOnly = props.localFilesOnly ?? false;
    this._revision = props.revision;
    this._metadataMode = props.metadataMode ?? MetadataMode.NONE;
    this._observationRegistry =
      props.observationRegistry ?? NoopObservationRegistry.INSTANCE;
  }

  setModel(model: string): void {
    assert(model, "model cannot be null");
    this._model = model;
    this._featureExtractor = null;
  }

  setCacheDir(cacheDir: string | null): void {
    this._cacheDir = cacheDir;
    this._featureExtractor = null;
  }

  setQuantized(quantized: boolean): void {
    this._quantized = quantized;
    this._featureExtractor = null;
  }

  setConfig(config: PretrainedOptions["config"] | null): void {
    this._config = config;
    this._featureExtractor = null;
  }

  setLocalFilesOnly(localFilesOnly: boolean): void {
    this._localFilesOnly = localFilesOnly;
    this._featureExtractor = null;
  }

  setRevision(revision: string | undefined): void {
    this._revision = revision;
    this._featureExtractor = null;
  }

  setMetadataMode(metadataMode: MetadataMode): void {
    assert(metadataMode != null, "metadataMode cannot be null");
    this._metadataMode = metadataMode;
  }

  setObservationConvention(
    observationConvention: EmbeddingModelObservationConvention,
  ): void {
    assert(observationConvention, "observationConvention cannot be null");
    this._observationConvention = observationConvention;
  }

  protected override async embedDocument(
    document: Document,
  ): Promise<number[]> {
    return await this.embed(document.getFormattedContent(this._metadataMode));
  }

  async onModuleInit(): Promise<void> {
    const cacheDir = this._cacheDir ?? env.cacheDir;
    this._featureExtractor = await pipeline("feature-extraction", this._model, {
      quantized: this._quantized,
      cache_dir: cacheDir,
      config: this._config ?? undefined,
      local_files_only: this._localFilesOnly,
      revision: this._revision,
    });
  }

  override async call(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    assert(request, "EmbeddingRequest must not be null");
    assert(request.instructions != null, "Instructions must not be null");

    const observationContext = new EmbeddingModelObservationContext(
      request,
      "transformers",
    );

    const observation =
      new EmbeddingModelObservationDocumentation().observation(
        this._observationConvention,
        new DefaultEmbeddingModelObservationConvention(),
        () => observationContext,
        this._observationRegistry,
      );

    return observation.observe(async () => {
      if (request.instructions.length === 0) {
        const response = new EmbeddingResponse(
          [],
          new EmbeddingResponseMetadata(this._model),
        );
        observationContext.response = response;
        return response;
      }

      assert(
        this._featureExtractor,
        "Transformers feature extractor has not been initialized. Call onModuleInit() first.",
      );

      const featureExtractor = this._featureExtractor;
      const output = await featureExtractor(
        request.instructions.length === 1
          ? request.instructions[0]
          : request.instructions,
        this.getFeatureExtractionOptions(),
      );

      const embeddings = this.toEmbeddings(output);
      const response = new EmbeddingResponse(
        embeddings.map((embedding, index) => new Embedding(embedding, index)),
        new EmbeddingResponseMetadata(this._model),
      );

      observationContext.response = response;
      return response;
    });
  }

  private getFeatureExtractionOptions(): FeatureExtractionPipelineOptions {
    return {
      pooling: "mean",
      normalize: true,
    };
  }

  private toEmbeddings(tensor: Tensor): number[][] {
    const values = tensor.tolist() as number[] | number[][];
    if (values.length === 0) {
      return [];
    }

    if (Array.isArray(values[0])) {
      return values as number[][];
    }

    return [values as number[]];
  }
}
