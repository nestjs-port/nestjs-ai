import { Document } from "@nestjs-ai/commons";
import {
  Embedding,
  EmbeddingModel,
  type EmbeddingRequest,
  EmbeddingResponse,
} from "@nestjs-ai/model";
import { beforeEach, describe, expect, it } from "vitest";
import { Filter } from "../filter";
import { SearchRequest } from "../search-request";
import { SimpleVectorStore } from "../simple-vector-store";

class MockEmbeddingModel extends EmbeddingModel {
  override async call(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    return new EmbeddingResponse(
      request.instructions.map(
        (_, index) => new Embedding([0.1, 0.2, 0.3], index),
      ),
    );
  }

  protected override async embedDocument(
    _document: Document,
  ): Promise<number[]> {
    return [0.1, 0.2, 0.3];
  }
}

function expectDistanceCloseToZero(document: Document): void {
  expect(document.metadata).toHaveProperty("distance");
  expect(Number(document.metadata.distance)).toBeCloseTo(0, 12);
}

describe("SimpleVectorStoreWithFilterTests", () => {
  let vectorStore: SimpleVectorStore;

  beforeEach(() => {
    vectorStore = SimpleVectorStore.builder(new MockEmbeddingModel()).build();
  });

  it("shouldAddAndRetrieveDocumentWithFilter", async () => {
    const doc = Document.builder()
      .id("1")
      .text("test content")
      .metadata({
        country: "BG",
        year: 2020,
        activationDate: "1970-01-01T00:00:02Z",
      })
      .build();

    await vectorStore.add([doc]);

    let results = await vectorStore.similaritySearch(
      SearchRequest.builder()
        .query("test content")
        .filterExpression("country == 'BG'")
        .build(),
    );
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("1");
    expect(results[0].text).toBe("test content");
    expect(Object.keys(results[0].metadata)).toHaveLength(4);
    expectDistanceCloseToZero(results[0]);

    results = await vectorStore.similaritySearch(
      SearchRequest.builder()
        .query("test content")
        .filterExpression("country == 'KR'")
        .build(),
    );
    expect(results).toHaveLength(0);

    results = await vectorStore.similaritySearch(
      SearchRequest.builder()
        .query("test content")
        .filterExpression("country == 'BG' && year == 2020")
        .build(),
    );
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("1");
    expect(results[0].text).toBe("test content");
    expect(Object.keys(results[0].metadata)).toHaveLength(4);
    expectDistanceCloseToZero(results[0]);

    results = await vectorStore.similaritySearch(
      SearchRequest.builder()
        .query("test content")
        .filterExpression("country == 'BG' && year == 2024")
        .build(),
    );
    expect(results).toHaveLength(0);

    results = await vectorStore.similaritySearch(
      SearchRequest.builder()
        .query("test content")
        .filterExpression("country in ['BG', 'NL']")
        .build(),
    );
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("1");
    expect(results[0].text).toBe("test content");
    expect(Object.keys(results[0].metadata)).toHaveLength(4);
    expectDistanceCloseToZero(results[0]);

    results = await vectorStore.similaritySearch(
      SearchRequest.builder()
        .query("test content")
        .filterExpression("country in ['KR', 'NL']")
        .build(),
    );
    expect(results).toHaveLength(0);

    results = await vectorStore.similaritySearch(
      SearchRequest.builder()
        .query("test content")
        .filterExpression(
          new Filter.Expression(
            Filter.ExpressionType.EQ,
            new Filter.Key("activationDate"),
            new Filter.Value(new Date(2000)),
          ),
        )
        .build(),
    );
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("1");
    expect(results[0].text).toBe("test content");
    expect(Object.keys(results[0].metadata)).toHaveLength(4);
    expectDistanceCloseToZero(results[0]);

    results = await vectorStore.similaritySearch(
      SearchRequest.builder()
        .query("test content")
        .filterExpression(
          new Filter.Expression(
            Filter.ExpressionType.EQ,
            new Filter.Key("activationDate"),
            new Filter.Value(new Date(3000)),
          ),
        )
        .build(),
    );
    expect(results).toHaveLength(0);
  });

  it("shouldAddMultipleDocumentsWithFilter", async () => {
    const docs = [
      Document.builder()
        .id("1")
        .text("first")
        .metadata({
          country: "BG",
          year: 2020,
          activationDate: "1970-01-01T00:00:02Z",
        })
        .build(),
      Document.builder()
        .id("2")
        .text("second")
        .metadata({
          country: "KR",
          year: 2022,
          activationDate: "1970-01-01T00:00:03Z",
        })
        .build(),
    ];

    await vectorStore.add(docs);

    let results = await vectorStore.similaritySearch("first");
    expect(results).toHaveLength(2);
    expect(results.map((result) => result.id).sort()).toEqual(["1", "2"]);

    results = await vectorStore.similaritySearch(
      SearchRequest.builder()
        .query("first")
        .filterExpression("country == 'BG'")
        .build(),
    );
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("1");
    expect(results[0].text).toBe("first");
    expect(Object.keys(results[0].metadata)).toHaveLength(4);
    expectDistanceCloseToZero(results[0]);

    results = await vectorStore.similaritySearch(
      SearchRequest.builder()
        .query("first")
        .filterExpression("country == 'NL'")
        .build(),
    );
    expect(results).toHaveLength(0);

    results = await vectorStore.similaritySearch(
      SearchRequest.builder()
        .query("first")
        .filterExpression("country == 'BG' && year == 2020")
        .build(),
    );
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("1");
    expect(results[0].text).toBe("first");
    expect(Object.keys(results[0].metadata)).toHaveLength(4);
    expectDistanceCloseToZero(results[0]);

    results = await vectorStore.similaritySearch(
      SearchRequest.builder()
        .query("first")
        .filterExpression("country == 'KR' && year == 2022")
        .build(),
    );
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("2");
    expect(results[0].text).toBe("second");
    expect(Object.keys(results[0].metadata)).toHaveLength(4);
    expectDistanceCloseToZero(results[0]);

    results = await vectorStore.similaritySearch(
      SearchRequest.builder()
        .query("test content")
        .filterExpression("country == 'KR' && year == 2024")
        .build(),
    );
    expect(results).toHaveLength(0);

    results = await vectorStore.similaritySearch(
      SearchRequest.builder()
        .query("first")
        .filterExpression("country in ['BG', 'NL']")
        .build(),
    );
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("1");
    expect(results[0].text).toBe("first");
    expect(Object.keys(results[0].metadata)).toHaveLength(4);
    expectDistanceCloseToZero(results[0]);

    results = await vectorStore.similaritySearch(
      SearchRequest.builder()
        .query("first")
        .filterExpression("country in ['KR', 'NL']")
        .build(),
    );
    expect(results).toHaveLength(1);

    results = await vectorStore.similaritySearch(
      SearchRequest.builder()
        .query("first")
        .filterExpression(
          new Filter.Expression(
            Filter.ExpressionType.EQ,
            new Filter.Key("activationDate"),
            new Filter.Value(new Date(2000)),
          ),
        )
        .build(),
    );
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("1");
    expect(results[0].text).toBe("first");
    expect(Object.keys(results[0].metadata)).toHaveLength(4);
    expectDistanceCloseToZero(results[0]);

    results = await vectorStore.similaritySearch(
      SearchRequest.builder()
        .query("first")
        .filterExpression(
          new Filter.Expression(
            Filter.ExpressionType.AND,
            new Filter.Expression(
              Filter.ExpressionType.GTE,
              new Filter.Key("activationDate"),
              new Filter.Value(new Date(2000)),
            ),
            new Filter.Expression(
              Filter.ExpressionType.LTE,
              new Filter.Key("activationDate"),
              new Filter.Value(new Date(3000)),
            ),
          ),
        )
        .build(),
    );
    expect(results).toHaveLength(2);
    expect(results[0].id).toBe("1");
    expect(results[0].text).toBe("first");
    expect(Object.keys(results[0].metadata)).toHaveLength(4);
    expectDistanceCloseToZero(results[0]);

    results = await vectorStore.similaritySearch(
      SearchRequest.builder()
        .query("test content")
        .filterExpression(
          new Filter.Expression(
            Filter.ExpressionType.EQ,
            new Filter.Key("activationDate"),
            new Filter.Value(new Date(3000)),
          ),
        )
        .build(),
    );
    expect(results).toHaveLength(1);
  });

  it("shouldFilterByStringEquality", async () => {
    const doc = Document.builder()
      .id("1")
      .text("sample content")
      .metadata({ category: "category1" })
      .build();

    await vectorStore.add([doc]);

    const results = await vectorStore.similaritySearch(
      SearchRequest.builder()
        .query("sample")
        .filterExpression("category == 'category1'")
        .build(),
    );

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("1");
  });

  it("shouldFilterByNumericEquality", async () => {
    const doc = Document.builder()
      .id("1")
      .text("item description")
      .metadata({ value: 1 })
      .build();

    await vectorStore.add([doc]);

    const results = await vectorStore.similaritySearch(
      SearchRequest.builder()
        .query("item")
        .filterExpression("value == 1")
        .build(),
    );

    expect(results).toHaveLength(1);
    expect(results[0].metadata).toMatchObject({ value: 1 });
  });

  it("shouldFilterWithInCondition", async () => {
    const doc1 = Document.builder()
      .id("1")
      .text("entry")
      .metadata({ status: "active" })
      .build();
    const doc2 = Document.builder()
      .id("2")
      .text("entry")
      .metadata({ status: "inactive" })
      .build();

    await vectorStore.add([doc1, doc2]);

    const results = await vectorStore.similaritySearch(
      SearchRequest.builder()
        .query("entry")
        .filterExpression("status in ['active', 'pending']")
        .build(),
    );

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("1");
  });

  it("shouldFilterByNumericRange", async () => {
    const docs = [
      Document.builder().id("1").text("entity").metadata({ value: 1 }).build(),
      Document.builder().id("2").text("entity").metadata({ value: 2 }).build(),
      Document.builder().id("3").text("entity").metadata({ value: 3 }).build(),
    ];

    await vectorStore.add(docs);

    const results = await vectorStore.similaritySearch(
      SearchRequest.builder()
        .query("entity")
        .filterExpression("value >= 1 && value <= 1")
        .build(),
    );

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("1");
  });

  it("shouldReturnEmptyResultsWhenNoDocumentsMatchFilter", async () => {
    const doc = Document.builder()
      .id("1")
      .text("test")
      .metadata({ type: "document" })
      .build();

    await vectorStore.add([doc]);

    const results = await vectorStore.similaritySearch(
      SearchRequest.builder()
        .query("test")
        .filterExpression("type == 'image'")
        .build(),
    );

    expect(results).toHaveLength(0);
  });

  it("shouldFilterByBooleanValue", async () => {
    const docs = [
      Document.builder()
        .id("1")
        .text("instance")
        .metadata({ enabled: true })
        .build(),
      Document.builder()
        .id("2")
        .text("instance")
        .metadata({ enabled: false })
        .build(),
    ];

    await vectorStore.add(docs);

    const results = await vectorStore.similaritySearch(
      SearchRequest.builder()
        .query("instance")
        .filterExpression("enabled == true")
        .build(),
    );

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("1");
  });

  it("shouldFilterByNotEqual", async () => {
    const docs = [
      Document.builder()
        .id("1")
        .text("item")
        .metadata({ classification: "typeA" })
        .build(),
      Document.builder()
        .id("2")
        .text("item")
        .metadata({ classification: "typeB" })
        .build(),
    ];

    await vectorStore.add(docs);

    const results = await vectorStore.similaritySearch(
      SearchRequest.builder()
        .query("item")
        .filterExpression("classification != 'typeB'")
        .build(),
    );

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("1");
  });
});
