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

import assert from "node:assert/strict";
import {
  AbstractFilterExpressionConverter,
  Filter,
} from "@nestjs-ai/vector-store";

export class PgVectorFilterExpressionConverter extends AbstractFilterExpressionConverter {
  private static readonly ISO_DATE_PATTERN =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/;

  protected override doExpression(
    expression: Filter.Expression,
    context: { value: string },
  ): void {
    assert(expression.right != null, "expression should have a right operand");
    if (expression.type === Filter.ExpressionType.IN) {
      this.handleIn(expression, context);
    } else if (expression.type === Filter.ExpressionType.NIN) {
      this.handleNotIn(expression, context);
    } else {
      this.convertOperandToContext(expression.left, context);
      context.value += this.getOperationSymbol(expression);
      this.convertOperandToContext(expression.right, context);
    }
  }

  private handleIn(
    expression: Filter.Expression,
    context: { value: string },
  ): void {
    context.value += "(";
    this.convertToConditions(expression, context);
    context.value += ")";
  }

  private handleNotIn(
    expression: Filter.Expression,
    context: { value: string },
  ): void {
    context.value += "!(";
    this.convertToConditions(expression, context);
    context.value += ")";
  }

  private convertToConditions(
    expression: Filter.Expression,
    context: { value: string },
  ): void {
    assert(expression.right != null, "expression should have a right operand");
    assert(
      expression.right instanceof Filter.Value,
      "right operand must be a Filter.Value",
    );
    const right = expression.right;
    if (!Array.isArray(right.value)) {
      const typeName =
        right.value == null ? "null" : (right.value as object).constructor.name;
      throw new Error(`Expected a List, but got: ${typeName}`);
    }
    const values = right.value;
    for (let i = 0; i < values.length; i++) {
      this.convertOperandToContext(expression.left, context);
      context.value += " == ";
      this.doSingleValue(this.normalizeDateString(values[i]), context);
      if (i < values.length - 1) {
        context.value += " || ";
      }
    }
  }

  private getOperationSymbol(expression: Filter.Expression): string {
    switch (expression.type) {
      case Filter.ExpressionType.AND:
        return " && ";
      case Filter.ExpressionType.OR:
        return " || ";
      case Filter.ExpressionType.EQ:
        return " == ";
      case Filter.ExpressionType.NE:
        return " != ";
      case Filter.ExpressionType.LT:
        return " < ";
      case Filter.ExpressionType.LTE:
        return " <= ";
      case Filter.ExpressionType.GT:
        return " > ";
      case Filter.ExpressionType.GTE:
        return " >= ";
      default:
        throw new Error(`Not supported expression type: ${expression.type}`);
    }
  }

  protected override doKey(
    filterKey: Filter.Key,
    context: { value: string },
  ): void {
    context.value += `$.${filterKey.key}`;
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

  protected override doSingleValue(
    value: unknown,
    context: { value: string },
  ): void {
    if (value instanceof Date) {
      this.emitJsonValue(value.toISOString(), context);
    } else {
      this.emitJsonValue(value, context);
    }
  }

  private emitJsonValue(value: unknown, context: { value: string }): void {
    context.value += JSON.stringify(value);
  }

  private normalizeDateString(value: unknown): unknown {
    if (
      typeof value !== "string" ||
      !PgVectorFilterExpressionConverter.ISO_DATE_PATTERN.test(value)
    ) {
      return value;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`Invalid date type: ${value}`);
    }
    return parsed;
  }
}
