import { Filter } from "../filter";
import { AbstractFilterExpressionConverter } from "./abstract-filter-expression-converter";

const DATE_FORMAT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

export class SimpleVectorStoreFilterExpressionConverter extends AbstractFilterExpressionConverter {
  protected doExpression(
    expression: Filter.Expression,
    context: { value: string },
  ): void {
    this.convertOperandToContext(expression.left, context);
    context.value += this.getOperationSymbol(expression);
    if (expression.right != null) {
      this.convertOperandToContext(expression.right, context);
    } else {
      context.value += "null";
    }
  }

  private getOperationSymbol(expression: Filter.Expression): string {
    switch (expression.type) {
      case Filter.ExpressionType.AND:
        return " and ";
      case Filter.ExpressionType.OR:
        return " or ";
      case Filter.ExpressionType.EQ:
        return " == ";
      case Filter.ExpressionType.LT:
        return " < ";
      case Filter.ExpressionType.LTE:
        return " <= ";
      case Filter.ExpressionType.GT:
        return " > ";
      case Filter.ExpressionType.GTE:
        return " >= ";
      case Filter.ExpressionType.NE:
        return " != ";
      case Filter.ExpressionType.IN:
        return " in ";
      case Filter.ExpressionType.NIN:
        return " not in ";
      default:
        throw new Error(`Not supported expression type: ${expression.type}`);
    }
  }

  protected doKey(filterKey: Filter.Key, context: { value: string }): void {
    const identifier = this.hasOuterQuotes(filterKey.key)
      ? this.removeOuterQuotes(filterKey.key)
      : filterKey.key;
    context.value += `#metadata['${identifier}']`;
  }

  protected doValue(
    filterValue: Filter.Value,
    context: { value: string },
  ): void {
    if (Array.isArray(filterValue.value)) {
      const values = filterValue.value as unknown[];
      const formattedList = { value: "{" };
      values.forEach((value, index) => {
        this.doSingleValue(value, formattedList);
        if (index < values.length - 1) {
          this.doAddValueRangeSpitter(filterValue, formattedList);
        }
      });
      formattedList.value += "}";

      if (context.value.lastIndexOf("in ") === -1) {
        context.value += formattedList.value;
      } else {
        this.appendSpELContains(formattedList.value, context);
      }
      return;
    }

    this.doSingleValue(filterValue.value, context);
  }

  private appendSpELContains(
    formattedList: string,
    context: { value: string },
  ): void {
    const metadataStart = context.value.lastIndexOf("#metadata");
    if (metadataStart === -1) {
      throw new Error(`Wrong SpEL expression: ${context.value}`);
    }
    const metadataEnd = context.value.indexOf(" ", metadataStart);
    if (metadataEnd === -1) {
      throw new Error(`Wrong SpEL expression: ${context.value}`);
    }

    const metadata = context.value.slice(metadataStart, metadataEnd);
    const inPosition = context.value.lastIndexOf("in ");
    context.value =
      context.value.slice(0, metadataStart) +
      context.value.slice(metadataEnd + 1, inPosition);
    context.value += `${formattedList}.contains(${metadata})`;
  }

  protected doSingleValue(value: unknown, context: { value: string }): void {
    if (value instanceof Date) {
      context.value += `'${this.formatDate(value)}'`;
      return;
    }

    if (typeof value === "string") {
      if (DATE_FORMAT_PATTERN.test(value)) {
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
          throw new Error(`Invalid date type:${value}`);
        }
        context.value += `'${this.formatDate(parsed)}'`;
        return;
      }
      context.value += `'${value}'`;
      return;
    }

    context.value += String(value);
  }

  protected doGroup(group: Filter.Group, context: { value: string }): void {
    context.value += "(";
    super.doGroup(group, context);
    context.value += ")";
  }

  private formatDate(date: Date): string {
    return date.toISOString().replace(/\.\d{3}Z$/, "Z");
  }
}
