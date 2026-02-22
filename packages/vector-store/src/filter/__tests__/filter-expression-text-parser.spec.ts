import { beforeEach, describe, expect, it } from "vitest";
import { Filter } from "../filter";
import { FilterExpressionTextParser } from "../filter-expression-text-parser";

describe("FilterExpressionTextParser", () => {
  let parser: FilterExpressionTextParser;

  beforeEach(() => {
    parser = new FilterExpressionTextParser();
  });

  it("test string escaping", () => {
    let exp = parser.parse("stuff == \"he'd say \\\"hello\\\", I'd say 'hi'\"");
    expect((exp.right as Filter.Value).value).toEqual(
      "he'd say \"hello\", I'd say 'hi'",
    );

    exp = parser.parse("stuff == 'he\\'d say \"hello\", I\\'d say \\'hi\\''");
    expect((exp.right as Filter.Value).value).toEqual(
      "he'd say \"hello\", I'd say 'hi'",
    );

    exp = parser.parse("stuff == 'This is a single backslash: \\\\'");
    expect((exp.right as Filter.Value).value).toEqual(
      "This is a single backslash: \\",
    );
  });

  it("test eq", () => {
    // country == "BG"
    const exp = parser.parse("country == 'BG'");
    expect(exp).toEqual(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("country"),
        new Filter.Value("BG"),
      ),
    );

    expect(parser.cache.get(`WHERE ${"country == 'BG'"}`)).toEqual(exp);
  });

  it("tes eq and gte", () => {
    // genre == "drama" AND year >= 2020
    const exp = parser.parse("genre == 'drama' && year >= 2020");
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

    expect(
      parser.cache.get(`WHERE ${"genre == 'drama' && year >= 2020"}`),
    ).toEqual(exp);
  });

  it("tes in", () => {
    // genre in ["comedy", "documentary", "drama"]
    const exp = parser.parse("genre in ['comedy', 'documentary', 'drama']");
    expect(exp).toEqual(
      new Filter.Expression(
        Filter.ExpressionType.IN,
        new Filter.Key("genre"),
        new Filter.Value(["comedy", "documentary", "drama"]),
      ),
    );

    expect(
      parser.cache.get(
        `WHERE ${"genre in ['comedy', 'documentary', 'drama']"}`,
      ),
    ).toEqual(exp);
  });

  it("test ne", () => {
    // year >= 2020 OR country == "BG" AND city != "Sofia"
    const exp = parser.parse(
      'year >= 2020 OR country == "BG" AND city != "Sofia"',
    );
    expect(exp).toEqual(
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

    expect(
      parser.cache.get(
        `WHERE ${'year >= 2020 OR country == "BG" AND city != "Sofia"'}`,
      ),
    ).toEqual(exp);
  });

  it("test group", () => {
    // (year >= 2020 OR country == "BG") AND city NIN ["Sofia", "Plovdiv"]
    const exp = parser.parse(
      '(year >= 2020 OR country == "BG") AND city NIN ["Sofia", "Plovdiv"]',
    );

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

    expect(
      parser.cache.get(
        `WHERE ${'(year >= 2020 OR country == "BG") AND city NIN ["Sofia", "Plovdiv"]'}`,
      ),
    ).toEqual(exp);
  });

  it("tes boolean", () => {
    // isOpen == true AND year >= 2020 AND country IN ["BG", "NL", "US"]
    const exp = parser.parse(
      'isOpen == true AND year >= 2020 AND country IN ["BG", "NL", "US"]',
    );

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
    expect(
      parser.cache.get(
        `WHERE ${'isOpen == true AND year >= 2020 AND country IN ["BG", "NL", "US"]'}`,
      ),
    ).toEqual(exp);
  });

  it("tes not", () => {
    // NOT(isOpen == true AND year >= 2020 AND country IN ["BG", "NL", "US"])
    const exp = parser.parse(
      'not(isOpen == true AND year >= 2020 AND country IN ["BG", "NL", "US"])',
    );

    expect(exp).toEqual(
      new Filter.Expression(
        Filter.ExpressionType.NOT,
        new Filter.Group(
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
        ),
        null,
      ),
    );

    expect(
      parser.cache.get(
        `WHERE ${'not(isOpen == true AND year >= 2020 AND country IN ["BG", "NL", "US"])'}`,
      ),
    ).toEqual(exp);
  });

  it("tes not nin", () => {
    // NOT(country NOT IN ["BG", "NL", "US"])
    const exp = parser.parse('not(country NOT IN ["BG", "NL", "US"])');

    expect(exp).toEqual(
      new Filter.Expression(
        Filter.ExpressionType.NOT,
        new Filter.Group(
          new Filter.Expression(
            Filter.ExpressionType.NIN,
            new Filter.Key("country"),
            new Filter.Value(["BG", "NL", "US"]),
          ),
        ),
        null,
      ),
    );
  });

  it("tes not nin2", () => {
    // NOT country NOT IN ["BG", "NL", "US"]
    const exp = parser.parse('NOT country NOT IN ["BG", "NL", "US"]');

    expect(exp).toEqual(
      new Filter.Expression(
        Filter.ExpressionType.NOT,
        new Filter.Expression(
          Filter.ExpressionType.NIN,
          new Filter.Key("country"),
          new Filter.Value(["BG", "NL", "US"]),
        ),
        null,
      ),
    );
  });

  it("tes nested not", () => {
    // NOT(isOpen == true AND year >= 2020 AND NOT(country IN ["BG", "NL", "US"]))
    const exp = parser.parse(
      'not(isOpen == true AND year >= 2020 AND NOT(country IN ["BG", "NL", "US"]))',
    );

    expect(exp).toEqual(
      new Filter.Expression(
        Filter.ExpressionType.NOT,
        new Filter.Group(
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
              Filter.ExpressionType.NOT,
              new Filter.Group(
                new Filter.Expression(
                  Filter.ExpressionType.IN,
                  new Filter.Key("country"),
                  new Filter.Value(["BG", "NL", "US"]),
                ),
              ),
              null,
            ),
          ),
        ),
        null,
      ),
    );

    expect(
      parser.cache.get(
        `WHERE ${'not(isOpen == true AND year >= 2020 AND NOT(country IN ["BG", "NL", "US"]))'}`,
      ),
    ).toEqual(exp);
  });

  it("test decimal", () => {
    // temperature >= -15.6 && temperature <= +20.13
    const expText = "temperature >= -15.6 && temperature <= +20.13";
    const exp = parser.parse(expText);

    expect(exp).toEqual(
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

    expect(parser.cache.get(`WHERE ${expText}`)).toEqual(exp);
  });

  it("test long", () => {
    const exp2 = parser.parse("biz_id == 3L");
    const exp3 = parser.parse("biz_id == -5L");

    expect(exp2).toEqual(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("biz_id"),
        new Filter.Value(3),
      ),
    );
    expect(exp3).toEqual(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("biz_id"),
        new Filter.Value(-5),
      ),
    );
  });

  it("test identifiers", () => {
    let exp = parser.parse("'country.1' == 'BG'");
    expect(exp).toEqual(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("'country.1'"),
        new Filter.Value("BG"),
      ),
    );

    exp = parser.parse("'country_1_2_3' == 'BG'");
    expect(exp).toEqual(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("'country_1_2_3'"),
        new Filter.Value("BG"),
      ),
    );

    exp = parser.parse("\"country 1 2 3\" == 'BG'");
    expect(exp).toEqual(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key('"country 1 2 3"'),
        new Filter.Value("BG"),
      ),
    );
  });

  it("test unescaped identifier with underscores", () => {
    const exp = parser.parse("file_name == 'medicaid-wa-faqs.pdf'");
    expect(exp).toEqual(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("file_name"),
        new Filter.Value("medicaid-wa-faqs.pdf"),
      ),
    );
  });
});
