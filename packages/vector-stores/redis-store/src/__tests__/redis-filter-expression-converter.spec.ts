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

import { Filter } from "@nestjs-ai/vector-store";
import { describe, expect, it } from "vitest";

import { RedisFilterExpressionConverter } from "../redis-filter-expression-converter";
import { RedisMetadataField } from "../redis-metadata-field";

function converter(
  ...fields: RedisMetadataField[]
): RedisFilterExpressionConverter {
  return new RedisFilterExpressionConverter(fields);
}

describe("RedisFilterExpressionConverter", () => {
  it("test eq", () => {
    // country == "BG"
    const vectorExpr = converter(
      RedisMetadataField.tag("country"),
    ).convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("country"),
        new Filter.Value("BG"),
      ),
    );
    expect(vectorExpr).toBe("@country:{BG}");
  });

  it("tes eq and gte", () => {
    // genre == "drama" AND year >= 2020
    const vectorExpr = converter(
      RedisMetadataField.tag("genre"),
      RedisMetadataField.numeric("year"),
    ).convertExpression(
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
    expect(vectorExpr).toBe("@genre:{drama} @year:[2020 inf]");
  });

  it("tes in", () => {
    // genre in ["comedy", "documentary", "drama"]
    const vectorExpr = converter(
      RedisMetadataField.tag("genre"),
    ).convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.IN,
        new Filter.Key("genre"),
        new Filter.Value(["comedy", "documentary", "drama"]),
      ),
    );
    expect(vectorExpr).toBe("@genre:{comedy | documentary | drama}");
  });

  it("test ne", () => {
    // year >= 2020 OR country == "BG" AND city != "Sofia"
    const vectorExpr = converter(
      RedisMetadataField.numeric("year"),
      RedisMetadataField.tag("country"),
      RedisMetadataField.tag("city"),
    ).convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.OR,
        new Filter.Expression(
          Filter.ExpressionType.GTE,
          new Filter.Key("year"),
          new Filter.Value(2020),
        ),
        new Filter.Group(
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
      ),
    );
    expect(vectorExpr).toBe(
      "@year:[2020 inf] | (@country:{BG} -@city:{Sofia})",
    );
  });

  it("test group", () => {
    // (year >= 2020 OR country == "BG") AND city NIN ["Sofia", "Plovdiv"]
    const vectorExpr = converter(
      RedisMetadataField.numeric("year"),
      RedisMetadataField.tag("country"),
      RedisMetadataField.tag("city"),
    ).convertExpression(
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
      "(@year:[2020 inf] | @country:{BG}) -@city:{Sofia | Plovdiv}",
    );
  });

  it("tes boolean", () => {
    // isOpen == true AND year >= 2020 AND country IN ["BG", "NL", "US"]
    const vectorExpr = converter(
      RedisMetadataField.numeric("year"),
      RedisMetadataField.tag("country"),
      RedisMetadataField.tag("isOpen"),
    ).convertExpression(
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
      "@isOpen:{true} @year:[2020 inf] @country:{BG | NL | US}",
    );
  });

  it("test decimal", () => {
    // temperature >= -15.6 && temperature <= +20.13
    const vectorExpr = converter(
      RedisMetadataField.numeric("temperature"),
    ).convertExpression(
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
      "@temperature:[-15.6 inf] @temperature:[-inf 20.13]",
    );
  });

  it("test complex identifiers", () => {
    let vectorExpr = converter(
      RedisMetadataField.tag("country 1 2 3"),
    ).convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key('"country 1 2 3"'),
        new Filter.Value("BG"),
      ),
    );
    expect(vectorExpr).toBe('@"country 1 2 3":{BG}');

    vectorExpr = converter(
      RedisMetadataField.tag("country 1 2 3"),
    ).convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("'country 1 2 3'"),
        new Filter.Value("BG"),
      ),
    );
    expect(vectorExpr).toBe("@'country 1 2 3':{BG}");
  });

  it("test special characters in values", () => {
    const vectorExpr = converter(
      RedisMetadataField.tag("description"),
    ).convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("description"),
        new Filter.Value("test@value{with}special|chars"),
      ),
    );

    expect(vectorExpr).toBe(
      "@description:{test@value\\{with\\}special\\|chars}",
    );
  });

  it("test tag value with injection payload", () => {
    const vectorExpr = converter(
      RedisMetadataField.tag("category"),
    ).convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("category"),
        new Filter.Value("science} | @access_level:{restricted"),
      ),
    );

    expect(vectorExpr).toBe(
      "@category:{science\\} \\| @access_level:\\{restricted}",
    );
    expect(vectorExpr).not.toContain("} | @");
  });

  it("test tag value in list with special chars", () => {
    const vectorExpr = converter(
      RedisMetadataField.tag("category"),
    ).convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.IN,
        new Filter.Key("category"),
        new Filter.Value(["science} | @access_level:{restricted", "normal"]),
      ),
    );

    expect(vectorExpr).toBe(
      "@category:{science\\} \\| @access_level:\\{restricted | normal}",
    );
    expect(vectorExpr).not.toContain("} | @");
  });

  it("test tag value with pipe", () => {
    const vectorExpr = converter(
      RedisMetadataField.tag("status"),
    ).convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("status"),
        new Filter.Value("active|inactive"),
      ),
    );

    expect(vectorExpr).toBe("@status:{active\\|inactive}");
  });

  it("test tag value with hyphen", () => {
    const vectorExpr = converter(
      RedisMetadataField.tag("type"),
    ).convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("type"),
        new Filter.Value("non-fiction"),
      ),
    );

    expect(vectorExpr).toBe("@type:{non\\-fiction}");
  });

  it("test special characters in text values", () => {
    const vectorExpr = converter(
      RedisMetadataField.text("description"),
    ).convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("description"),
        new Filter.Value("hello@world.com (test)"),
      ),
    );

    expect(vectorExpr).toBe("@description:(hello\\@world\\.com \\(test\\))");
  });

  it("test empty string values", () => {
    const vectorExpr = converter(
      RedisMetadataField.tag("status"),
    ).convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("status"),
        new Filter.Value(""),
      ),
    );

    expect(vectorExpr).toBe("@status:{}");
  });

  it("test single item in list", () => {
    const vectorExpr = converter(
      RedisMetadataField.tag("status"),
    ).convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.IN,
        new Filter.Key("status"),
        new Filter.Value(["active"]),
      ),
    );

    expect(vectorExpr).toBe("@status:{active}");
  });

  it("test whitespace in field names", () => {
    const vectorExpr = converter(
      RedisMetadataField.tag("value with spaces"),
    ).convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key('"value with spaces"'),
        new Filter.Value("test"),
      ),
    );

    expect(vectorExpr).toBe('@"value with spaces":{test}');
  });

  it("test nested quoted field names", () => {
    const vectorExpr = converter(
      RedisMetadataField.tag('value "with" quotes'),
    ).convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key('"value \\"with\\" quotes"'),
        new Filter.Value("test"),
      ),
    );

    expect(vectorExpr).toBe('@"value \\"with\\" quotes":{test}');
  });
});
