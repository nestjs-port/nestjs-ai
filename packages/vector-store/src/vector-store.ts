import assert from "node:assert/strict";
import type {
  Document,
  DocumentWriter,
  ObservationRegistry,
} from "@nestjs-ai/commons";
import type { BatchingStrategy } from "@nestjs-ai/model";
import type { Filter } from "./filter";
import type { VectorStoreObservationConvention } from "./observation";
import { SearchRequest } from "./search-request";
import { VectorStoreRetriever } from "./vector-store-retriever";

export abstract class VectorStore
  extends VectorStoreRetriever
  implements DocumentWriter
{
  get name(): string {
    return this.constructor.name;
  }

  abstract add(documents: Document[]): Promise<void>;

  async write(documents: Document[]): Promise<void> {
    await this.add(documents);
  }

  delete(idList: string[]): Promise<void>;
  delete(filterExpression: Filter.Expression): Promise<void>;
  delete(filterExpression: string): Promise<void>;
  async delete(
    idListOrFilterExpression: string[] | Filter.Expression | string,
  ): Promise<void> {
    if (Array.isArray(idListOrFilterExpression)) {
      await this.deleteByIdList(idListOrFilterExpression);
      return;
    }

    if (typeof idListOrFilterExpression === "string") {
      const searchRequest = SearchRequest.builder()
        .filterExpression(idListOrFilterExpression)
        .build();
      const textExpression = searchRequest.filterExpression;
      assert(textExpression != null, "Filter expression must not be null");
      await this.deleteByFilterExpression(textExpression);
      return;
    }

    await this.deleteByFilterExpression(idListOrFilterExpression);
  }

  protected abstract deleteByIdList(idList: string[]): Promise<void>;

  protected abstract deleteByFilterExpression(
    filterExpression: Filter.Expression,
  ): Promise<void>;

  getNativeClient<T>(): T | null {
    return null;
  }
}

export namespace VectorStore {
  export interface Builder<T extends Builder<T>> {
    observationRegistry(observationRegistry: ObservationRegistry): T;

    customObservationConvention(
      convention: VectorStoreObservationConvention | null,
    ): T;

    batchingStrategy(batchingStrategy: BatchingStrategy): T;

    build(): VectorStore;
  }
}
