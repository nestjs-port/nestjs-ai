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

import { Filter } from "@nestjs-ai/vector-store";
import { describe, expect, it } from "vitest";

import { MongoDBAtlasFilterExpressionConverter } from "../mongodb-atlas-filter-expression-converter.js";

describe("MongoDBAtlasFilterConverter", () => {
  const converter = new MongoDBAtlasFilterExpressionConverter();

  it("test eq", () => {
    // country == "BG"
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("country"),
        new Filter.Value("BG"),
      ),
    );
    expect(vectorExpr).toBe('{"metadata.country":{$eq:"BG"}}');
  });

  it("tes eq and gte", () => {
    // genre == "drama" AND year >= 2020
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
    expect(vectorExpr).toBe(
      '{$and:[{"metadata.genre":{$eq:"drama"}},{"metadata.year":{$gte:2020}}]}',
    );
  });

  it("tes in", () => {
    // genre in ["comedy", "documentary", "drama"]
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.IN,
        new Filter.Key("genre"),
        new Filter.Value(["comedy", "documentary", "drama"]),
      ),
    );
    expect(vectorExpr).toBe(
      '{"metadata.genre":{$in:["comedy","documentary","drama"]}}',
    );
  });

  it("test ne", () => {
    // year >= 2020 OR country == "BG" AND city != "Sofia"
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
      '{$or:[{"metadata.year":{$gte:2020}},{$and:[{"metadata.country":{$eq:"BG"}},{"metadata.city":{$ne:"Sofia"}}]}]}',
    );
  });

  it("test group", () => {
    // (year >= 2020 OR country == "BG") AND city NIN ["Sofia", "Plovdiv"]
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
      '{$and:[{$or:[{"metadata.year":{$gte:2020}},{"metadata.country":{$eq:"BG"}}]},{"metadata.city":{$nin:["Sofia","Plovdiv"]}}]}',
    );
  });

  it("test boolean", () => {
    // isOpen == true AND year >= 2020 AND country IN ["BG", "NL", "US"]
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
      '{$and:[{$and:[{"metadata.isOpen":{$eq:true}},{"metadata.year":{$gte:2020}}]},{"metadata.country":{$in:["BG","NL","US"]}}]}',
    );
  });

  it("test decimal", () => {
    // temperature >= -15.6 && temperature <= +20.13
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
      '{$and:[{"metadata.temperature":{$gte:-15.6}},{"metadata.temperature":{$lte:20.13}}]}',
    );
  });

  it("test complex identifiers", () => {
    let vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key('"country 1 2 3"'),
        new Filter.Value("BG"),
      ),
    );
    expect(vectorExpr).toBe('{"metadata.country 1 2 3":{$eq:"BG"}}');

    vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("'country 1 2 3'"),
        new Filter.Value("BG"),
      ),
    );
    expect(vectorExpr).toBe('{"metadata.country 1 2 3":{$eq:"BG"}}');
  });

  it("test lt", () => {
    // value < 100
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.LT,
        new Filter.Key("value"),
        new Filter.Value(100),
      ),
    );
    expect(vectorExpr).toBe('{"metadata.value":{$lt:100}}');
  });

  it("test lte", () => {
    // value <= 100
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.LTE,
        new Filter.Key("value"),
        new Filter.Value(100),
      ),
    );
    expect(vectorExpr).toBe('{"metadata.value":{$lte:100}}');
  });

  it("test gt", () => {
    // value > 100
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.GT,
        new Filter.Key("value"),
        new Filter.Value(100),
      ),
    );
    expect(vectorExpr).toBe('{"metadata.value":{$gt:100}}');
  });

  it("test nin", () => {
    // region not in ["A", "B", "C"]
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.NIN,
        new Filter.Key("region"),
        new Filter.Value(["A", "B", "C"]),
      ),
    );
    expect(vectorExpr).toBe('{"metadata.region":{$nin:["A","B","C"]}}');
  });

  it("test complex nested groups", () => {
    // ((value >= 100 AND type == "primary") OR (value <= 50 AND type == "secondary"))
    // AND region == "X"
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.AND,
        new Filter.Group(
          new Filter.Expression(
            Filter.ExpressionType.OR,
            new Filter.Group(
              new Filter.Expression(
                Filter.ExpressionType.AND,
                new Filter.Expression(
                  Filter.ExpressionType.GTE,
                  new Filter.Key("value"),
                  new Filter.Value(100),
                ),
                new Filter.Expression(
                  Filter.ExpressionType.EQ,
                  new Filter.Key("type"),
                  new Filter.Value("primary"),
                ),
              ),
            ),
            new Filter.Group(
              new Filter.Expression(
                Filter.ExpressionType.AND,
                new Filter.Expression(
                  Filter.ExpressionType.LTE,
                  new Filter.Key("value"),
                  new Filter.Value(50),
                ),
                new Filter.Expression(
                  Filter.ExpressionType.EQ,
                  new Filter.Key("type"),
                  new Filter.Value("secondary"),
                ),
              ),
            ),
          ),
        ),
        new Filter.Expression(
          Filter.ExpressionType.EQ,
          new Filter.Key("region"),
          new Filter.Value("X"),
        ),
      ),
    );

    expect(vectorExpr).toBe(
      '{$and:[{$or:[{$and:[{"metadata.value":{$gte:100}},{"metadata.type":{$eq:"primary"}}]},{$and:[{"metadata.value":{$lte:50}},{"metadata.type":{$eq:"secondary"}}]}]},{"metadata.region":{$eq:"X"}}]}',
    );
  });

  it("test null value", () => {
    // status == null
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("status"),
        new Filter.Value(null),
      ),
    );
    expect(vectorExpr).toBe('{"metadata.status":{$eq:null}}');
  });

  it("test empty string", () => {
    // name == ""
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("name"),
        new Filter.Value(""),
      ),
    );
    expect(vectorExpr).toBe('{"metadata.name":{$eq:""}}');
  });

  it("test numeric string", () => {
    // id == "12345"
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("id"),
        new Filter.Value("12345"),
      ),
    );
    expect(vectorExpr).toBe('{"metadata.id":{$eq:"12345"}}');
  });

  it("test long value", () => {
    // timestamp >= 1640995200000L
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.GTE,
        new Filter.Key("timestamp"),
        new Filter.Value(1640995200000),
      ),
    );
    expect(vectorExpr).toBe('{"metadata.timestamp":{$gte:1640995200000}}');
  });

  it("test float value", () => {
    // score >= 4.5f
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.GTE,
        new Filter.Key("score"),
        new Filter.Value(4.5),
      ),
    );
    expect(vectorExpr).toBe('{"metadata.score":{$gte:4.5}}');
  });

  it("test mixed types list", () => {
    // tags in [1, "priority", true]
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.IN,
        new Filter.Key("tags"),
        new Filter.Value([1, "priority", true]),
      ),
    );
    expect(vectorExpr).toBe('{"metadata.tags":{$in:[1,"priority",true]}}');
  });

  it("test empty list", () => {
    // categories in []
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.IN,
        new Filter.Key("categories"),
        new Filter.Value([]),
      ),
    );
    expect(vectorExpr).toBe('{"metadata.categories":{$in:[]}}');
  });

  it("test single item list", () => {
    // status in ["active"]
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.IN,
        new Filter.Key("status"),
        new Filter.Value(["active"]),
      ),
    );
    expect(vectorExpr).toBe('{"metadata.status":{$in:["active"]}}');
  });

  it("test key with dots", () => {
    // "value.field" >= 18
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.GTE,
        new Filter.Key("value.field"),
        new Filter.Value(18),
      ),
    );
    expect(vectorExpr).toBe('{"metadata.value.field":{$gte:18}}');
  });

  it("test key with special characters", () => {
    // "field-name_with@symbols" == "value"
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("field-name_with@symbols"),
        new Filter.Value("value"),
      ),
    );
    expect(vectorExpr).toBe(
      '{"metadata.field-name_with@symbols":{$eq:"value"}}',
    );
  });

  it("test triple and", () => {
    // value >= 100 AND type == "primary" AND region == "X"
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.AND,
        new Filter.Expression(
          Filter.ExpressionType.AND,
          new Filter.Expression(
            Filter.ExpressionType.GTE,
            new Filter.Key("value"),
            new Filter.Value(100),
          ),
          new Filter.Expression(
            Filter.ExpressionType.EQ,
            new Filter.Key("type"),
            new Filter.Value("primary"),
          ),
        ),
        new Filter.Expression(
          Filter.ExpressionType.EQ,
          new Filter.Key("region"),
          new Filter.Value("X"),
        ),
      ),
    );

    expect(vectorExpr).toBe(
      '{$and:[{$and:[{"metadata.value":{$gte:100}},{"metadata.type":{$eq:"primary"}}]},{"metadata.region":{$eq:"X"}}]}',
    );
  });

  it("test triple or", () => {
    // value < 50 OR value > 200 OR type == "special"
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.OR,
        new Filter.Expression(
          Filter.ExpressionType.OR,
          new Filter.Expression(
            Filter.ExpressionType.LT,
            new Filter.Key("value"),
            new Filter.Value(50),
          ),
          new Filter.Expression(
            Filter.ExpressionType.GT,
            new Filter.Key("value"),
            new Filter.Value(200),
          ),
        ),
        new Filter.Expression(
          Filter.ExpressionType.EQ,
          new Filter.Key("type"),
          new Filter.Value("special"),
        ),
      ),
    );

    expect(vectorExpr).toBe(
      '{$or:[{$or:[{"metadata.value":{$lt:50}},{"metadata.value":{$gt:200}}]},{"metadata.type":{$eq:"special"}}]}',
    );
  });

  it("test zero values", () => {
    // count == 0
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("count"),
        new Filter.Value(0),
      ),
    );
    expect(vectorExpr).toBe('{"metadata.count":{$eq:0}}');
  });

  it("test boolean false", () => {
    // enabled == false
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("enabled"),
        new Filter.Value(false),
      ),
    );
    expect(vectorExpr).toBe('{"metadata.enabled":{$eq:false}}');
  });

  it("test very long string", () => {
    // Test with a very long string value
    const longValue =
      "This is a very long string that might be used as a value in a filter expression to test how the converter handles lengthy text content that could potentially cause issues with string manipulation or JSON formatting";
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("content"),
        new Filter.Value(longValue),
      ),
    );
    expect(vectorExpr).toBe(`{"metadata.content":{$eq:"${longValue}"}}`);
  });
});
