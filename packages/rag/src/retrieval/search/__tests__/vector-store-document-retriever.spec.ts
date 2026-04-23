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

import { Document } from "@nestjs-ai/commons";
import {
  Filter,
  FilterExpressionBuilder,
  SearchRequest,
  type VectorStore,
} from "@nestjs-ai/vector-store";
import { describe, expect, it, vi } from "vitest";
import { Query } from "../../../query.js";
import { VectorStoreDocumentRetriever } from "../vector-store-document-retriever.js";

describe("VectorStoreDocumentRetriever", () => {
  it("when vector store is null then throw", () => {
    expect(
      () =>
        new VectorStoreDocumentRetriever({
          vectorStore: null as unknown as VectorStore,
        }),
    ).toThrow("vectorStore cannot be null");
  });

  it("when top k is zero then throw", () => {
    expect(
      () =>
        new VectorStoreDocumentRetriever({
          vectorStore: createMockVectorStore().mockVectorStore,
          topK: 0,
        }),
    ).toThrow("topK must be greater than 0");
  });

  it("when top k is negative then throw", () => {
    expect(
      () =>
        new VectorStoreDocumentRetriever({
          vectorStore: createMockVectorStore().mockVectorStore,
          topK: -1,
        }),
    ).toThrow("topK must be greater than 0");
  });

  it("when similarity threshold is negative then throw", () => {
    expect(
      () =>
        new VectorStoreDocumentRetriever({
          vectorStore: createMockVectorStore().mockVectorStore,
          similarityThreshold: -1.0,
        }),
    ).toThrow("similarityThreshold must be equal to or greater than 0.0");
  });

  it("search request parameters", async () => {
    const { mockVectorStore, similaritySearch } = createMockVectorStore();
    const documentRetriever = new VectorStoreDocumentRetriever({
      vectorStore: mockVectorStore,
      similarityThreshold: 0.73,
      topK: 5,
      filterExpression: new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("location"),
        new Filter.Value("Rivendell"),
      ),
    });

    await documentRetriever.retrieve(new Query("query"));

    expect(similaritySearch).toHaveBeenCalledTimes(1);
    const searchRequest = similaritySearch.mock.calls[0]?.[0] as SearchRequest;
    expect(searchRequest.query).toBe("query");
    expect(searchRequest.similarityThreshold).toBe(0.73);
    expect(searchRequest.topK).toBe(5);
    expect(searchRequest.filterExpression).toEqual(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("location"),
        new Filter.Value("Rivendell"),
      ),
    );
  });

  it("dynamic filter expressions", async () => {
    const { mockVectorStore, similaritySearch } = createMockVectorStore();
    const documentRetriever = new VectorStoreDocumentRetriever({
      vectorStore: mockVectorStore,
      filterExpression: () =>
        new FilterExpressionBuilder()
          .eq("tenantId", getTenantIdentifier())
          .build(),
    });

    setTenantIdentifier("tenant1");
    await documentRetriever.retrieve(new Query("query"));
    clearTenantIdentifier();

    setTenantIdentifier("tenant2");
    await documentRetriever.retrieve(new Query("query"));
    clearTenantIdentifier();

    expect(similaritySearch).toHaveBeenCalledTimes(2);

    const searchRequest1 = similaritySearch.mock.calls[0]?.[0] as SearchRequest;
    expect(searchRequest1.filterExpression).toEqual(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("tenantId"),
        new Filter.Value("tenant1"),
      ),
    );

    const searchRequest2 = similaritySearch.mock.calls[1]?.[0] as SearchRequest;
    expect(searchRequest2.filterExpression).toEqual(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("tenantId"),
        new Filter.Value("tenant2"),
      ),
    );
  });

  it("when query object is null then throw", () => {
    const documentRetriever = new VectorStoreDocumentRetriever({
      vectorStore: createMockVectorStore().mockVectorStore,
    });

    const nullQuery = null as unknown as Query;
    expect(() => documentRetriever.retrieve(nullQuery)).toThrow(
      "query cannot be null",
    );
  });

  it("default values are applied when not specified", async () => {
    const { mockVectorStore, similaritySearch } = createMockVectorStore();
    const documentRetriever = new VectorStoreDocumentRetriever({
      vectorStore: mockVectorStore,
    });

    await documentRetriever.retrieve(new Query("test query"));

    expect(similaritySearch).toHaveBeenCalledTimes(1);
    const searchRequest = similaritySearch.mock.calls[0]?.[0] as SearchRequest;
    expect(searchRequest.similarityThreshold).toBe(
      SearchRequest.SIMILARITY_THRESHOLD_ACCEPT_ALL,
    );
    expect(searchRequest.topK).toBe(SearchRequest.DEFAULT_TOP_K);
    expect(searchRequest.filterExpression).toBeNull();
  });

  it("retrieve with query object", async () => {
    const { mockVectorStore, similaritySearch } = createMockVectorStore();
    const documentRetriever = new VectorStoreDocumentRetriever({
      vectorStore: mockVectorStore,
      similarityThreshold: 0.85,
      topK: 3,
      filterExpression: new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("category"),
        new Filter.Value("books"),
      ),
    });

    const query = new Query("test query");
    await documentRetriever.retrieve(query);

    expect(similaritySearch).toHaveBeenCalledTimes(1);
    const searchRequest = similaritySearch.mock.calls[0]?.[0] as SearchRequest;
    expect(searchRequest.query).toBe("test query");
    expect(searchRequest.similarityThreshold).toBe(0.85);
    expect(searchRequest.topK).toBe(3);
    expect(searchRequest.filterExpression).toEqual(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("category"),
        new Filter.Value("books"),
      ),
    );
  });

  it("retrieve with query object and default values", async () => {
    const mockDocuments = [
      new Document("content1", { id: "1" }),
      new Document("content2", { id: "2" }),
    ];
    const { mockVectorStore, similaritySearch } =
      createMockVectorStore(mockDocuments);
    const documentRetriever = new VectorStoreDocumentRetriever({
      vectorStore: mockVectorStore,
    });

    // Setup mock to return some documents
    const query = new Query("test query");
    const result = await documentRetriever.retrieve(query);

    // Verify the mock interaction
    expect(similaritySearch).toHaveBeenCalledTimes(1);

    // Verify the search request
    const searchRequest = similaritySearch.mock.calls[0]?.[0] as SearchRequest;
    expect(searchRequest.query).toBe("test query");
    expect(searchRequest.similarityThreshold).toBe(
      SearchRequest.SIMILARITY_THRESHOLD_ACCEPT_ALL,
    );
    expect(searchRequest.topK).toBe(SearchRequest.DEFAULT_TOP_K);
    expect(searchRequest.filterExpression).toBeNull();

    // Verify the returned documents
    expect(result).toHaveLength(2);
    expect(result).toEqual(mockDocuments);
  });

  it("retrieve with query object and request filter expression", async () => {
    const { mockVectorStore, similaritySearch } = createMockVectorStore();
    const documentRetriever = new VectorStoreDocumentRetriever({
      vectorStore: mockVectorStore,
    });

    const query = Query.builder()
      .text("test query")
      .context({
        [VectorStoreDocumentRetriever.FILTER_EXPRESSION]:
          "location == 'Rivendell'",
      })
      .build();
    await documentRetriever.retrieve(query);

    // Verify the mock interaction
    expect(similaritySearch).toHaveBeenCalledTimes(1);

    // Verify the search request
    const searchRequest = similaritySearch.mock.calls[0]?.[0] as SearchRequest;
    expect(searchRequest.query).toBe("test query");
    expect(searchRequest.similarityThreshold).toBe(
      SearchRequest.SIMILARITY_THRESHOLD_ACCEPT_ALL,
    );
    expect(searchRequest.topK).toBe(SearchRequest.DEFAULT_TOP_K);
    expect(searchRequest.filterExpression).toEqual(
      new FilterExpressionBuilder().eq("location", "Rivendell").build(),
    );
  });

  it("retrieve with query object and filter expression object", async () => {
    const { mockVectorStore, similaritySearch } = createMockVectorStore();
    const documentRetriever = new VectorStoreDocumentRetriever({
      vectorStore: mockVectorStore,
    });

    // Create a Filter.Expression object directly
    const filterExpression = new Filter.Expression(
      Filter.ExpressionType.EQ,
      new Filter.Key("location"),
      new Filter.Value("Rivendell"),
    );

    const query = Query.builder()
      .text("test query")
      .context({
        [VectorStoreDocumentRetriever.FILTER_EXPRESSION]: filterExpression,
      })
      .build();
    await documentRetriever.retrieve(query);

    // Verify the mock interaction
    expect(similaritySearch).toHaveBeenCalledTimes(1);

    // Verify the search request
    const searchRequest = similaritySearch.mock.calls[0]?.[0] as SearchRequest;
    expect(searchRequest.query).toBe("test query");
    expect(searchRequest.similarityThreshold).toBe(
      SearchRequest.SIMILARITY_THRESHOLD_ACCEPT_ALL,
    );
    expect(searchRequest.topK).toBe(SearchRequest.DEFAULT_TOP_K);
    expect(searchRequest.filterExpression).toEqual(filterExpression);
  });
});

function createMockVectorStore(returnValue: Document[] = []) {
  const similaritySearch = vi.fn(
    async (_request: SearchRequest): Promise<Document[]> => returnValue,
  );
  return {
    mockVectorStore: {
      similaritySearch,
    } as unknown as VectorStore,
    similaritySearch,
  };
}

let tenantIdentifier: string | null;

function setTenantIdentifier(tenant: string): void {
  if (tenant.trim().length === 0) {
    throw new Error("tenant cannot be null or empty");
  }
  tenantIdentifier = tenant;
}

function getTenantIdentifier(): string | null {
  return tenantIdentifier;
}

function clearTenantIdentifier(): void {
  tenantIdentifier = null;
}
