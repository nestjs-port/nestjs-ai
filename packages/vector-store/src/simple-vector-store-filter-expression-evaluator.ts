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

import { Filter } from "./filter/index.js";

export class SimpleVectorStoreFilterExpressionEvaluator {
  evaluate(
    expression: Filter.Expression,
    metadata: Record<string, unknown>,
  ): boolean {
    return this.evaluateExpression(expression, metadata);
  }

  private evaluateOperand(
    operand: Filter.Operand,
    metadata: Record<string, unknown>,
  ): boolean {
    if (operand instanceof Filter.Group) {
      return this.evaluateOperand(operand.content, metadata);
    }

    if (operand instanceof Filter.Expression) {
      return this.evaluateExpression(operand, metadata);
    }

    throw new Error(
      `Unsupported operand type: ${(operand as object).constructor.name}`,
    );
  }

  private evaluateExpression(
    expression: Filter.Expression,
    metadata: Record<string, unknown>,
  ): boolean {
    switch (expression.type) {
      case Filter.ExpressionType.AND:
        return (
          this.evaluateOperand(this.left(expression), metadata) &&
          this.evaluateOperand(this.right(expression), metadata)
        );
      case Filter.ExpressionType.OR:
        return (
          this.evaluateOperand(this.left(expression), metadata) ||
          this.evaluateOperand(this.right(expression), metadata)
        );
      case Filter.ExpressionType.NOT:
        return !this.evaluateOperand(this.left(expression), metadata);
      case Filter.ExpressionType.EQ:
        return (
          this.compare(
            this.metadataValue(this.left(expression), metadata),
            this.filterValue(this.right(expression)),
          ) === 0
        );
      case Filter.ExpressionType.NE:
        return (
          this.compare(
            this.metadataValue(this.left(expression), metadata),
            this.filterValue(this.right(expression)),
          ) !== 0
        );
      case Filter.ExpressionType.GT:
        return (
          this.compare(
            this.metadataValue(this.left(expression), metadata),
            this.filterValue(this.right(expression)),
          ) > 0
        );
      case Filter.ExpressionType.GTE:
        return (
          this.compare(
            this.metadataValue(this.left(expression), metadata),
            this.filterValue(this.right(expression)),
          ) >= 0
        );
      case Filter.ExpressionType.LT:
        return (
          this.compare(
            this.metadataValue(this.left(expression), metadata),
            this.filterValue(this.right(expression)),
          ) < 0
        );
      case Filter.ExpressionType.LTE:
        return (
          this.compare(
            this.metadataValue(this.left(expression), metadata),
            this.filterValue(this.right(expression)),
          ) <= 0
        );
      case Filter.ExpressionType.IN: {
        const metaVal = this.metadataValue(this.left(expression), metadata);
        const list = this.asList(
          this.filterValue(this.right(expression)),
          expression,
        );
        return list.some((item) => this.compare(metaVal, item) === 0);
      }
      case Filter.ExpressionType.NIN: {
        const metaVal = this.metadataValue(this.left(expression), metadata);
        const list = this.asList(
          this.filterValue(this.right(expression)),
          expression,
        );
        return list.every((item) => this.compare(metaVal, item) !== 0);
      }
      case Filter.ExpressionType.ISNULL:
        return this.metadataValue(this.left(expression), metadata) == null;
      case Filter.ExpressionType.ISNOTNULL:
        return this.metadataValue(this.left(expression), metadata) != null;
      default:
        throw new Error(`Unsupported expression type: ${expression.type}`);
    }
  }

  private left(expression: Filter.Expression): Filter.Operand {
    if (expression.left == null) {
      throw new Error(
        `Expression of type ${expression.type} requires a left operand`,
      );
    }
    return expression.left;
  }

  private right(expression: Filter.Expression): Filter.Operand {
    if (expression.right == null) {
      throw new Error(
        `Expression of type ${expression.type} requires a right operand`,
      );
    }
    return expression.right;
  }

  private metadataValue(
    operand: Filter.Operand,
    metadata: Record<string, unknown>,
  ): unknown {
    if (!(operand instanceof Filter.Key)) {
      throw new Error(
        `Expected a Key operand but got: ${(operand as object).constructor.name}`,
      );
    }

    const key = this.stripOuterQuotes(operand.key);
    return Object.hasOwn(metadata, key) ? metadata[key] : null;
  }

  private filterValue(operand: Filter.Operand): unknown {
    if (!(operand instanceof Filter.Value)) {
      throw new Error(
        `Expected a Value operand but got: ${(operand as object).constructor.name}`,
      );
    }

    return this.normalizeFilterValue(operand.value);
  }

  private compare(metaVal: unknown, filterVal: unknown): number {
    if (metaVal == null && filterVal == null) {
      return 0;
    }
    if (metaVal == null) {
      return -1;
    }
    if (filterVal == null) {
      return 1;
    }

    if (typeof metaVal === "number" && typeof filterVal === "number") {
      return Math.sign(metaVal - filterVal);
    }

    if (
      (typeof metaVal === "number" && typeof filterVal === "bigint") ||
      (typeof metaVal === "bigint" && typeof filterVal === "number")
    ) {
      return Math.sign(Number(metaVal) - Number(filterVal));
    }

    if (metaVal instanceof Date && filterVal instanceof Date) {
      return Math.sign(metaVal.getTime() - filterVal.getTime());
    }

    if (Object.is(metaVal, filterVal)) {
      return 0;
    }

    if (typeof metaVal === "string" && typeof filterVal === "string") {
      return metaVal < filterVal ? -1 : 1;
    }

    if (typeof metaVal === "boolean" && typeof filterVal === "boolean") {
      return Number(metaVal) - Number(filterVal);
    }

    if (typeof metaVal === "bigint" && typeof filterVal === "bigint") {
      return metaVal < filterVal ? -1 : metaVal > filterVal ? 1 : 0;
    }

    throw new Error(
      `Cannot compare values of types ${this.valueType(metaVal)} and ${this.valueType(filterVal)}`,
    );
  }

  private asList(value: unknown, expression: Filter.Expression): unknown[] {
    if (!Array.isArray(value)) {
      throw new Error(
        `Expected a List value for ${expression.type} expression but got: ${String(value)}`,
      );
    }
    return value;
  }

  private stripOuterQuotes(value: string): string {
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      return value.slice(1, -1);
    }
    return value;
  }

  private formatDate(date: Date): string {
    return date.toISOString().replace(/\.\d{3}Z$/, "Z");
  }

  private normalizeFilterValue(value: unknown): unknown {
    if (value instanceof Date) {
      return this.formatDate(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.normalizeFilterValue(item));
    }

    return value;
  }

  private valueType(value: unknown): string {
    return value instanceof Date ? "Date" : typeof value;
  }
}
