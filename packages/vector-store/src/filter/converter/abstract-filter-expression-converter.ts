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

import { Filter } from "../filter.js";
import type { FilterExpressionConverter } from "../filter-expression-converter.js";
import { FilterHelper } from "../filter-helper.js";

export abstract class AbstractFilterExpressionConverter implements FilterExpressionConverter {
  convertExpression(expression: Filter.Expression): string {
    return this.convertOperand(expression);
  }

  protected convertOperand(operand: Filter.Operand): string {
    const context = { value: "" };
    this.convertOperandToContext(operand, context);
    return context.value;
  }

  protected convertOperandToContext(
    operand: Filter.Operand,
    context: { value: string },
  ): void {
    if (operand instanceof Filter.Group) {
      this.doGroup(operand, context);
      return;
    }

    if (operand instanceof Filter.Key) {
      this.doKey(operand, context);
      return;
    }

    if (operand instanceof Filter.Value) {
      this.doValue(operand, context);
      return;
    }

    if (operand instanceof Filter.Expression) {
      if (
        operand.type !== Filter.ExpressionType.NOT &&
        operand.type !== Filter.ExpressionType.AND &&
        operand.type !== Filter.ExpressionType.OR &&
        operand.type !== Filter.ExpressionType.ISNULL &&
        operand.type !== Filter.ExpressionType.ISNOTNULL &&
        !(operand.right instanceof Filter.Value)
      ) {
        throw new Error(
          "Non AND/OR/ISNULL/ISNOTNULL expression must have Value right argument!",
        );
      }

      if (operand.type === Filter.ExpressionType.NOT) {
        this.doNot(operand, context);
      } else {
        this.doExpression(operand, context);
      }
    }
  }

  protected doNot(
    expression: Filter.Expression,
    context: { value: string },
  ): void {
    this.convertOperandToContext(
      FilterHelper.negate(expression) as Filter.Operand,
      context,
    );
  }

  protected abstract doExpression(
    expression: Filter.Expression,
    context: { value: string },
  ): void;

  protected abstract doKey(
    filterKey: Filter.Key,
    context: { value: string },
  ): void;

  protected doValue(
    filterValue: Filter.Value,
    context: { value: string },
  ): void {
    if (Array.isArray(filterValue.value)) {
      const values = filterValue.value as unknown[];
      this.doStartValueRange(filterValue, context);
      values.forEach((value, index) => {
        this.doSingleValue(value, context);
        if (index < values.length - 1) {
          this.doAddValueRangeSpitter(filterValue, context);
        }
      });
      this.doEndValueRange(filterValue, context);
      return;
    }

    this.doSingleValue(filterValue.value, context);
  }

  protected doSingleValue(value: unknown, context: { value: string }): void {
    if (typeof value === "string") {
      context.value += `"${value}"`;
      return;
    }
    context.value += String(value);
  }

  protected doGroup(group: Filter.Group, context: { value: string }): void {
    this.doStartGroup(group, context);
    this.convertOperandToContext(group.content, context);
    this.doEndGroup(group, context);
  }

  protected doStartGroup(
    _group: Filter.Group,
    _context: { value: string },
  ): void {
    // no-op
  }

  protected doEndGroup(
    _group: Filter.Group,
    _context: { value: string },
  ): void {
    // no-op
  }

  protected doStartValueRange(
    _listValue: Filter.Value,
    context: { value: string },
  ): void {
    context.value += "[";
  }

  protected doEndValueRange(
    _listValue: Filter.Value,
    context: { value: string },
  ): void {
    context.value += "]";
  }

  protected doAddValueRangeSpitter(
    _listValue: Filter.Value,
    context: { value: string },
  ): void {
    context.value += ",";
  }

  protected hasOuterQuotes(value: string): boolean {
    const trimmed = value.trim();
    return (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    );
  }

  protected removeOuterQuotes(value: string): string {
    return value.slice(1, -1);
  }
}
