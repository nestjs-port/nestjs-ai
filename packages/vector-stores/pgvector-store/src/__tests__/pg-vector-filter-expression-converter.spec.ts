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

import { Filter } from "@nestjs-ai/vector-store";

import { PgVectorFilterExpressionConverter } from "../pg-vector-filter-expression-converter.js";

describe("PgVectorFilterExpressionConverter", () => {
  const converter = new PgVectorFilterExpressionConverter();

  it("test eq", () => {
    // country == "BG"
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("country"),
        new Filter.Value("BG"),
      ),
    );

    expect(vectorExpr).toBe('$.country == "BG"');
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

    expect(vectorExpr).toBe('$.genre == "drama" && $.year >= 2020');
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
      '($.genre == "comedy" || $.genre == "documentary" || $.genre == "drama")',
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
      '$.year >= 2020 || $.country == "BG" && $.city != "Sofia"',
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
      '($.year >= 2020 || $.country == "BG") && !($.city == "Sofia" || $.city == "Plovdiv")',
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
      '$.isOpen == true && $.year >= 2020 && ($.country == "BG" || $.country == "NL" || $.country == "US")',
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

    expect(vectorExpr).toBe("$.temperature >= -15.6 && $.temperature <= 20.13");
  });

  it("test complex identifiers", () => {
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key('"country 1 2 3"'),
        new Filter.Value("BG"),
      ),
    );

    expect(vectorExpr).toBe('$."country 1 2 3" == "BG"');
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

    expect(vectorExpr).toBe("$.value < 100");
  });

  it("test gt", () => {
    // score > 75
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.GT,
        new Filter.Key("score"),
        new Filter.Value(100),
      ),
    );

    expect(vectorExpr).toBe("$.score > 100");
  });

  it("test lte", () => {
    // amount <= 100.5
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.LTE,
        new Filter.Key("amount"),
        new Filter.Value(100.5),
      ),
    );

    expect(vectorExpr).toBe("$.amount <= 100.5");
  });

  it("test nin", () => {
    // category NOT IN ["typeA", "typeB"]
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.NIN,
        new Filter.Key("category"),
        new Filter.Value(["typeA", "typeB"]),
      ),
    );

    expect(vectorExpr).toBe(
      '!($.category == "typeA" || $.category == "typeB")',
    );
  });

  it("test single value in", () => {
    // status IN ["active"] - single value in list
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.IN,
        new Filter.Key("status"),
        new Filter.Value(["active"]),
      ),
    );

    expect(vectorExpr).toBe('($.status == "active")');
  });

  it("test single value nin", () => {
    // status NOT IN ["inactive"] - single value in list
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.NIN,
        new Filter.Key("status"),
        new Filter.Value(["inactive"]),
      ),
    );

    expect(vectorExpr).toBe('!($.status == "inactive")');
  });

  it("test numeric in", () => {
    // priority IN [1, 2, 3]
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.IN,
        new Filter.Key("priority"),
        new Filter.Value([1, 2, 3]),
      ),
    );

    expect(vectorExpr).toBe(
      "($.priority == 1 || $.priority == 2 || $.priority == 3)",
    );
  });

  it("test numeric nin", () => {
    // level NOT IN [0, 10]
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.NIN,
        new Filter.Key("level"),
        new Filter.Value([0, 10]),
      ),
    );

    expect(vectorExpr).toBe("!($.level == 0 || $.level == 10)");
  });

  it("test nested groups", () => {
    // ((score >= 80 AND type == "A") OR (score >= 90 AND type == "B")) AND status ==
    // "valid"
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
                  new Filter.Key("score"),
                  new Filter.Value(80),
                ),
                new Filter.Expression(
                  Filter.ExpressionType.EQ,
                  new Filter.Key("type"),
                  new Filter.Value("A"),
                ),
              ),
            ),
            new Filter.Group(
              new Filter.Expression(
                Filter.ExpressionType.AND,
                new Filter.Expression(
                  Filter.ExpressionType.GTE,
                  new Filter.Key("score"),
                  new Filter.Value(90),
                ),
                new Filter.Expression(
                  Filter.ExpressionType.EQ,
                  new Filter.Key("type"),
                  new Filter.Value("B"),
                ),
              ),
            ),
          ),
        ),
        new Filter.Expression(
          Filter.ExpressionType.EQ,
          new Filter.Key("status"),
          new Filter.Value("valid"),
        ),
      ),
    );

    expect(vectorExpr).toBe(
      '(($.score >= 80 && $.type == "A") || ($.score >= 90 && $.type == "B")) && $.status == "valid"',
    );
  });

  it("test boolean false", () => {
    // active == false
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("active"),
        new Filter.Value(false),
      ),
    );

    expect(vectorExpr).toBe("$.active == false");
  });

  it("test boolean ne", () => {
    // active != true
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.NE,
        new Filter.Key("active"),
        new Filter.Value(true),
      ),
    );

    expect(vectorExpr).toBe("$.active != true");
  });

  it("test key with dots", () => {
    // "config.setting" == "value1"
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key('"config.setting"'),
        new Filter.Value("value1"),
      ),
    );

    expect(vectorExpr).toBe('$."config.setting" == "value1"');
  });

  it("test empty string", () => {
    // description == ""
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("description"),
        new Filter.Value(""),
      ),
    );

    expect(vectorExpr).toBe('$.description == ""');
  });

  it("test null value", () => {
    // metadata == null
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("metadata"),
        new Filter.Value(null),
      ),
    );

    expect(vectorExpr).toBe("$.metadata == null");
  });

  it("test complex or expression", () => {
    // state == "ready" OR state == "pending" OR state == "processing"
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.OR,
        new Filter.Expression(
          Filter.ExpressionType.OR,
          new Filter.Expression(
            Filter.ExpressionType.EQ,
            new Filter.Key("state"),
            new Filter.Value("ready"),
          ),
          new Filter.Expression(
            Filter.ExpressionType.EQ,
            new Filter.Key("state"),
            new Filter.Value("pending"),
          ),
        ),
        new Filter.Expression(
          Filter.ExpressionType.EQ,
          new Filter.Key("state"),
          new Filter.Value("processing"),
        ),
      ),
    );

    expect(vectorExpr).toBe(
      '$.state == "ready" || $.state == "pending" || $.state == "processing"',
    );
  });

  it("test injection with double quote escape", () => {
    // Attempt to inject: department == "" || $.department == "Finance"
    // Malicious value: " || $.department == "Finance
    const maliciousValue = '" || $.department == "Finance';
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("department"),
        new Filter.Value(maliciousValue),
      ),
    );

    // Expected format with escaped quotes
    const expected = '$.department == "\\" || $.department == \\"Finance"';

    // Verify the quotes are escaped (backslash + quote)
    expect(vectorExpr).toBe(expected);
    expect(vectorExpr).toContain('\\"');

    // Critical: verify we don't have the vulnerable pattern: $.department == "" ||
    // (two quotes together would allow injection to work)
    expect(vectorExpr).not.toContain('== ""');
  });

  it("test injection with backslash escape", () => {
    // Attempt to inject using backslash escape: value\"
    const maliciousValue = 'value\\"';
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("field"),
        new Filter.Value(maliciousValue),
      ),
    );

    // Should escape both backslash and quote
    expect(vectorExpr).toBe('$.field == "value\\\\\\""');
    // Verify the backslashes are escaped
    expect(vectorExpr).toContain("\\\\");
  });

  it("test injection with single quote", () => {
    // Attempt to inject using single quotes: value' || $.other == 'admin
    const maliciousValue = "value' || $.other == 'admin";
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("field"),
        new Filter.Value(maliciousValue),
      ),
    );

    // In JSON double-quoted strings, single quotes don't need escaping
    // Jackson treats them as literal characters
    expect(vectorExpr).toBe("$.field == \"value' || $.other == 'admin\"");
    // Single quotes are kept as-is (no escaping needed in JSON)
    expect(vectorExpr).toContain("value' || $.other == 'admin");
  });

  it("test injection with control characters", () => {
    // Attempt to inject using newline: value\n|| $.field == "admin"
    const maliciousValue = 'value\n|| $.field == "admin"';
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("field"),
        new Filter.Value(maliciousValue),
      ),
    );

    // Should escape newline and quotes
    expect(vectorExpr).toBe('$.field == "value\\n|| $.field == \\"admin\\""');
    // Verify newline is escaped
    expect(vectorExpr).toContain("\\n");
  });

  it("test injection with multiple escapes", () => {
    // Complex injection with multiple special characters
    const maliciousValue = `test"\\'\n\r\t`;
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("field"),
        new Filter.Value(maliciousValue),
      ),
    );

    // JSON escaping: double quotes and backslashes escaped, single quotes not escaped
    expect(vectorExpr).toBe('$.field == "test\\"\\\\\'\\n\\r\\t"');
    // Verify escapes are present
    expect(vectorExpr).toContain('\\"'); // escaped double quote
    expect(vectorExpr).toContain("\\\\"); // escaped backslash
    // Single quotes are NOT escaped in JSON double-quoted strings
    expect(vectorExpr).toContain("'");
  });

  it("test injection in list values", () => {
    // Attempt injection through IN clause
    const maliciousValue1 = 'HR" || $.department == "Finance';
    const maliciousValue2 = "Engineering";
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.IN,
        new Filter.Key("department"),
        new Filter.Value([maliciousValue1, maliciousValue2]),
      ),
    );

    // Should escape quotes in list values
    expect(vectorExpr).toContain('HR\\" || $.department == \\"Finance');
    expect(vectorExpr).toContain("Engineering");
  });

  it("test injection in complex expression", () => {
    // Attempt injection in a complex AND/OR expression
    const maliciousValue = '" || $.role == "admin" || $.dept == "';
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.AND,
        new Filter.Expression(
          Filter.ExpressionType.EQ,
          new Filter.Key("department"),
          new Filter.Value(maliciousValue),
        ),
        new Filter.Expression(
          Filter.ExpressionType.GTE,
          new Filter.Key("year"),
          new Filter.Value(2020),
        ),
      ),
    );

    // Should not allow injection to break out of the expression
    expect(vectorExpr).toContain(
      '\\" || $.role == \\"admin\\" || $.dept == \\"',
    );
    // Verify the AND operator is still present (not broken by injection)
    expect(vectorExpr).toContain("&&");
  });

  it("test normal strings not affected", () => {
    // Verify normal strings work correctly after escaping fix
    const normalValue = "HR Department";
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("department"),
        new Filter.Value(normalValue),
      ),
    );

    expect(vectorExpr).toBe('$.department == "HR Department"');
  });

  it("test unicode control characters", () => {
    // Test Unicode control characters are escaped
    const valueWithControlChar = "test\u0000value"; // null character
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("field"),
        new Filter.Value(valueWithControlChar),
      ),
    );

    // Should escape Unicode control character
    expect(vectorExpr).toContain("\\u0000");
  });

  it("test date in in clause", () => {
    // Test that date strings in IN clauses are properly normalized
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.IN,
        new Filter.Key("activationDate"),
        new Filter.Value(["2024-01-15T10:30:00Z", "2024-02-20T14:45:00Z"]),
      ),
    );

    // Verify dates are properly formatted in the JSONPath expression
    // Note: Jackson serializes dates with milliseconds, so .000Z is expected
    expect(vectorExpr).toContain(
      '$.activationDate == "2024-01-15T10:30:00.000Z"',
    );
    expect(vectorExpr).toContain(
      '$.activationDate == "2024-02-20T14:45:00.000Z"',
    );
    expect(vectorExpr).toContain(" || "); // OR operator between conditions
  });

  it("test date in nin clause", () => {
    // Test that date strings in NIN clauses are properly normalized
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.NIN,
        new Filter.Key("activationDate"),
        new Filter.Value(["2024-01-15T10:30:00Z", "2024-02-20T14:45:00Z"]),
      ),
    );

    // Verify dates are properly formatted and wrapped in negation
    expect(vectorExpr.startsWith("!(")).toBe(true);
    expect(vectorExpr.endsWith(")")).toBe(true);
    // Note: Jackson serializes dates with milliseconds
    expect(vectorExpr).toContain(
      '$.activationDate == "2024-01-15T10:30:00.000Z"',
    );
    expect(vectorExpr).toContain(
      '$.activationDate == "2024-02-20T14:45:00.000Z"',
    );
  });

  it("test date object in in clause", () => {
    // Test that Date objects in IN clauses are properly formatted
    const date1 = new Date("2024-01-15T10:30:00Z");
    const date2 = new Date("2024-02-20T14:45:00Z");

    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.IN,
        new Filter.Key("activationDate"),
        new Filter.Value([date1, date2]),
      ),
    );

    // Verify Date objects are formatted in JSONPath
    expect(vectorExpr).toContain("$.activationDate");
    // Jackson includes milliseconds in date serialization
    expect(vectorExpr).toContain("2024-01-15T10:30:00.000Z");
    expect(vectorExpr).toContain("2024-02-20T14:45:00.000Z");
  });
});
