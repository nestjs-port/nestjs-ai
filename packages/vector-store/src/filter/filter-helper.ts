import assert from "node:assert/strict";
import { Filter } from "./filter";
import type { FilterExpressionConverter } from "./filter-expression-converter";

export abstract class FilterHelper {
  private static readonly TYPE_NEGATION_MAP = new Map<
    Filter.ExpressionType,
    Filter.ExpressionType
  >([
    [Filter.ExpressionType.AND, Filter.ExpressionType.OR],
    [Filter.ExpressionType.OR, Filter.ExpressionType.AND],
    [Filter.ExpressionType.EQ, Filter.ExpressionType.NE],
    [Filter.ExpressionType.NE, Filter.ExpressionType.EQ],
    [Filter.ExpressionType.GT, Filter.ExpressionType.LTE],
    [Filter.ExpressionType.GTE, Filter.ExpressionType.LT],
    [Filter.ExpressionType.LT, Filter.ExpressionType.GTE],
    [Filter.ExpressionType.LTE, Filter.ExpressionType.GT],
    [Filter.ExpressionType.IN, Filter.ExpressionType.NIN],
    [Filter.ExpressionType.NIN, Filter.ExpressionType.IN],
  ]);

  static negate(operand: Filter.Operand): Filter.Operand {
    if (operand instanceof Filter.Group) {
      let innerExpression = FilterHelper.negate(operand.content);
      if (innerExpression instanceof Filter.Group) {
        innerExpression = innerExpression.content;
      }
      return new Filter.Group(innerExpression as Filter.Expression);
    }

    if (!(operand instanceof Filter.Expression)) {
      throw new Error(
        `Can not negate operand of type: ${operand.constructor.name}`,
      );
    }

    switch (operand.type) {
      case Filter.ExpressionType.NOT:
        return FilterHelper.negate(operand.left);
      case Filter.ExpressionType.AND:
      case Filter.ExpressionType.OR:
        return new Filter.Expression(
          FilterHelper.negationType(operand.type),
          FilterHelper.negate(operand.left),
          FilterHelper.negate(operand.right as Filter.Operand),
        );
      case Filter.ExpressionType.EQ:
      case Filter.ExpressionType.NE:
      case Filter.ExpressionType.GT:
      case Filter.ExpressionType.GTE:
      case Filter.ExpressionType.LT:
      case Filter.ExpressionType.LTE:
      case Filter.ExpressionType.IN:
      case Filter.ExpressionType.NIN:
        return new Filter.Expression(
          FilterHelper.negationType(operand.type),
          operand.left,
          operand.right,
        );
      default:
        throw new Error(`Unknown expression type: ${operand.type}`);
    }
  }

  static expandIn(
    expression: Filter.Expression,
    context: string[],
    filterExpressionConverter: FilterExpressionConverter,
  ): void {
    assert(
      expression.type === Filter.ExpressionType.IN,
      `Expected IN expressions but was: ${expression.type}`,
    );
    FilterHelper.expandInNinExpressions(
      Filter.ExpressionType.OR,
      Filter.ExpressionType.EQ,
      expression,
      context,
      filterExpressionConverter,
    );
  }

  static expandNin(
    expression: Filter.Expression,
    context: string[],
    filterExpressionConverter: FilterExpressionConverter,
  ): void {
    assert(
      expression.type === Filter.ExpressionType.NIN,
      `Expected NIN expressions but was: ${expression.type}`,
    );
    FilterHelper.expandInNinExpressions(
      Filter.ExpressionType.AND,
      Filter.ExpressionType.NE,
      expression,
      context,
      filterExpressionConverter,
    );
  }

  private static negationType(
    type: Filter.ExpressionType,
  ): Filter.ExpressionType {
    const mapped = FilterHelper.TYPE_NEGATION_MAP.get(type);
    if (mapped == null) {
      throw new Error(`Unknown expression type: ${type}`);
    }
    return mapped;
  }

  private static expandInNinExpressions(
    outerExpressionType: Filter.ExpressionType,
    innerExpressionType: Filter.ExpressionType,
    expression: Filter.Expression,
    context: string[],
    expressionConverter: FilterExpressionConverter,
  ): void {
    if (!(expression.right instanceof Filter.Value)) {
      throw new Error(
        `Filter IN right expression should be of Filter.Value type but was ${expression.right?.constructor.name ?? "null"}`,
      );
    }

    const rightValue = expression.right.value;
    if (Array.isArray(rightValue)) {
      const expandedExpressions = rightValue.map(
        (value) =>
          new Filter.Expression(
            innerExpressionType,
            expression.left,
            new Filter.Value(value),
          ),
      );
      context.push(
        expressionConverter.convertExpression(
          FilterHelper.aggregate(outerExpressionType, expandedExpressions),
        ),
      );
      return;
    }

    context.push(
      expressionConverter.convertExpression(
        new Filter.Expression(
          innerExpressionType,
          expression.left,
          expression.right,
        ),
      ),
    );
  }

  private static aggregate(
    aggregateType: Filter.ExpressionType,
    expressions: Filter.Expression[],
  ): Filter.Expression {
    assert(expressions.length > 0, "expressions must not be empty");

    const [head, ...tail] = expressions;
    if (tail.length === 0) {
      return head;
    }

    return new Filter.Expression(
      aggregateType,
      head,
      FilterHelper.aggregate(aggregateType, tail),
    );
  }
}
