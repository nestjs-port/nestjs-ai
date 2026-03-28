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

import { describe, expect, it } from "vitest";

import { PineconeFilterExpressionConverter } from "../converter";
import { Filter } from "../filter";

describe("PineconeFilterExpressionConverter", () => {
  const converter = new PineconeFilterExpressionConverter();

  it("test eq", () => {
    // country == "BG"
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("country"),
        new Filter.Value("BG"),
      ),
    );

    expect(vectorExpr).toBe('{"country": {"$eq": "BG"}}');
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
      '{"$and": [{"genre": {"$eq": "drama"}},{"year": {"$gte": 2020}}]}',
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
      '{"genre": {"$in": ["comedy","documentary","drama"]}}',
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
      '{"$or": [{"year": {"$gte": 2020}},{"$and": [{"country": {"$eq": "BG"}},{"city": {"$ne": "Sofia"}}]}]}',
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
      '{"$and": [{"$or": [{"year": {"$gte": 2020}},{"country": {"$eq": "BG"}}]},{"city": {"$nin": ["Sofia","Plovdiv"]}}]}',
    );
  });

  it("tes boolean", () => {
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
      '{"$and": [{"$and": [{"isOpen": {"$eq": true}},{"year": {"$gte": 2020}}]},{"country": {"$in": ["BG","NL","US"]}}]}',
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
      '{"$and": [{"temperature": {"$gte": -15.6}},{"temperature": {"$lte": 20.13}}]}',
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

    expect(vectorExpr).toBe('{"country 1 2 3": {"$eq": "BG"}}');

    vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("'country 1 2 3'"),
        new Filter.Value("BG"),
      ),
    );

    expect(vectorExpr).toBe('{"country 1 2 3": {"$eq": "BG"}}');
  });

  it("test numeric values", () => {
    // score > 85
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.GT,
        new Filter.Key("score"),
        new Filter.Value(85),
      ),
    );

    expect(vectorExpr).toBe('{"score": {"$gt": 85}}');
  });

  it("test less than", () => {
    // priority < 10
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.LT,
        new Filter.Key("priority"),
        new Filter.Value(10),
      ),
    );

    expect(vectorExpr).toBe('{"priority": {"$lt": 10}}');
  });

  it("test not in with numbers", () => {
    // status NIN [100, 200, 404]
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.NIN,
        new Filter.Key("status"),
        new Filter.Value([100, 200, 404]),
      ),
    );

    expect(vectorExpr).toBe('{"status": {"$nin": [100,200,404]}}');
  });

  it("test complex and or combination", () => {
    // (category == "A" OR category == "B") AND (value >= 50 AND value <= 100)
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.AND,
        new Filter.Group(
          new Filter.Expression(
            Filter.ExpressionType.OR,
            new Filter.Expression(
              Filter.ExpressionType.EQ,
              new Filter.Key("category"),
              new Filter.Value("A"),
            ),
            new Filter.Expression(
              Filter.ExpressionType.EQ,
              new Filter.Key("category"),
              new Filter.Value("B"),
            ),
          ),
        ),
        new Filter.Group(
          new Filter.Expression(
            Filter.ExpressionType.AND,
            new Filter.Expression(
              Filter.ExpressionType.GTE,
              new Filter.Key("value"),
              new Filter.Value(50),
            ),
            new Filter.Expression(
              Filter.ExpressionType.LTE,
              new Filter.Key("value"),
              new Filter.Value(100),
            ),
          ),
        ),
      ),
    );

    expect(vectorExpr).toBe(
      '{"$and": [{"$or": [{"category": {"$eq": "A"}},{"category": {"$eq": "B"}}]},{"$and": [{"value": {"$gte": 50}},{"value": {"$lte": 100}}]}]}',
    );
  });

  it("test nested groups", () => {
    // ((type == "premium" AND level > 5) OR (type == "basic" AND level > 10)) AND
    // active == true
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
                  Filter.ExpressionType.EQ,
                  new Filter.Key("type"),
                  new Filter.Value("premium"),
                ),
                new Filter.Expression(
                  Filter.ExpressionType.GT,
                  new Filter.Key("level"),
                  new Filter.Value(5),
                ),
              ),
            ),
            new Filter.Group(
              new Filter.Expression(
                Filter.ExpressionType.AND,
                new Filter.Expression(
                  Filter.ExpressionType.EQ,
                  new Filter.Key("type"),
                  new Filter.Value("basic"),
                ),
                new Filter.Expression(
                  Filter.ExpressionType.GT,
                  new Filter.Key("level"),
                  new Filter.Value(10),
                ),
              ),
            ),
          ),
        ),
        new Filter.Expression(
          Filter.ExpressionType.EQ,
          new Filter.Key("active"),
          new Filter.Value(true),
        ),
      ),
    );

    expect(vectorExpr).toBe(
      '{"$and": [{"$or": [{"$and": [{"type": {"$eq": "premium"}},{"level": {"$gt": 5}}]},{"$and": [{"type": {"$eq": "basic"}},{"level": {"$gt": 10}}]}]},{"active": {"$eq": true}}]}',
    );
  });

  it("test mixed data types", () => {
    // name == "test" AND count >= 5 AND enabled == true AND ratio <= 0.95
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.AND,
        new Filter.Expression(
          Filter.ExpressionType.AND,
          new Filter.Expression(
            Filter.ExpressionType.AND,
            new Filter.Expression(
              Filter.ExpressionType.EQ,
              new Filter.Key("name"),
              new Filter.Value("test"),
            ),
            new Filter.Expression(
              Filter.ExpressionType.GTE,
              new Filter.Key("count"),
              new Filter.Value(5),
            ),
          ),
          new Filter.Expression(
            Filter.ExpressionType.EQ,
            new Filter.Key("enabled"),
            new Filter.Value(true),
          ),
        ),
        new Filter.Expression(
          Filter.ExpressionType.LTE,
          new Filter.Key("ratio"),
          new Filter.Value(0.95),
        ),
      ),
    );

    expect(vectorExpr).toBe(
      '{"$and": [{"$and": [{"$and": [{"name": {"$eq": "test"}},{"count": {"$gte": 5}}]},{"enabled": {"$eq": true}}]},{"ratio": {"$lte": 0.95}}]}',
    );
  });

  it("test in with mixed types", () => {
    // tag IN ["A", "B", "C"]
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.IN,
        new Filter.Key("tag"),
        new Filter.Value(["A", "B", "C"]),
      ),
    );

    expect(vectorExpr).toBe('{"tag": {"$in": ["A","B","C"]}}');
  });

  it("test negative numbers", () => {
    // balance >= -100.0 AND balance <= -10.0
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.AND,
        new Filter.Expression(
          Filter.ExpressionType.GTE,
          new Filter.Key("balance"),
          new Filter.Value(-100.0),
        ),
        new Filter.Expression(
          Filter.ExpressionType.LTE,
          new Filter.Key("balance"),
          new Filter.Value(-10.0),
        ),
      ),
    );

    expect(vectorExpr).toBe(
      '{"$and": [{"balance": {"$gte": -100}},{"balance": {"$lte": -10}}]}',
    );
  });

  it("test special characters in values", () => {
    // description == "Item with spaces & symbols!"
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("description"),
        new Filter.Value("Item with spaces & symbols!"),
      ),
    );

    expect(vectorExpr).toBe(
      '{"description": {"$eq": "Item with spaces & symbols!"}}',
    );
  });

  it("test multiple or conditions", () => {
    // status == "pending" OR status == "processing" OR status == "completed"
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.OR,
        new Filter.Expression(
          Filter.ExpressionType.OR,
          new Filter.Expression(
            Filter.ExpressionType.EQ,
            new Filter.Key("status"),
            new Filter.Value("pending"),
          ),
          new Filter.Expression(
            Filter.ExpressionType.EQ,
            new Filter.Key("status"),
            new Filter.Value("processing"),
          ),
        ),
        new Filter.Expression(
          Filter.ExpressionType.EQ,
          new Filter.Key("status"),
          new Filter.Value("completed"),
        ),
      ),
    );

    expect(vectorExpr).toBe(
      '{"$or": [{"$or": [{"status": {"$eq": "pending"}},{"status": {"$eq": "processing"}}]},{"status": {"$eq": "completed"}}]}',
    );
  });

  it("test single element list", () => {
    // category IN ["single"]
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.IN,
        new Filter.Key("category"),
        new Filter.Value(["single"]),
      ),
    );

    expect(vectorExpr).toBe('{"category": {"$in": ["single"]}}');
  });

  it("test zero values", () => {
    // quantity == 0 AND price > 0
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.AND,
        new Filter.Expression(
          Filter.ExpressionType.EQ,
          new Filter.Key("quantity"),
          new Filter.Value(0),
        ),
        new Filter.Expression(
          Filter.ExpressionType.GT,
          new Filter.Key("price"),
          new Filter.Value(0),
        ),
      ),
    );

    expect(vectorExpr).toBe(
      '{"$and": [{"quantity": {"$eq": 0}},{"price": {"$gt": 0}}]}',
    );
  });

  it("test complex nested expression", () => {
    // (priority >= 1 AND priority <= 5) OR (urgent == true AND category NIN ["low",
    // "medium"])
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.OR,
        new Filter.Group(
          new Filter.Expression(
            Filter.ExpressionType.AND,
            new Filter.Expression(
              Filter.ExpressionType.GTE,
              new Filter.Key("priority"),
              new Filter.Value(1),
            ),
            new Filter.Expression(
              Filter.ExpressionType.LTE,
              new Filter.Key("priority"),
              new Filter.Value(5),
            ),
          ),
        ),
        new Filter.Group(
          new Filter.Expression(
            Filter.ExpressionType.AND,
            new Filter.Expression(
              Filter.ExpressionType.EQ,
              new Filter.Key("urgent"),
              new Filter.Value(true),
            ),
            new Filter.Expression(
              Filter.ExpressionType.NIN,
              new Filter.Key("category"),
              new Filter.Value(["low", "medium"]),
            ),
          ),
        ),
      ),
    );

    expect(vectorExpr).toBe(
      '{"$or": [{"$and": [{"priority": {"$gte": 1}},{"priority": {"$lte": 5}}]},{"$and": [{"urgent": {"$eq": true}},{"category": {"$nin": ["low","medium"]}}]}]}',
    );
  });
});
