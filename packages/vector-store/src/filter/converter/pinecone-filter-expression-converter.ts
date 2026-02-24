import assert from "node:assert/strict";

import { Filter } from "../filter";
import { AbstractFilterExpressionConverter } from "./abstract-filter-expression-converter";

export class PineconeFilterExpressionConverter extends AbstractFilterExpressionConverter {
  protected override doExpression(
    expression: Filter.Expression,
    context: { value: string },
  ): void {
    assert(
      expression.right != null,
      "Codepath expects exp.right to be non-null",
    );

    context.value += "{";
    if (
      expression.type === Filter.ExpressionType.AND ||
      expression.type === Filter.ExpressionType.OR
    ) {
      context.value += this.getOperationSymbol(expression);
      context.value += "[";
      this.convertOperandToContext(expression.left, context);
      context.value += ",";
      this.convertOperandToContext(expression.right, context);
      context.value += "]";
    } else {
      this.convertOperandToContext(expression.left, context);
      context.value += "{";
      context.value += this.getOperationSymbol(expression);
      this.convertOperandToContext(expression.right, context);
      context.value += "}";
    }
    context.value += "}";
  }

  private getOperationSymbol(expression: Filter.Expression): string {
    return `"$${expression.type.toLowerCase()}": `;
  }

  protected override doKey(
    filterKey: Filter.Key,
    context: { value: string },
  ): void {
    const identifier = this.hasOuterQuotes(filterKey.key)
      ? this.removeOuterQuotes(filterKey.key)
      : filterKey.key;
    context.value += `"${identifier}": `;
  }
}
