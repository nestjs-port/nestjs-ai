import { beforeEach, describe, expect, it } from "vitest";
import { Filter } from "../filter";
import type { FilterExpressionConverter } from "../filter-expression-converter";
import { FilterExpressionTextParser } from "../filter-expression-text-parser";
import { FilterHelper } from "../filter-helper";

class InNinTestConverter implements FilterExpressionConverter {
  convertExpression(expression: Filter.Expression): string {
    if (expression.type === Filter.ExpressionType.IN) {
      const context: string[] = [];
      FilterHelper.expandIn(expression, context, this);
      return context.join("");
    }

    if (expression.type === Filter.ExpressionType.NIN) {
      const context: string[] = [];
      FilterHelper.expandNin(expression, context, this);
      return context.join("");
    }

    return this.renderExpression(expression);
  }

  private renderExpression(expression: Filter.Expression): string {
    const left = this.renderOperand(expression.left);

    switch (expression.type) {
      case Filter.ExpressionType.AND:
      case Filter.ExpressionType.OR: {
        const right = this.renderOperand(expression.right as Filter.Operand);
        return `${left} ${expression.type} ${right}`;
      }
      case Filter.ExpressionType.EQ:
      case Filter.ExpressionType.NE:
      case Filter.ExpressionType.GT:
      case Filter.ExpressionType.GTE:
      case Filter.ExpressionType.LT:
      case Filter.ExpressionType.LTE:
      case Filter.ExpressionType.ISNULL:
      case Filter.ExpressionType.ISNOTNULL:
      case Filter.ExpressionType.IN:
      case Filter.ExpressionType.NIN: {
        const right = this.renderOperand(expression.right as Filter.Operand);
        return `${left} ${expression.type} ${right}`;
      }
      case Filter.ExpressionType.NOT:
        return `NOT ${left}`;
      default:
        throw new Error(`Unsupported expression type: ${expression.type}`);
    }
  }

  private renderOperand(operand: Filter.Operand): string {
    if (operand instanceof Filter.Key) {
      return operand.key;
    }

    if (operand instanceof Filter.Value) {
      if (Array.isArray(operand.value)) {
        return `[${operand.value.join(", ")}]`;
      }
      return String(operand.value);
    }

    if (operand instanceof Filter.Group) {
      return `(${this.renderExpression(operand.content)})`;
    }

    if (operand instanceof Filter.Expression) {
      return this.renderExpression(operand);
    }

    throw new Error(
      `Unsupported operand type: ${(operand as object).constructor.name}`,
    );
  }
}

