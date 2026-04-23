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
import { Filter } from "../filter.js";
import { FilterExpressionBuilder } from "../filter-expression-builder.js";

describe("FilterExpressionBuilder", () => {
  const b = new FilterExpressionBuilder();

  it("EQ", () => {
    // country == "BG"
    expect(b.eq("country", "BG").build()).toEqual(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("country"),
        new Filter.Value("BG"),
      ),
    );
  });

  it("eq and gte", () => {
    // genre == "drama" AND year >= 2020
    const exp = b.and(b.eq("genre", "drama"), b.gte("year", 2020)).build();

    expect(exp).toEqual(
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
  });

  it("IN", () => {
    // genre in ["comedy", "documentary", "drama"]
    const exp = b.in("genre", "comedy", "documentary", "drama").build();

    expect(exp).toEqual(
      new Filter.Expression(
        Filter.ExpressionType.IN,
        new Filter.Key("genre"),
        new Filter.Value(["comedy", "documentary", "drama"]),
      ),
    );
  });

  it("NE", () => {
    // year >= 2020 OR country == "BG" AND city != "Sofia"
    const exp = b
      .and(
        b.or(b.gte("year", 2020), b.eq("country", "BG")),
        b.ne("city", "Sofia"),
      )
      .build();

    expect(exp).toEqual(
      new Filter.Expression(
        Filter.ExpressionType.AND,
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
        new Filter.Expression(
          Filter.ExpressionType.NE,
          new Filter.Key("city"),
          new Filter.Value("Sofia"),
        ),
      ),
    );
  });

  it("group", () => {
    // (year >= 2020 OR country == "BG") AND city NIN ["Sofia", "Plovdiv"]
    const exp = b
      .and(
        b.group(b.or(b.gte("year", 2020), b.eq("country", "BG"))),
        b.nin("city", "Sofia", "Plovdiv"),
      )
      .build();

    expect(exp).toEqual(
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
  });

  it("IN 2", () => {
    // isOpen == true AND year >= 2020 AND country IN ["BG", "NL", "US"]
    const exp = b
      .and(
        b.and(b.eq("isOpen", true), b.gte("year", 2020)),
        b.in("country", "BG", "NL", "US"),
      )
      .build();

    expect(exp).toEqual(
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
  });

  it("NOT", () => {
    // isOpen == true AND year >= 2020 AND country IN ["BG", "NL", "US"]
    const exp = b
      .not(
        b.and(
          b.and(b.eq("isOpen", true), b.gte("year", 2020)),
          b.in("country", "BG", "NL", "US"),
        ),
      )
      .build();

    expect(exp).toEqual(
      new Filter.Expression(
        Filter.ExpressionType.NOT,
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
        null,
      ),
    );
  });

  it("less than operators", () => {
    // value < 1
    const ltExp = b.lt("value", 1).build();
    expect(ltExp).toEqual(
      new Filter.Expression(
        Filter.ExpressionType.LT,
        new Filter.Key("value"),
        new Filter.Value(1),
      ),
    );

    // value <= 1
    const lteExp = b.lte("value", 1).build();
    expect(lteExp).toEqual(
      new Filter.Expression(
        Filter.ExpressionType.LTE,
        new Filter.Key("value"),
        new Filter.Value(1),
      ),
    );
  });

  it("greater than operators", () => {
    // value > 1
    const gtExp = b.gt("value", 1).build();
    expect(gtExp).toEqual(
      new Filter.Expression(
        Filter.ExpressionType.GT,
        new Filter.Key("value"),
        new Filter.Value(1),
      ),
    );

    // value >= 10
    const gteExp = b.gte("value", 10).build();
    expect(gteExp).toEqual(
      new Filter.Expression(
        Filter.ExpressionType.GTE,
        new Filter.Key("value"),
        new Filter.Value(10),
      ),
    );
  });

  it("null values", () => {
    // status == null
    const exp = b.eq("status", null).build();
    expect(exp).toEqual(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("status"),
        new Filter.Value(null),
      ),
    );
  });

  it("empty IN clause", () => {
    // category IN []
    const exp = b.in("category", []).build();
    expect(exp).toEqual(
      new Filter.Expression(
        Filter.ExpressionType.IN,
        new Filter.Key("category"),
        new Filter.Value([]),
      ),
    );
  });

  it("single value IN clause", () => {
    // type IN ["basic"]
    const exp = b.in("type", "basic").build();
    expect(exp).toEqual(
      new Filter.Expression(
        Filter.ExpressionType.IN,
        new Filter.Key("type"),
        new Filter.Value(["basic"]),
      ),
    );
  });

  it("complex nested groups", () => {
    // ((level >= 1 AND level <= 5) OR status == "special") AND (region IN ["north",
    // "south"] OR enabled == true)
    const exp = b
      .and(
        b.or(
          b.group(b.and(b.gte("level", 1), b.lte("level", 5))),
          b.eq("status", "special"),
        ),
        b.group(b.or(b.in("region", "north", "south"), b.eq("enabled", true))),
      )
      .build();

    const expected = new Filter.Expression(
      Filter.ExpressionType.AND,
      new Filter.Expression(
        Filter.ExpressionType.OR,
        new Filter.Group(
          new Filter.Expression(
            Filter.ExpressionType.AND,
            new Filter.Expression(
              Filter.ExpressionType.GTE,
              new Filter.Key("level"),
              new Filter.Value(1),
            ),
            new Filter.Expression(
              Filter.ExpressionType.LTE,
              new Filter.Key("level"),
              new Filter.Value(5),
            ),
          ),
        ),
        new Filter.Expression(
          Filter.ExpressionType.EQ,
          new Filter.Key("status"),
          new Filter.Value("special"),
        ),
      ),
      new Filter.Group(
        new Filter.Expression(
          Filter.ExpressionType.OR,
          new Filter.Expression(
            Filter.ExpressionType.IN,
            new Filter.Key("region"),
            new Filter.Value(["north", "south"]),
          ),
          new Filter.Expression(
            Filter.ExpressionType.EQ,
            new Filter.Key("enabled"),
            new Filter.Value(true),
          ),
        ),
      ),
    );

    expect(exp).toEqual(expected);
  });

  it("NOT with simple expression", () => {
    // NOT (active == true)
    const exp = b.not(b.eq("active", true)).build();
    expect(exp).toEqual(
      new Filter.Expression(
        Filter.ExpressionType.NOT,
        new Filter.Expression(
          Filter.ExpressionType.EQ,
          new Filter.Key("active"),
          new Filter.Value(true),
        ),
        null,
      ),
    );
  });

  it("NOT with group", () => {
    // NOT (level >= 3 AND region == "east")
    const exp = b
      .not(b.group(b.and(b.gte("level", 3), b.eq("region", "east"))))
      .build();

    const expected = new Filter.Expression(
      Filter.ExpressionType.NOT,
      new Filter.Group(
        new Filter.Expression(
          Filter.ExpressionType.AND,
          new Filter.Expression(
            Filter.ExpressionType.GTE,
            new Filter.Key("level"),
            new Filter.Value(3),
          ),
          new Filter.Expression(
            Filter.ExpressionType.EQ,
            new Filter.Key("region"),
            new Filter.Value("east"),
          ),
        ),
      ),
      null,
    );

    expect(exp).toEqual(expected);
  });

  it("multiple NOT operators", () => {
    // NOT (NOT (active == true))
    const exp = b.not(b.not(b.eq("active", true))).build();

    const expected = new Filter.Expression(
      Filter.ExpressionType.NOT,
      new Filter.Expression(
        Filter.ExpressionType.NOT,
        new Filter.Expression(
          Filter.ExpressionType.EQ,
          new Filter.Key("active"),
          new Filter.Value(true),
        ),
        null,
      ),
      null,
    );

    expect(exp).toEqual(expected);
  });

  it("special characters in keys", () => {
    // "item.name" == "test" AND "meta-data" != null
    const exp = b
      .and(b.eq("item.name", "test"), b.ne("meta-data", null))
      .build();

    const expected = new Filter.Expression(
      Filter.ExpressionType.AND,
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("item.name"),
        new Filter.Value("test"),
      ),
      new Filter.Expression(
        Filter.ExpressionType.NE,
        new Filter.Key("meta-data"),
        new Filter.Value(null),
      ),
    );

    expect(exp).toEqual(expected);
  });

  it("empty string values", () => {
    // description == "" OR label != ""
    const exp = b.or(b.eq("description", ""), b.ne("label", "")).build();

    const expected = new Filter.Expression(
      Filter.ExpressionType.OR,
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("description"),
        new Filter.Value(""),
      ),
      new Filter.Expression(
        Filter.ExpressionType.NE,
        new Filter.Key("label"),
        new Filter.Value(""),
      ),
    );

    expect(exp).toEqual(expected);
  });
});
