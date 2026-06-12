/*
 * Copyright 2026-present the original author or authors.
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

export class ElasticsearchAiSearchFilterExpressionConverter extends AbstractFilterExpressionConverter {
  private readonly _dateFormat = new Intl.DateTimeFormat("en-CA", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  protected override doExpression(
    expression: Filter.Expression,
    context: { value: string },
  ): void {
    if (
      expression.type === Filter.ExpressionType.IN ||
      expression.type === Filter.ExpressionType.NIN
    ) {
      assert(expression.right != null, "expression.right() must not be null");
      context.value += this.getOperationSymbol(expression);
      this.convertOperandToContext(expression.left, context);
      context.value += "(";
      this.convertOperandToContext(expression.right, context);
      context.value += ")";
      return;
    }

    if (expression.type === Filter.ExpressionType.ISNULL) {
      context.value += "-";
      this.convertOperandToContext(expression.left, context);
      context.value += "*";
      return;
    }

    if (expression.type === Filter.ExpressionType.ISNOTNULL) {
      this.convertOperandToContext(expression.left, context);
      context.value += "*";
      return;
    }

    assert(expression.right != null, "expression.right() must not be null");
    this.convertOperandToContext(expression.left, context);
    context.value += this.getOperationSymbol(expression);
    this.convertOperandToContext(expression.right, context);
  }

  protected override doStartValueRange(
    _listValue: Filter.Value,
    _context: { value: string },
  ): void {}

  protected override doEndValueRange(
    _listValue: Filter.Value,
    _context: { value: string },
  ): void {}

  protected override doAddValueRangeSpitter(
    _listValue: Filter.Value,
    context: { value: string },
  ): void {
    context.value += " OR ";
  }

  protected override doKey(key: Filter.Key, context: { value: string }): void {
    const fieldPath = `metadata.${key.key.trim()}`;
    AbstractFilterExpressionConverter.emitLuceneString(fieldPath, context);
    context.value += ":";
  }

  protected override doValue(
    filterValue: Filter.Value,
    context: { value: string },
  ): void {
    if (Array.isArray(filterValue.value)) {
      const values = filterValue.value;
      values.forEach((value, index) => {
        this.doSingleValue(
          AbstractFilterExpressionConverter.normalizeDateString(value),
          context,
        );
        if (index < values.length - 1) {
          this.doAddValueRangeSpitter(filterValue, context);
        }
      });
      return;
    }

    this.doSingleValue(
      AbstractFilterExpressionConverter.normalizeDateString(filterValue.value),
      context,
    );
  }

  protected override doSingleValue(
    value: unknown,
    context: { value: string },
  ): void {
    if (value instanceof Date) {
      context.value += this.formatDate(value);
      return;
    }

    if (typeof value === "string") {
      context.value += '"';
      AbstractFilterExpressionConverter.emitLuceneString(value, context);
      context.value += '"';
      return;
    }

    context.value += String(value);
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

  private getOperationSymbol(expression: Filter.Expression): string {
    switch (expression.type) {
      case Filter.ExpressionType.AND:
        return " AND ";
      case Filter.ExpressionType.OR:
        return " OR ";
      case Filter.ExpressionType.EQ:
      case Filter.ExpressionType.IN:
        return "";
      case Filter.ExpressionType.NE:
        return " NOT ";
      case Filter.ExpressionType.LT:
        return "<";
      case Filter.ExpressionType.LTE:
        return "<=";
      case Filter.ExpressionType.GT:
        return ">";
      case Filter.ExpressionType.GTE:
        return ">=";
      case Filter.ExpressionType.NIN:
        return "NOT ";
      default:
        throw new Error(
          `Not supported expression type: ${String(expression.type)}`,
        );
    }
  }

  private formatDate(value: Date): string {
    const parts = this._dateFormat
      .formatToParts(value)
      .reduce<Record<string, string>>((accumulator, part) => {
        if (part.type !== "literal") {
          accumulator[part.type] = part.value;
        }
        return accumulator;
      }, {});

    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`;
  }
}
