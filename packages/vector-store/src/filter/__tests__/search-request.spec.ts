import { describe, expect, it } from "vitest";
import { SearchRequest } from "../../search-request";
import { Filter } from "../filter";
import { FilterExpressionBuilder } from "../filter-expression-builder";
import { FilterExpressionParseException } from "../filter-expression-text-parser";

describe("SearchRequest", () => {
  it("create defaults", () => {
    const emptyRequest = SearchRequest.builder().build();
    expect(emptyRequest.query).toEqual("");
    checkDefaults(emptyRequest);
  });

  it("create query", () => {
    const emptyRequest = SearchRequest.builder().query("New Query").build();
    expect(emptyRequest.query).toEqual("New Query");
    checkDefaults(emptyRequest);
  });

  it("create from", () => {
    const originalRequest = SearchRequest.builder()
      .query("New Query")
      .topK(696)
      .similarityThreshold(0.678)
      .filterExpression("country == 'NL'")
      .build();

    const newRequest = SearchRequest.from(originalRequest).build();

    expect(newRequest).not.toBe(originalRequest);
    expect(newRequest.query).toEqual(originalRequest.query);
    expect(newRequest.topK).toEqual(originalRequest.topK);
    expect(newRequest.filterExpression).toEqual(
      originalRequest.filterExpression,
    );
    expect(newRequest.similarityThreshold).toEqual(
      originalRequest.similarityThreshold,
    );
  });

  it("query string", () => {
    const emptyRequest = SearchRequest.builder().build();
    expect(emptyRequest.query).toEqual("");

    const emptyRequest1 = SearchRequest.from(emptyRequest)
      .query("New Query")
      .build();
    expect(emptyRequest1.query).toEqual("New Query");
  });

  it("similarity threshold", () => {
    const request = SearchRequest.builder()
      .query("Test")
      .similarityThreshold(0.678)
      .build();
    expect(request.similarityThreshold).toEqual(0.678);

    const request1 = SearchRequest.from(request)
      .similarityThreshold(0.9)
      .build();
    expect(request1.similarityThreshold).toEqual(0.9);

    expect(() =>
      SearchRequest.from(request).similarityThreshold(-1),
    ).toThrowError(/Similarity threshold must be in \[0,1\] range\./);

    expect(() =>
      SearchRequest.from(request).similarityThreshold(1.1),
    ).toThrowError(/Similarity threshold must be in \[0,1\] range\./);
  });

  it("top k", () => {
    const request = SearchRequest.builder().query("Test").topK(66).build();
    expect(request.topK).toEqual(66);

    const request1 = SearchRequest.from(request).topK(89).build();
    expect(request1.topK).toEqual(89);

    expect(() => SearchRequest.from(request).topK(-1)).toThrowError(
      /TopK should be positive\./,
    );
  });

  it("filter expression", () => {
    const request = SearchRequest.builder()
      .query("Test")
      .filterExpression("country == 'BG' && year >= 2022")
      .build();
    expect(request.filterExpression).toEqual(
      new Filter.Expression(
        Filter.ExpressionType.AND,
        new Filter.Expression(
          Filter.ExpressionType.EQ,
          new Filter.Key("country"),
          new Filter.Value("BG"),
        ),
        new Filter.Expression(
          Filter.ExpressionType.GTE,
          new Filter.Key("year"),
          new Filter.Value(2022),
        ),
      ),
    );
    expect(request.hasFilterExpression()).toBe(true);

    const request1 = SearchRequest.from(request)
      .filterExpression("active == true")
      .build();
    expect(request1.filterExpression).toEqual(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("active"),
        new Filter.Value(true),
      ),
    );
    expect(request1.hasFilterExpression()).toBe(true);

    const request2 = SearchRequest.from(request)
      .filterExpression(
        new FilterExpressionBuilder().eq("country", "NL").build(),
      )
      .build();

    expect(request2.filterExpression).toEqual(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("country"),
        new Filter.Value("NL"),
      ),
    );
    expect(request2.hasFilterExpression()).toBe(true);

    const request3 = SearchRequest.from(request)
      .filterExpression(null as string | null)
      .build();
    expect(request3.filterExpression).toBeNull();
    expect(request3.hasFilterExpression()).toBe(false);

    const request4 = SearchRequest.from(request)
      .filterExpression(null as Filter.Expression | null)
      .build();
    expect(request4.filterExpression).toBeNull();
    expect(request4.hasFilterExpression()).toBe(false);

    expect(() =>
      SearchRequest.from(request).filterExpression("FooBar"),
    ).toThrowError(FilterExpressionParseException);
    expect(() =>
      SearchRequest.from(request).filterExpression("FooBar"),
    ).toThrowError(/Error: no viable alternative at input 'FooBar'/);
  });
});

function checkDefaults(request: SearchRequest): void {
  expect(request.filterExpression).toBeNull();
  expect(request.similarityThreshold).toEqual(
    SearchRequest.SIMILARITY_THRESHOLD_ACCEPT_ALL,
  );
  expect(request.topK).toEqual(SearchRequest.DEFAULT_TOP_K);
}
