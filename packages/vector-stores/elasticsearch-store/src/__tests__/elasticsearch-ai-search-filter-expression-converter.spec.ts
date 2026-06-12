/*
 * Copyright 2026-present the original author or authors.
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

import { describe, expect, it } from "vitest";

import { Filter } from "@nestjs-ai/vector-store";

import { ElasticsearchAiSearchFilterExpressionConverter } from "../elasticsearch-ai-search-filter-expression-converter.js";

describe("ElasticsearchAiSearchFilterExpressionConverter", () => {
  const converter = new ElasticsearchAiSearchFilterExpressionConverter();

  it("test date", () => {
    let vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("activationDate"),
        new Filter.Value(new Date(1704637752148)),
      ),
    );
    expect(vectorExpr).toBe("metadata.activationDate:2024-01-07T14:29:12Z");

    vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("activationDate"),
        new Filter.Value("1970-01-01T00:00:02Z"),
      ),
    );
    expect(vectorExpr).toBe("metadata.activationDate:1970-01-01T00:00:02Z");
  });

  it("test dates concurrently", async () => {
    await Promise.all(
      Array.from({ length: 10 }, async () => {
        const vectorExpr = converter.convertExpression(
          new Filter.Expression(
            Filter.ExpressionType.EQ,
            new Filter.Key("activationDate"),
            new Filter.Value(new Date(1704637752148)),
          ),
        );
        const vectorExpr2 = converter.convertExpression(
          new Filter.Expression(
            Filter.ExpressionType.EQ,
            new Filter.Key("activationDate"),
            new Filter.Value(new Date(1704637753150)),
          ),
        );
        expect(vectorExpr).toBe("metadata.activationDate:2024-01-07T14:29:12Z");
        expect(vectorExpr2).toBe(
          "metadata.activationDate:2024-01-07T14:29:13Z",
        );
      }),
    );
  });

  it("test eq", () => {
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("country"),
        new Filter.Value("BG"),
      ),
    );
    expect(vectorExpr).toBe('metadata.country:"BG"');
  });

  it("tes eq and gte", () => {
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.AND,
        new Filter.Expression(
          Filter.ExpressionType.EQ,
          new Filter.Key("genre"),
          new Filter.Value("drama"),
        ),
        new Filter.Expression(
          Filter.ExpressionType.GTE,
          new Filter.Key("year"),
          new Filter.Value(2020),
        ),
      ),
    );
    expect(vectorExpr).toBe('metadata.genre:"drama" AND metadata.year:>=2020');
  });

  it("tes in", () => {
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.IN,
        new Filter.Key("genre"),
        new Filter.Value(["comedy", "documentary", "drama"]),
      ),
    );
    expect(vectorExpr).toBe(
      'metadata.genre:("comedy" OR "documentary" OR "drama")',
    );
  });

  it("test ne", () => {
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.OR,
        new Filter.Expression(
          Filter.ExpressionType.GTE,
          new Filter.Key("year"),
          new Filter.Value(2020),
        ),
        new Filter.Expression(
          Filter.ExpressionType.AND,
          new Filter.Expression(
            Filter.ExpressionType.EQ,
            new Filter.Key("country"),
            new Filter.Value("BG"),
          ),
          new Filter.Expression(
            Filter.ExpressionType.NE,
            new Filter.Key("city"),
            new Filter.Value("Sofia"),
          ),
        ),
      ),
    );
    expect(vectorExpr).toBe(
      'metadata.year:>=2020 OR metadata.country:"BG" AND metadata.city: NOT "Sofia"',
    );
  });

  it("test group", () => {
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.AND,
        new Filter.Group(
          new Filter.Expression(
            Filter.ExpressionType.OR,
            new Filter.Expression(
              Filter.ExpressionType.GTE,
              new Filter.Key("year"),
              new Filter.Value(2020),
            ),
            new Filter.Expression(
              Filter.ExpressionType.EQ,
              new Filter.Key("country"),
              new Filter.Value("BG"),
            ),
          ),
        ),
        new Filter.Expression(
          Filter.ExpressionType.NIN,
          new Filter.Key("city"),
          new Filter.Value(["Sofia", "Plovdiv"]),
        ),
      ),
    );
    expect(vectorExpr).toBe(
      '(metadata.year:>=2020 OR metadata.country:"BG") AND NOT metadata.city:("Sofia" OR "Plovdiv")',
    );
  });

  it("tes boolean", () => {
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.AND,
        new Filter.Expression(
          Filter.ExpressionType.AND,
          new Filter.Expression(
            Filter.ExpressionType.EQ,
            new Filter.Key("isOpen"),
            new Filter.Value(true),
          ),
          new Filter.Expression(
            Filter.ExpressionType.GTE,
            new Filter.Key("year"),
            new Filter.Value(2020),
          ),
        ),
        new Filter.Expression(
          Filter.ExpressionType.IN,
          new Filter.Key("country"),
          new Filter.Value(["BG", "NL", "US"]),
        ),
      ),
    );

    expect(vectorExpr).toBe(
      'metadata.isOpen:true AND metadata.year:>=2020 AND metadata.country:("BG" OR "NL" OR "US")',
    );
  });

  it("test decimal", () => {
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.AND,
        new Filter.Expression(
          Filter.ExpressionType.GTE,
          new Filter.Key("temperature"),
          new Filter.Value(-15.6),
        ),
        new Filter.Expression(
          Filter.ExpressionType.LTE,
          new Filter.Key("temperature"),
          new Filter.Value(20.13),
        ),
      ),
    );

    expect(vectorExpr).toBe(
      "metadata.temperature:>=-15.6 AND metadata.temperature:<=20.13",
    );
  });

  it("test complex identifiers", () => {
    let vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("country 1 2 3"),
        new Filter.Value("BG"),
      ),
    );
    expect(vectorExpr).toBe('metadata.country\\ 1\\ 2\\ 3:"BG"');

    vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("'country 1 2 3'"),
        new Filter.Value("BG"),
      ),
    );
    expect(vectorExpr).toBe("metadata.'country\\ 1\\ 2\\ 3':\"BG\"");

    vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key('"country 1 2 3"'),
        new Filter.Value("BG"),
      ),
    );
    expect(vectorExpr).toBe('metadata.\\"country\\ 1\\ 2\\ 3\\":"BG"');
  });

  it("metadata key double quote escaped in query string", () => {
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key('country"foo'),
        new Filter.Value("BG"),
      ),
    );
    expect(vectorExpr).toBe('metadata.country\\"foo:"BG"');
  });

  it("metadata key colon escaped in query string", () => {
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("a:b"),
        new Filter.Value("v"),
      ),
    );
    expect(vectorExpr).toBe('metadata.a\\:b:"v"');
  });

  it("metadata key containing or and spaces is escaped", () => {
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("foo OR bar"),
        new Filter.Value("x"),
      ),
    );
    expect(vectorExpr).toBe('metadata.foo\\ OR\\ bar:"x"');
  });
});
