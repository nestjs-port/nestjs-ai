import { Filter } from "./filter";

export class FilterExpressionBuilder {
  eq(key: string, value: unknown): FilterExpressionBuilder.Op {
    return new FilterExpressionBuilder.Op(
      new Filter.Expression(
        Filter.ExpressionType.EQ,
        new Filter.Key(key),
        new Filter.Value(value),
      ),
    );
  }

  ne(key: string, value: unknown): FilterExpressionBuilder.Op {
    return new FilterExpressionBuilder.Op(
      new Filter.Expression(
        Filter.ExpressionType.NE,
        new Filter.Key(key),
        new Filter.Value(value),
      ),
    );
  }

  gt(key: string, value: unknown): FilterExpressionBuilder.Op {
    return new FilterExpressionBuilder.Op(
      new Filter.Expression(
        Filter.ExpressionType.GT,
        new Filter.Key(key),
        new Filter.Value(value),
      ),
    );
  }

  gte(key: string, value: unknown): FilterExpressionBuilder.Op {
    return new FilterExpressionBuilder.Op(
      new Filter.Expression(
        Filter.ExpressionType.GTE,
        new Filter.Key(key),
        new Filter.Value(value),
      ),
    );
  }

  lt(key: string, value: unknown): FilterExpressionBuilder.Op {
    return new FilterExpressionBuilder.Op(
      new Filter.Expression(
        Filter.ExpressionType.LT,
        new Filter.Key(key),
        new Filter.Value(value),
      ),
    );
  }

  lte(key: string, value: unknown): FilterExpressionBuilder.Op {
    return new FilterExpressionBuilder.Op(
      new Filter.Expression(
        Filter.ExpressionType.LTE,
        new Filter.Key(key),
        new Filter.Value(value),
      ),
    );
  }

  and(
    left: FilterExpressionBuilder.Op,
    right: FilterExpressionBuilder.Op,
  ): FilterExpressionBuilder.Op {
    return new FilterExpressionBuilder.Op(
      new Filter.Expression(
        Filter.ExpressionType.AND,
        left.expression,
        right.expression,
      ),
    );
  }

  or(
    left: FilterExpressionBuilder.Op,
    right: FilterExpressionBuilder.Op,
  ): FilterExpressionBuilder.Op {
    return new FilterExpressionBuilder.Op(
      new Filter.Expression(
        Filter.ExpressionType.OR,
        left.expression,
        right.expression,
      ),
    );
  }

  in(key: string, ...values: unknown[]): FilterExpressionBuilder.Op;
  in(key: string, values: unknown[]): FilterExpressionBuilder.Op;
  in(
    key: string,
    valuesOrFirst: unknown | unknown[],
    ...rest: unknown[]
  ): FilterExpressionBuilder.Op {
    const values = Array.isArray(valuesOrFirst)
      ? valuesOrFirst
      : [valuesOrFirst, ...rest];
    return new FilterExpressionBuilder.Op(
      new Filter.Expression(
        Filter.ExpressionType.IN,
        new Filter.Key(key),
        new Filter.Value(values),
      ),
    );
  }

  nin(key: string, ...values: unknown[]): FilterExpressionBuilder.Op;
  nin(key: string, values: unknown[]): FilterExpressionBuilder.Op;
  nin(
    key: string,
    valuesOrFirst: unknown | unknown[],
    ...rest: unknown[]
  ): FilterExpressionBuilder.Op {
    const values = Array.isArray(valuesOrFirst)
      ? valuesOrFirst
      : [valuesOrFirst, ...rest];
    return new FilterExpressionBuilder.Op(
      new Filter.Expression(
        Filter.ExpressionType.NIN,
        new Filter.Key(key),
        new Filter.Value(values),
      ),
    );
  }

  isNull(key: string): FilterExpressionBuilder.Op {
    return new FilterExpressionBuilder.Op(
      new Filter.Expression(Filter.ExpressionType.ISNULL, new Filter.Key(key)),
    );
  }

  isNotNull(key: string): FilterExpressionBuilder.Op {
    return new FilterExpressionBuilder.Op(
      new Filter.Expression(
        Filter.ExpressionType.ISNOTNULL,
        new Filter.Key(key),
      ),
    );
  }

  group(content: FilterExpressionBuilder.Op): FilterExpressionBuilder.Op {
    return new FilterExpressionBuilder.Op(new Filter.Group(content.build()));
  }

  not(content: FilterExpressionBuilder.Op): FilterExpressionBuilder.Op {
    return new FilterExpressionBuilder.Op(
      new Filter.Expression(
        Filter.ExpressionType.NOT,
        content.expression,
        null,
      ),
    );
  }
}

export namespace FilterExpressionBuilder {
  export class Op {
    constructor(readonly expression: Filter.Operand) {}

    build(): Filter.Expression {
      if (this.expression instanceof Filter.Group) {
        // Remove the top-level grouping.
        return this.expression.content;
      }
      if (this.expression instanceof Filter.Expression) {
        return this.expression;
      }
      throw new Error(`Invalid expression: ${String(this.expression)}`);
    }
  }
}
