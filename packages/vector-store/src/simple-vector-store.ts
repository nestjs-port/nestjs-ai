import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { Document } from "@nestjs-ai/commons";
import {
  VectorStoreProvider,
  VectorStoreSimilarityMetric,
} from "@nestjs-ai/commons";
import type { EmbeddingModel } from "@nestjs-ai/model";
import { SpelExpressionEvaluator, StandardContext } from "spel2js";
import { AbstractVectorStoreBuilder } from "./abstract-vector-store-builder";
import type { Filter, FilterExpressionConverter } from "./filter";
import { SimpleVectorStoreFilterExpressionConverter } from "./filter";
import {
  AbstractObservationVectorStore,
  VectorStoreObservationContext as ObservationContext,
  type VectorStoreObservationContext,
} from "./observation";
import type { SearchRequest } from "./search-request";
import { SimpleVectorStoreContent } from "./simple-vector-store-content";

export class SimpleVectorStore extends AbstractObservationVectorStore {
  private readonly _spelContext = StandardContext.create({}, {});
  private readonly _filterExpressionConverter: FilterExpressionConverter;
  protected _store = new Map<string, SimpleVectorStoreContent>();

  constructor(builder: SimpleVectorStoreBuilder) {
    super({
      embeddingModel: builder.embeddingModel,
      observationRegistry: builder.configuredObservationRegistry,
      customObservationConvention: builder.configuredObservationConvention,
      batchingStrategy: builder.configuredBatchingStrategy,
    });
    this._filterExpressionConverter =
      new SimpleVectorStoreFilterExpressionConverter();
  }

  static builder(embeddingModel: EmbeddingModel): SimpleVectorStoreBuilder {
    return new SimpleVectorStoreBuilder(embeddingModel);
  }

  protected override async doAdd(documents: Document[]): Promise<void> {
    assert(documents != null, "Documents list cannot be null");
    if (documents.length === 0) {
      throw new Error("Documents list cannot be empty");
    }

    for (const document of documents) {
      const embedding = (await this._embeddingModel.embed(
        document,
      )) as number[];
      const storeContent = new SimpleVectorStoreContent({
        id: document.id,
        text: document.text ?? "",
        metadata: document.metadata,
        embedding,
      });
      this._store.set(document.id, storeContent);
    }
  }

  protected override async doDelete(idList: string[]): Promise<void> {
    for (const id of idList) {
      this._store.delete(id);
    }
  }

  protected override async doDeleteByFilterExpression(
    filterExpression: Filter.Expression,
  ): Promise<void> {
    const predicate = this.doFilterPredicate(filterExpression);
    const idList = [...this._store.values()]
      .filter((document) => predicate(document))
      .map((document) => document.id);
    await this.doDelete(idList);
  }

  protected override async doSimilaritySearch(
    request: SearchRequest,
  ): Promise<Document[]> {
    const userQueryEmbedding = await this.getUserQueryEmbedding(request.query);
    const predicate = this.doFilterPredicate(request.filterExpression);
    return [...this._store.values()]
      .filter((document) => predicate(document))
      .map((content) =>
        content.toDocument(
          EmbeddingMath.cosineSimilarity(userQueryEmbedding, content.embedding),
        ),
      )
      .filter(
        (document) =>
          document.score != null &&
          document.score >= request.similarityThreshold,
      )
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, request.topK);
  }

  async save(filePath: string): Promise<void> {
    assert(filePath != null, "File path cannot be null");
    const parent = dirname(filePath);
    await mkdir(parent, { recursive: true });
    await writeFile(filePath, this.getVectorDbAsJson(), { encoding: "utf8" });
  }

  async load(filePath: string): Promise<void> {
    assert(filePath != null, "File path cannot be null");
    const json = await readFile(filePath, { encoding: "utf8" });
    const parsed = JSON.parse(json) as Record<string, unknown>;
    this._store = new Map(
      Object.entries(parsed).map(([id, value]) => [
        id,
        SimpleVectorStoreContent.fromJSON(
          value as {
            id?: string | null;
            text?: string;
            content?: string;
            metadata?: Record<string, unknown>;
            embedding: number[];
          },
        ),
      ]),
    );
  }

  protected override createObservationContextBuilder(
    operationName: string,
  ): VectorStoreObservationContext.Builder {
    return ObservationContext.builder(
      VectorStoreProvider.SIMPLE.value,
      operationName,
    )
      .dimensions(null)
      .collectionName("in-memory-map")
      .similarityMetric(VectorStoreSimilarityMetric.COSINE.value);
  }

  private doFilterPredicate(
    filterExpression: Filter.Expression | null,
  ): (document: SimpleVectorStoreContent) => boolean {
    if (filterExpression == null) {
      return () => true;
    }

    const expression =
      this._filterExpressionConverter.convertExpression(filterExpression);
    return (document) =>
      this.evaluateSpelExpression(expression, document.metadata) === true;
  }

  private evaluateSpelExpression(
    expression: string,
    metadata: Record<string, unknown>,
  ): boolean {
    try {
      return (
        SpelExpressionEvaluator.eval(expression, this._spelContext, {
          metadata,
        }) === true
      );
    } catch (_error) {
      const fallbackExpression = expression.replace(
        /\bnot\s+(\{[^}]+\}\.contains\([^)]*\))/g,
        "!$1",
      );
      if (fallbackExpression === expression) {
        throw _error;
      }
      return (
        SpelExpressionEvaluator.eval(fallbackExpression, this._spelContext, {
          metadata,
        }) === true
      );
    }
  }

  private getVectorDbAsJson(): string {
    const serializable = Object.fromEntries(
      [...this._store.entries()].map(([id, content]) => [id, content.toJSON()]),
    );
    return JSON.stringify(serializable, null, 2);
  }

  private async getUserQueryEmbedding(query: string): Promise<number[]> {
    return (await this._embeddingModel.embed(query)) as number[];
  }
}

export abstract class EmbeddingMath {
  static cosineSimilarity(vectorX: number[], vectorY: number[]): number {
    if (vectorX == null || vectorY == null) {
      throw new Error("Vectors must not be null");
    }
    if (vectorX.length !== vectorY.length) {
      throw new Error("Vectors lengths must be equal");
    }

    const dotProduct = EmbeddingMath.dotProduct(vectorX, vectorY);
    const normX = EmbeddingMath.norm(vectorX);
    const normY = EmbeddingMath.norm(vectorY);

    if (normX === 0 || normY === 0) {
      throw new Error("Vectors cannot have zero norm");
    }

    return dotProduct / (Math.sqrt(normX) * Math.sqrt(normY));
  }

  static dotProduct(vectorX: number[], vectorY: number[]): number {
    if (vectorX.length !== vectorY.length) {
      throw new Error("Vectors lengths must be equal");
    }

    let result = 0;
    for (let i = 0; i < vectorX.length; i += 1) {
      result += vectorX[i] * vectorY[i];
    }

    return result;
  }

  static norm(vector: number[]): number {
    return EmbeddingMath.dotProduct(vector, vector);
  }
}

export class SimpleVectorStoreBuilder extends AbstractVectorStoreBuilder<SimpleVectorStoreBuilder> {
  // biome-ignore lint/complexity/noUselessConstructor: Required to expose protected base constructor.
  constructor(embeddingModel: EmbeddingModel) {
    super(embeddingModel);
  }

  override build(): SimpleVectorStore {
    return new SimpleVectorStore(this);
  }
}