describe("FilterHelper", () => {
  let parser: FilterExpressionTextParser;

  beforeEach(() => {
    parser = new FilterExpressionTextParser();
  });

  it("negate EQ", () => {
    expect(parser.parse("NOT key == 'UK' ")).toEqual(
      new Filter.Expression(
        Filter.ExpressionType.NOT,
        new Filter.Expression(
          Filter.ExpressionType.EQ,
          new Filter.Key("key"),
          new Filter.Value("UK"),
        ),
        null,
      ),
    );

    expect(FilterHelper.negate(parser.parse("NOT key == 'UK' "))).toEqual(
      new Filter.Expression(
        Filter.ExpressionType.NE,
        new Filter.Key("key"),
        new Filter.Value("UK"),
      ),
    );

    expect(FilterHelper.negate(parser.parse("NOT (key == 'UK') "))).toEqual(
      new Filter.Group(
        new Filter.Expression(
          Filter.ExpressionType.NE,
          new Filter.Key("key"),
          new Filter.Value("UK"),
        ),
      ),
    );
  });

  it("negate NE", () => {
    const exp = parser.parse("NOT key != 'UK' ");
    expect(FilterHelper.negate(exp)).toEqual(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key("key"),
        new Filter.Value("UK"),
      ),
    );
  });

  it("negate GT", () => {
    const exp = parser.parse("NOT key > 13 ");
    expect(FilterHelper.negate(exp)).toEqual(
      new Filter.Expression(
        Filter.ExpressionType.LTE,
        new Filter.Key("key"),
        new Filter.Value(13),
      ),
    );
  });

  it("negate GTE", () => {
    const exp = parser.parse("NOT key >= 13 ");
    expect(FilterHelper.negate(exp)).toEqual(
      new Filter.Expression(
        Filter.ExpressionType.LT,
        new Filter.Key("key"),
        new Filter.Value(13),
      ),
    );
  });

  it("negate LT", () => {
    const exp = parser.parse("NOT key < 13 ");
    expect(FilterHelper.negate(exp)).toEqual(
      new Filter.Expression(
        Filter.ExpressionType.GTE,
        new Filter.Key("key"),
        new Filter.Value(13),
      ),
    );
  });

  it("negate LTE", () => {
    const exp = parser.parse("NOT key <= 13 ");
    expect(FilterHelper.negate(exp)).toEqual(
      new Filter.Expression(
        Filter.ExpressionType.GT,
        new Filter.Key("key"),
        new Filter.Value(13),
      ),
    );
  });

  it("negate IN", () => {
    const exp = parser.parse("NOT key IN [11, 12, 13] ");
    expect(FilterHelper.negate(exp)).toEqual(
      new Filter.Expression(
        Filter.ExpressionType.NIN,
        new Filter.Key("key"),
        new Filter.Value([11, 12, 13]),
      ),
    );
  });

  it("negate NIN", () => {
    const exp = parser.parse("NOT key NIN [11, 12, 13] ");
    expect(FilterHelper.negate(exp)).toEqual(
      new Filter.Expression(
        Filter.ExpressionType.IN,
        new Filter.Key("key"),
        new Filter.Value([11, 12, 13]),
      ),
    );
  });

  it("negate NIN 2", () => {
    const exp = parser.parse("NOT key NOT IN [11, 12, 13] ");
    expect(FilterHelper.negate(exp)).toEqual(
      new Filter.Expression(
        Filter.ExpressionType.IN,
        new Filter.Key("key"),
        new Filter.Value([11, 12, 13]),
      ),
    );
  });

  it("negate AND", () => {
    const exp = parser.parse("NOT(key >= 11 AND key < 13)");
    expect(FilterHelper.negate(exp)).toEqual(
      new Filter.Group(
        new Filter.Expression(
          Filter.ExpressionType.OR,
          new Filter.Expression(
            Filter.ExpressionType.LT,
            new Filter.Key("key"),
            new Filter.Value(11),
          ),
          new Filter.Expression(
            Filter.ExpressionType.GTE,
            new Filter.Key("key"),
            new Filter.Value(13),
          ),
        ),
      ),
    );
  });

  it("negate OR", () => {
    const exp = parser.parse("NOT(key >= 11 OR key < 13)");
    expect(FilterHelper.negate(exp)).toEqual(
      new Filter.Group(
        new Filter.Expression(
          Filter.ExpressionType.AND,
          new Filter.Expression(
            Filter.ExpressionType.LT,
            new Filter.Key("key"),
            new Filter.Value(11),
          ),
          new Filter.Expression(
            Filter.ExpressionType.GTE,
            new Filter.Key("key"),
            new Filter.Value(13),
          ),
        ),
      ),
    );
  });

  it("negate NOT", () => {
    const exp = parser.parse("NOT NOT(key >= 11)");
    expect(FilterHelper.negate(exp)).toEqual(
      new Filter.Group(
        new Filter.Expression(
          Filter.ExpressionType.LT,
          new Filter.Key("key"),
          new Filter.Value(11),
        ),
      ),
    );
  });

  it("negate nested NOT", () => {
    const exp = parser.parse("NOT(NOT(key >= 11))");

    expect(exp).toEqual(
      new Filter.Expression(
        Filter.ExpressionType.NOT,
        new Filter.Group(
          new Filter.Expression(
            Filter.ExpressionType.NOT,
            new Filter.Group(
              new Filter.Expression(
                Filter.ExpressionType.GTE,
                new Filter.Key("key"),
                new Filter.Value(11),
              ),
            ),
            null,
          ),
        ),
        null,
      ),
    );

    expect(FilterHelper.negate(exp)).toEqual(
      new Filter.Group(
        new Filter.Expression(
          Filter.ExpressionType.LT,
          new Filter.Key("key"),
          new Filter.Value(11),
        ),
      ),
    );
  });

  it("expand IN", () => {
    const exp = parser.parse("key IN [11, 12, 13] ");
    expect(new InNinTestConverter().convertExpression(exp)).toEqual(
      "key EQ 11 OR key EQ 12 OR key EQ 13",
    );
  });

  it("expand NIN", () => {
    const exp1 = parser.parse("key NIN [11, 12, 13] ");
    const exp2 = parser.parse("key NOT IN [11, 12, 13] ");

    expect(exp1).toEqual(exp2);
    expect(new InNinTestConverter().convertExpression(exp1)).toEqual(
      "key NE 11 AND key NE 12 AND key NE 13",
    );
  });
});
