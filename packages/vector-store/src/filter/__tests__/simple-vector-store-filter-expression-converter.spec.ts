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

import { SpelExpressionEvaluator, StandardContext } from "spel2js";
import { describe, expect, it } from "vitest";
import { SimpleVectorStoreFilterExpressionConverter } from "../converter";
import { Filter } from "../filter";

describe("SimpleVectorStoreFilterExpressionConverter", () => {
  const converter = new SimpleVectorStoreFilterExpressionConverter();
  const spelContext = StandardContext.create({}, {});

  const evaluate = (expression: string, metadata: Record<string, unknown>) =>
    SpelExpressionEvaluator.eval(expression, spelContext, { metadata });

  it("testDate", () => {
    let vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("activationDate"),
        new Filter.Value(new Date(1704637752148)),
      ),
    );
    expect(vectorExpr).toBe(
      "#metadata['activationDate'] == '2024-01-07T14:29:12Z'",
    );
    expect(
      evaluate(vectorExpr, {
        activationDate: "2024-01-07T14:29:12Z",
        year: 2020,
        country: "BG",
      }),
    ).toBe(true);

    vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("activationDate"),
        new Filter.Value("1970-01-01T00:00:02Z"),
      ),
    );
    expect(vectorExpr).toBe(
      "#metadata['activationDate'] == '1970-01-01T00:00:02Z'",
    );
    expect(
      evaluate(vectorExpr, {
        activationDate: "1970-01-01T00:00:02Z",
        year: 2020,
        country: "BG",
      }),
    ).toBe(true);
  });

  it("testDatesConcurrently", async () => {
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
        expect(vectorExpr).toBe(
          "#metadata['activationDate'] == '2024-01-07T14:29:12Z'",
        );
        expect(vectorExpr2).toBe(
          "#metadata['activationDate'] == '2024-01-07T14:29:13Z'",
        );
      }),
    );
  });

  it("testEQ", () => {
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("country"),
        new Filter.Value("BG"),
      ),
    );

    expect(vectorExpr).toBe("#metadata['country'] == 'BG'");
    expect(
      evaluate(vectorExpr, {
        city: "Seoul",
        year: 2020,
        country: "BG",
      }),
    ).toBe(true);
  });

  it("tesEqAndGte", () => {
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
      "#metadata['genre'] == 'drama' and #metadata['year'] >= 2020",
    );
    expect(
      evaluate(vectorExpr, {
        genre: "drama",
        year: 2020,
        country: "BG",
      }),
    ).toBe(true);
  });

  it("tesIn", () => {
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.IN,
        new Filter.Key("genre"),
        new Filter.Value(["comedy", "documentary", "drama"]),
      ),
    );
    expect(vectorExpr).toBe(
      "{'comedy','documentary','drama'}.contains(#metadata['genre'])",
    );
    expect(
      evaluate(vectorExpr, {
        genre: "drama",
        year: 2020,
        country: "BG",
      }),
    ).toBe(true);
  });

  it("testNe", () => {
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
      "#metadata['year'] >= 2020 or #metadata['country'] == 'BG' and #metadata['city'] != 'Sofia'",
    );
    expect(
      evaluate(vectorExpr, {
        city: "Seoul",
        year: 2020,
        country: "BG",
      }),
    ).toBe(true);
  });

  it("testGroup", () => {
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
      "(#metadata['year'] >= 2020 or #metadata['country'] == 'BG') and not {'Sofia','Plovdiv'}.contains(#metadata['city'])",
    );
  });

  it("tesBoolean", () => {
    let vectorExpr = converter.convertExpression(
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
      "#metadata['isOpen'] == true and #metadata['year'] >= 2020 and {'BG','NL','US'}.contains(#metadata['country'])",
    );
    expect(
      evaluate(vectorExpr, {
        isOpen: true,
        year: 2020,
        country: "NL",
      }),
    ).toBe(true);

    vectorExpr = converter.convertExpression(
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
          Filter.ExpressionType.NIN,
          new Filter.Key("country"),
          new Filter.Value(["BG", "NL", "US"]),
        ),
      ),
    );
    expect(vectorExpr).toBe(
      "#metadata['isOpen'] == true and #metadata['year'] >= 2020 and not {'BG','NL','US'}.contains(#metadata['country'])",
    );
  });

  it("testDecimal", () => {
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
      "#metadata['temperature'] >= -15.6 and #metadata['temperature'] <= 20.13",
    );
    expect(evaluate(vectorExpr, { temperature: -15.6 })).toBe(true);
    expect(evaluate(vectorExpr, { temperature: 20.13 })).toBe(true);
    expect(evaluate(vectorExpr, { temperature: -1.6 })).toBe(true);
  });

  it("testComplexIdentifiers", () => {
    let vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key('"country 1 2 3"'),
        new Filter.Value("BG"),
      ),
    );
    expect(vectorExpr).toBe("#metadata['country 1 2 3'] == 'BG'");

    vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("'country 1 2 3'"),
        new Filter.Value("BG"),
      ),
    );
    expect(vectorExpr).toBe("#metadata['country 1 2 3'] == 'BG'");
    expect(
      evaluate(vectorExpr, {
        "country 1 2 3": "BG",
      }),
    ).toBe(true);
  });
});
