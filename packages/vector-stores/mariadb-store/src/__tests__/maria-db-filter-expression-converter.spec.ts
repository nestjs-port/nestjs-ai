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

import { Filter, FilterExpressionTextParser } from "@nestjs-ai/vector-store";

import { MariaDBFilterExpressionConverter } from "../maria-db-filter-expression-converter.js";

describe("MariaDBFilterExpressionConverterTests", () => {
  const converter = new MariaDBFilterExpressionConverter("metadata");

  it("test eq", () => {
    // country == "BG"
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("country"),
        new Filter.Value("BG"),
      ),
    );
    expect(vectorExpr).toBe("JSON_VALUE(`metadata`, '$.\"country\"') = 'BG'");
  });

  it("test eq and gte", () => {
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
      "JSON_VALUE(`metadata`, '$.\"genre\"') = 'drama' AND JSON_VALUE(`metadata`, '$.\"year\"') >= 2020",
    );
  });

  it("test in", () => {
    // genre in ["comedy", "documentary", "drama"]
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.IN,
        new Filter.Key("genre"),
        new Filter.Value(["comedy", "documentary", "drama"]),
      ),
    );
    expect(vectorExpr).toBe(
      "JSON_VALUE(`metadata`, '$.\"genre\"') IN ('comedy','documentary','drama')",
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
      "JSON_VALUE(`metadata`, '$.\"year\"') >= 2020 OR JSON_VALUE(`metadata`, '$.\"country\"') = 'BG' AND JSON_VALUE(`metadata`, '$.\"city\"') != 'Sofia'",
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
      "(JSON_VALUE(`metadata`, '$.\"year\"') >= 2020 OR JSON_VALUE(`metadata`, '$.\"country\"') = 'BG') AND JSON_VALUE(`metadata`, '$.\"city\"') NOT IN ('Sofia','Plovdiv')",
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
      "JSON_VALUE(`metadata`, '$.\"isOpen\"') = true AND JSON_VALUE(`metadata`, '$.\"year\"') >= 2020 AND JSON_VALUE(`metadata`, '$.\"country\"') IN ('BG','NL','US')",
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
      "JSON_VALUE(`metadata`, '$.\"temperature\"') >= -15.6 AND JSON_VALUE(`metadata`, '$.\"temperature\"') <= 20.13",
    );
  });

  it("test complex identifiers", () => {
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key('"country 1 2 3"'),
        new Filter.Value("BG"),
      ),
    );
    expect(vectorExpr).toBe(
      "JSON_VALUE(`metadata`, '$.\"\\\\\"country 1 2 3\\\\\"\"') = 'BG'",
    );
  });

  it("test empty list", () => {
    // category IN []
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.IN,
        new Filter.Key("category"),
        new Filter.Value([]),
      ),
    );
    expect(vectorExpr).toBe("JSON_VALUE(`metadata`, '$.\"category\"') IN ()");
  });

  it("test single item list", () => {
    // status IN ["active"]
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.IN,
        new Filter.Key("status"),
        new Filter.Value(["active"]),
      ),
    );
    expect(vectorExpr).toBe(
      "JSON_VALUE(`metadata`, '$.\"status\"') IN ('active')",
    );
  });

  it("test null value", () => {
    // description == null
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("description"),
        new Filter.Value(null),
      ),
    );
    expect(vectorExpr).toBe(
      "JSON_VALUE(`metadata`, '$.\"description\"') = null",
    );
  });

  it("test nested json path", () => {
    // entity.profile.name == "EntityA"
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("entity.profile.name"),
        new Filter.Value("EntityA"),
      ),
    );
    expect(vectorExpr).toBe(
      "JSON_VALUE(`metadata`, '$.\"entity.profile.name\"') = 'EntityA'",
    );
  });

  it("test numeric string value", () => {
    // id == "1"
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("id"),
        new Filter.Value("1"),
      ),
    );
    expect(vectorExpr).toBe("JSON_VALUE(`metadata`, '$.\"id\"') = '1'");
  });

  it("test zero value", () => {
    // count == 0
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("count"),
        new Filter.Value(0),
      ),
    );
    expect(vectorExpr).toBe("JSON_VALUE(`metadata`, '$.\"count\"') = 0");
  });

  it("test complex nested groups", () => {
    // ((fieldA >= 100 AND fieldB == "X1") OR (fieldA >= 50 AND fieldB == "Y2")) AND
    // fieldC != "inactive"
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
                  new Filter.Key("fieldA"),
                  new Filter.Value(100),
                ),
                new Filter.Expression(
                  Filter.ExpressionType.EQ,
                  new Filter.Key("fieldB"),
                  new Filter.Value("X1"),
                ),
              ),
            ),
            new Filter.Group(
              new Filter.Expression(
                Filter.ExpressionType.AND,
                new Filter.Expression(
                  Filter.ExpressionType.GTE,
                  new Filter.Key("fieldA"),
                  new Filter.Value(50),
                ),
                new Filter.Expression(
                  Filter.ExpressionType.EQ,
                  new Filter.Key("fieldB"),
                  new Filter.Value("Y2"),
                ),
              ),
            ),
          ),
        ),
        new Filter.Expression(
          Filter.ExpressionType.NE,
          new Filter.Key("fieldC"),
          new Filter.Value("inactive"),
        ),
      ),
    );
    expect(vectorExpr).toBe(
      "((JSON_VALUE(`metadata`, '$.\"fieldA\"') >= 100 AND JSON_VALUE(`metadata`, '$.\"fieldB\"') = 'X1') OR (JSON_VALUE(`metadata`, '$.\"fieldA\"') >= 50 AND JSON_VALUE(`metadata`, '$.\"fieldB\"') = 'Y2')) AND JSON_VALUE(`metadata`, '$.\"fieldC\"') != 'inactive'",
    );
  });

  it("test mixed data types", () => {
    // active == true AND score >= 1.5 AND tags IN ["featured", "premium"] AND
    // version == 1
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.AND,
        new Filter.Expression(
          Filter.ExpressionType.AND,
          new Filter.Expression(
            Filter.ExpressionType.AND,
            new Filter.Expression(
              Filter.ExpressionType.EQ,
              new Filter.Key("active"),
              new Filter.Value(true),
            ),
            new Filter.Expression(
              Filter.ExpressionType.GTE,
              new Filter.Key("score"),
              new Filter.Value(1.5),
            ),
          ),
          new Filter.Expression(
            Filter.ExpressionType.IN,
            new Filter.Key("tags"),
            new Filter.Value(["featured", "premium"]),
          ),
        ),
        new Filter.Expression(
          Filter.ExpressionType.EQ,
          new Filter.Key("version"),
          new Filter.Value(1),
        ),
      ),
    );
    expect(vectorExpr).toBe(
      "JSON_VALUE(`metadata`, '$.\"active\"') = true AND JSON_VALUE(`metadata`, '$.\"score\"') >= 1.5 AND JSON_VALUE(`metadata`, '$.\"tags\"') IN ('featured','premium') AND JSON_VALUE(`metadata`, '$.\"version\"') = 1",
    );
  });

  it("test nin with mixed types", () => {
    // status NIN ["A", "B", "C"]
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.NIN,
        new Filter.Key("status"),
        new Filter.Value(["A", "B", "C"]),
      ),
    );
    expect(vectorExpr).toBe(
      "JSON_VALUE(`metadata`, '$.\"status\"') NOT IN ('A','B','C')",
    );
  });

  it("test empty string value", () => {
    // description != ""
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.NE,
        new Filter.Key("description"),
        new Filter.Value(""),
      ),
    );
    expect(vectorExpr).toBe(
      "JSON_VALUE(`metadata`, '$.\"description\"') != ''",
    );
  });

  it("test array index access", () => {
    // tags[0] == "important"
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("tags[0]"),
        new Filter.Value("important"),
      ),
    );
    expect(vectorExpr).toBe(
      "JSON_VALUE(`metadata`, '$.\"tags[0]\"') = 'important'",
    );
  });

  // Security Tests - SQL Injection Prevention

  it("test sql injection with single quote escape", () => {
    // Attempt to inject: department == '' OR '1'='1'
    // Malicious value: ' OR '1'='1
    const maliciousValue = "' OR '1'='1";
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("department"),
        new Filter.Value(maliciousValue),
      ),
    );

    // Expected format with SQL-escaped single quotes (doubled)
    // The single quote before OR should be doubled: ''' OR
    const expected =
      "JSON_VALUE(`metadata`, '$.\"department\"') = ''' OR ''1''=''1'";

    expect(vectorExpr).toBe(expected);
  });

  it("test sql injection with backslash escape", () => {
    // Attempt to inject using backslash escape: value\'
    const maliciousValue = "value\\'";
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("field"),
        new Filter.Value(maliciousValue),
      ),
    );

    // Should escape both backslash and quote
    // Input: value\' → Output: value\\''' (backslash becomes \\, quote becomes '')
    expect(vectorExpr).toBe(
      "JSON_VALUE(`metadata`, '$.\"field\"') = 'value\\\\'''",
    );
  });

  it("test sql injection with double quote", () => {
    // Attempt to inject using double quotes: value" OR field="admin
    const maliciousValue = 'value" OR field="admin';
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("field"),
        new Filter.Value(maliciousValue),
      ),
    );

    // In SQL single-quoted strings, double quotes don't need escaping
    // They are treated as literal characters
    expect(vectorExpr).toBe(
      "JSON_VALUE(`metadata`, '$.\"field\"') = 'value\" OR field=\"admin'",
    );
  });

  it("test sql injection with control characters", () => {
    // Attempt to inject using newline: value\n OR field='admin'
    const maliciousValue = "value\n OR field='admin'";
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("field"),
        new Filter.Value(maliciousValue),
      ),
    );

    // Should escape newline and single quotes
    expect(vectorExpr).toBe(
      "JSON_VALUE(`metadata`, '$.\"field\"') = 'value\\n OR field=''admin'''",
    );
    expect(vectorExpr).toContain("\\n");
    expect(vectorExpr).toContain("''");
    // Verify newline is escaped (not a literal newline)
    expect(vectorExpr).not.toContain("'\n");
  });

  it("test sql injection with multiple escapes", () => {
    // Complex injection with multiple special characters
    const maliciousValue = "test'\"\\'\n\r\t";
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("field"),
        new Filter.Value(maliciousValue),
      ),
    );

    // All special characters should be escaped according to SQL rules
    // Single quotes: doubled, backslashes: \\, control chars: \n, \r, \t
    // Double quotes: no escaping needed in SQL single-quoted strings
    expect(vectorExpr).toBe(
      "JSON_VALUE(`metadata`, '$.\"field\"') = 'test''\"\\\\''\\n\\r\\t'",
    );
  });

  it("test sql injection in list values", () => {
    // Attempt injection through IN clause
    const maliciousValue1 = "HR' OR department='Finance";
    const maliciousValue2 = "Engineering";
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.IN,
        new Filter.Key("department"),
        new Filter.Value([maliciousValue1, maliciousValue2]),
      ),
    );

    // Should escape single quotes in list values (doubled per SQL standard)
    expect(vectorExpr).toContain("HR'' OR department=''Finance");
    expect(vectorExpr).toContain("Engineering");
  });

  it("test sql injection in complex expression", () => {
    // Attempt injection in a complex AND/OR expression
    const maliciousValue = "' OR role='admin' OR dept='";
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
    // Single quotes should be doubled per SQL standard
    expect(vectorExpr).toContain("'' OR role=''admin'' OR dept=''");
    // Verify the AND operator is still present (not broken by injection)
    expect(vectorExpr).toContain(" AND ");
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

    expect(vectorExpr).toBe(
      "JSON_VALUE(`metadata`, '$.\"department\"') = 'HR Department'",
    );
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

  it("test date value", () => {
    // Test that Date objects are properly formatted as ISO 8601 strings
    const testDate = new Date("2024-01-15T10:30:00Z");
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("activationDate"),
        new Filter.Value(testDate),
      ),
    );

    // Verify date is formatted as ISO 8601 string with SQL escaping (milliseconds
    // from formatter)
    expect(vectorExpr).toBe(
      "JSON_VALUE(`metadata`, '$.\"activationDate\"') = '2024-01-15T10:30:00.000Z'",
    );
  });

  it("test date string value", () => {
    // Test that ISO date strings are normalized to Date objects and formatted
    // correctly
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("activationDate"),
        new Filter.Value("2024-01-15T10:30:00Z"),
      ),
    );

    // Verify ISO date strings are normalized and formatted correctly (milliseconds
    // from formatter)
    expect(vectorExpr).toBe(
      "JSON_VALUE(`metadata`, '$.\"activationDate\"') = '2024-01-15T10:30:00.000Z'",
    );
  });

  it("test date with milliseconds", () => {
    // Test that ISO date strings with milliseconds are handled correctly
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("timestamp"),
        new Filter.Value("2024-01-15T10:30:00.123Z"),
      ),
    );

    // After normalization, milliseconds should be preserved
    // Note: Actual output depends on whether DateTimeFormatter preserves milliseconds
    expect(vectorExpr).toContain("2024-01-15T10:30:00");
  });

  it("test date in in clause", () => {
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

    // Verify dates are properly formatted in IN clause (milliseconds from formatter)
    expect(vectorExpr).toContain("'2024-01-15T10:30:00.000Z'");
    expect(vectorExpr).toContain("'2024-02-20T14:45:00.000Z'");
    expect(vectorExpr).toContain("IN (");
  });

  it("test date string in in clause", () => {
    // Test that ISO date strings in IN clauses are normalized and formatted
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.IN,
        new Filter.Key("activationDate"),
        new Filter.Value(["2024-01-15T10:30:00Z", "2024-02-20T14:45:00Z"]),
      ),
    );

    // Verify ISO date strings are normalized and formatted in IN clause (milliseconds
    // from formatter)
    expect(vectorExpr).toContain("'2024-01-15T10:30:00.000Z'");
    expect(vectorExpr).toContain("'2024-02-20T14:45:00.000Z'");
  });

  it("test date comparison", () => {
    // Test date comparison with GTE operator
    const testDate = new Date("2024-01-01T00:00:00Z");
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.GTE,
        new Filter.Key("createdAt"),
        new Filter.Value(testDate),
      ),
    );

    expect(vectorExpr).toBe(
      "JSON_VALUE(`metadata`, '$.\"createdAt\"') >= '2024-01-01T00:00:00.000Z'",
    );
  });

  it("test date in complex expression", () => {
    // Test date in complex AND expression
    const startDate = new Date("2024-01-01T00:00:00Z");
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.AND,
        new Filter.Expression(
          Filter.ExpressionType.EQ,
          new Filter.Key("department"),
          new Filter.Value("Engineering"),
        ),
        new Filter.Expression(
          Filter.ExpressionType.GTE,
          new Filter.Key("joinDate"),
          new Filter.Value(startDate),
        ),
      ),
    );

    expect(vectorExpr).toContain(
      "JSON_VALUE(`metadata`, '$.\"department\"') = 'Engineering'",
    );
    expect(vectorExpr).toContain(
      "JSON_VALUE(`metadata`, '$.\"joinDate\"') >= '2024-01-01T00:00:00.000Z'",
    );
    expect(vectorExpr).toContain(" AND ");
  });

  it("test key with single quote", () => {
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("x' OR 1=1--"),
        new Filter.Value("dummy"),
      ),
    );
    expect(vectorExpr).toBe(
      "JSON_VALUE(`metadata`, '$.\"x'' OR 1=1--\"') = 'dummy'",
    );
    expect(vectorExpr).not.toContain("'$.\"x\"' OR");
  });

  it("test quoted identifier from text parser", () => {
    const expr = new FilterExpressionTextParser().parse(
      "'safe_key' == 'value'",
    );
    const vectorExpr = converter.convertExpression(expr);
    expect(vectorExpr).toBe(
      "JSON_VALUE(`metadata`, '$.\"safe_key\"') = 'value'",
    );
  });

  it("test key with apostrophe", () => {
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("O'Brien"),
        new Filter.Value("test"),
      ),
    );
    expect(vectorExpr).toBe(
      "JSON_VALUE(`metadata`, '$.\"O''Brien\"') = 'test'",
    );
  });

  it("test key with backslash", () => {
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("key\\inject"),
        new Filter.Value("v"),
      ),
    );
    expect(vectorExpr).toBe(
      "JSON_VALUE(`metadata`, '$.\"key\\\\\\\\inject\"') = 'v'",
    );
  });

  it("test key with backslash and single quote", () => {
    const vectorExpr = converter.convertExpression(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("O\\'Brien"),
        new Filter.Value("v"),
      ),
    );
    expect(vectorExpr).toBe(
      "JSON_VALUE(`metadata`, '$.\"O\\\\\\\\''Brien\"') = 'v'",
    );
  });
});
