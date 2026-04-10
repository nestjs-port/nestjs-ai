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
import { Filter } from "../filter";
import { SimpleVectorStoreFilterExpressionEvaluator } from "../simple-vector-store-filter-expression-evaluator";

describe("SimpleVectorStoreFilterExpressionEvaluator", () => {
  const evaluator = new SimpleVectorStoreFilterExpressionEvaluator();

  it("supports equality and inequality", () => {
    const expr = new Filter.Expression(
      Filter.ExpressionType.EQ,
      new Filter.Key("country"),
      new Filter.Value("BG"),
    );

    expect(evaluator.evaluate(expr, { country: "BG" })).toBe(true);
    expect(evaluator.evaluate(expr, { country: "NL" })).toBe(false);

    const neExpr = new Filter.Expression(
      Filter.ExpressionType.NE,
      new Filter.Key("country"),
      new Filter.Value("BG"),
    );
    expect(evaluator.evaluate(neExpr, { country: "NL" })).toBe(true);
    expect(evaluator.evaluate(neExpr, { country: "BG" })).toBe(false);
  });

  it("supports ordered comparisons", () => {
    const gtExpr = new Filter.Expression(
      Filter.ExpressionType.GT,
      new Filter.Key("year"),
      new Filter.Value(2020),
    );
    expect(evaluator.evaluate(gtExpr, { year: 2021 })).toBe(true);
    expect(evaluator.evaluate(gtExpr, { year: 2020 })).toBe(false);
    expect(evaluator.evaluate(gtExpr, { year: 2019 })).toBe(false);

    const lteExpr = new Filter.Expression(
      Filter.ExpressionType.LTE,
      new Filter.Key("year"),
      new Filter.Value(2020),
    );
    expect(evaluator.evaluate(lteExpr, { year: 2020 })).toBe(true);
    expect(evaluator.evaluate(lteExpr, { year: 2019 })).toBe(true);
    expect(evaluator.evaluate(lteExpr, { year: 2021 })).toBe(false);
  });

  it("supports logical operators", () => {
    const expr = new Filter.Expression(
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
    );
    expect(evaluator.evaluate(expr, { genre: "drama", year: 2020 })).toBe(true);
    expect(evaluator.evaluate(expr, { genre: "comedy", year: 2020 })).toBe(
      false,
    );

    const notExpr = new Filter.Expression(
      Filter.ExpressionType.NOT,
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("country"),
        new Filter.Value("BG"),
      ),
    );
    expect(evaluator.evaluate(notExpr, { country: "NL" })).toBe(true);
    expect(evaluator.evaluate(notExpr, { country: "BG" })).toBe(false);
  });

  it("supports in and nin", () => {
    const inExpr = new Filter.Expression(
      Filter.ExpressionType.IN,
      new Filter.Key("genre"),
      new Filter.Value(["comedy", "documentary", "drama"]),
    );
    expect(evaluator.evaluate(inExpr, { genre: "drama" })).toBe(true);
    expect(evaluator.evaluate(inExpr, { genre: "action" })).toBe(false);

    const ninExpr = new Filter.Expression(
      Filter.ExpressionType.NIN,
      new Filter.Key("city"),
      new Filter.Value(["Sofia", "Plovdiv"]),
    );
    expect(evaluator.evaluate(ninExpr, { city: "Seoul" })).toBe(true);
    expect(evaluator.evaluate(ninExpr, { city: "Sofia" })).toBe(false);
  });

  it("supports null checks and missing metadata", () => {
    const isNullExpr = new Filter.Expression(
      Filter.ExpressionType.ISNULL,
      new Filter.Key("country"),
    );
    expect(evaluator.evaluate(isNullExpr, { country: null })).toBe(true);
    expect(evaluator.evaluate(isNullExpr, { year: 2020 })).toBe(true);
    expect(evaluator.evaluate(isNullExpr, { country: "BG" })).toBe(false);

    const isNotNullExpr = new Filter.Expression(
      Filter.ExpressionType.ISNOTNULL,
      new Filter.Key("country"),
    );
    expect(evaluator.evaluate(isNotNullExpr, { country: "BG" })).toBe(true);
    expect(evaluator.evaluate(isNotNullExpr, { year: 2020 })).toBe(false);
  });

  it("supports grouped expressions", () => {
    const expr = new Filter.Expression(
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
    );

    expect(
      evaluator.evaluate(expr, {
        city: "Seoul",
        year: 2020,
        country: "BG",
      }),
    ).toBe(true);
    expect(
      evaluator.evaluate(expr, {
        city: "Sofia",
        year: 2020,
        country: "BG",
      }),
    ).toBe(false);
  });

  it("supports cross-type numeric and date comparisons", () => {
    const numericExpr = new Filter.Expression(
      Filter.ExpressionType.GTE,
      new Filter.Key("year"),
      new Filter.Value(2020),
    );
    expect(evaluator.evaluate(numericExpr, { year: 2020n })).toBe(true);

    const inExpr = new Filter.Expression(
      Filter.ExpressionType.IN,
      new Filter.Key("year"),
      new Filter.Value([2019n, 2020n, 2021n]),
    );
    expect(evaluator.evaluate(inExpr, { year: 2020 })).toBe(true);

    const dateExpr = new Filter.Expression(
      Filter.ExpressionType.EQ,
      new Filter.Key("activationDate"),
      new Filter.Value(new Date(1704637752148)),
    );
    expect(
      evaluator.evaluate(dateExpr, {
        activationDate: "2024-01-07T14:29:12Z",
      }),
    ).toBe(true);
  });

  it("supports quoted keys", () => {
    const doubleQuotedExpr = new Filter.Expression(
      Filter.ExpressionType.EQ,
      new Filter.Key('"country 1 2 3"'),
      new Filter.Value("BG"),
    );
    expect(
      evaluator.evaluate(doubleQuotedExpr, {
        "country 1 2 3": "BG",
      }),
    ).toBe(true);

    const singleQuotedExpr = new Filter.Expression(
      Filter.ExpressionType.EQ,
      new Filter.Key("'country 1 2 3'"),
      new Filter.Value("BG"),
    );
    expect(
      evaluator.evaluate(singleQuotedExpr, {
        "country 1 2 3": "BG",
      }),
    ).toBe(true);
  });
});
