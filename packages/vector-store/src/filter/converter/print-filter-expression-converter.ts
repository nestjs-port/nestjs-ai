import type { Filter } from "../filter";
import { AbstractFilterExpressionConverter } from "./abstract-filter-expression-converter";

export class PrintFilterExpressionConverter extends AbstractFilterExpressionConverter {
  protected override doExpression(
    expression: Filter.Expression,
    context: { value: string },
  ): void {
    this.convertOperandToContext(expression.left, context);
    context.value += ` ${expression.type} `;
    if (expression.right != null) {
      this.convertOperandToContext(expression.right, context);
    } else {
      context.value += "null";
    }
  }

  protected override doKey(
    filterKey: Filter.Key,
    context: { value: string },
  ): void {
    context.value += filterKey.key;
  }

  protected override doStartGroup(
    _group: Filter.Group,
    context: { value: string },
  ): void {
    context.value += "(";
  }

  protected override doEndGroup(
    _group: Filter.Group,
    context: { value: string },
  ): void {
    context.value += ")";
  }
}
