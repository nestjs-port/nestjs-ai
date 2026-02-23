import { EmbeddingModel } from "./embedding-model";

/**
 * Abstract implementation of the {@link EmbeddingModel} interface that provides
 * dimensions calculation caching.
 */
export abstract class AbstractEmbeddingModel extends EmbeddingModel {
  private static readonly KNOWN_EMBEDDING_DIMENSIONS = new Map<string, number>([
    ["text-embedding-ada-002", 1536],
    ["text-similarity-ada-001", 1024],
    ["text-similarity-babbage-001", 2048],
    ["text-similarity-curie-001", 4096],
    ["text-similarity-davinci-001", 12288],
    ["text-search-ada-doc-001", 1024],
    ["text-search-ada-query-001", 1024],
    ["text-search-babbage-doc-001", 2048],
    ["text-search-babbage-query-001", 2048],
    ["text-search-curie-doc-001", 4096],
    ["text-search-curie-query-001", 4096],
    ["text-search-davinci-doc-001", 12288],
    ["text-search-davinci-query-001", 12288],
    ["code-search-ada-code-001", 1024],
    ["code-search-ada-text-001", 1024],
    ["code-search-babbage-code-001", 2048],
    ["code-search-babbage-text-001", 2048],
    ["sentence-transformers/all-MiniLM-L6-v2", 384],
    ["text-embedding-004", 768],
    ["text-multilingual-embedding-002", 768],
    ["multimodalembedding@001", 768],
  ]);

  /**
   * Cached embedding dimensions.
   */
  protected _embeddingDimensions = -1;

  /**
   * Return the dimension of the requested embedding model name.
   */
  static async dimensions(
    embeddingModel: EmbeddingModel,
    modelName: string,
    dummyContent: string,
  ): Promise<number> {
    if (AbstractEmbeddingModel.KNOWN_EMBEDDING_DIMENSIONS.has(modelName)) {
      // Retrieve the dimension from a pre-configured file.
      return AbstractEmbeddingModel.KNOWN_EMBEDDING_DIMENSIONS.get(modelName)!;
    }

    // Determine the dimensions empirically.
    // Generate an embedding and count the dimension size;
    return (await embeddingModel.embed(dummyContent)).length;
  }

  override async dimensions(): Promise<number> {
    if (this._embeddingDimensions < 0) {
      this._embeddingDimensions = await AbstractEmbeddingModel.dimensions(
        this,
        "Test",
        "Hello World",
      );
    }
    return this._embeddingDimensions;
  }
}
