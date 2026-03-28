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

import {
  RedisMetadataField,
  RedisMetadataFieldType,
} from "./redis-metadata-field";

class Numeric {
  constructor(
    readonly lower: NumericBoundary,
    readonly upper: NumericBoundary,
  ) {}
}

class NumericBoundary {
  static readonly POSITIVE_INFINITY = new NumericBoundary(
    Number.POSITIVE_INFINITY,
    true,
  );
  static readonly NEGATIVE_INFINITY = new NumericBoundary(
    Number.NEGATIVE_INFINITY,
    true,
  );

  private static readonly INFINITY = "inf";
  private static readonly MINUS_INFINITY = "-inf";

  constructor(
    readonly value: unknown,
    readonly exclusive: boolean,
  ) {}

  [Symbol.toPrimitive](): string {
    if (this === NumericBoundary.NEGATIVE_INFINITY) {
      return NumericBoundary.MINUS_INFINITY;
    }
    if (this === NumericBoundary.POSITIVE_INFINITY) {
      return NumericBoundary.INFINITY;
    }
    if (this.exclusive) {
      return `(${String(this.value)}`;
    }
    return String(this.value);
  }
}

export class RedisFilterExpressionConverter extends AbstractFilterExpressionConverter {
  private readonly _metadataFields = new Map<string, RedisMetadataField>();

  constructor(metadataFields: RedisMetadataField[]) {
    super();
    metadataFields.forEach((metadataField) => {
      this._metadataFields.set(metadataField.name, metadataField);
    });
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

  protected override doKey(
    filterKey: Filter.Key,
    context: { value: string },
  ): void {
    context.value += `@${filterKey.key}:`;
  }

  protected override doExpression(
    expression: Filter.Expression,
    context: { value: string },
  ): void {
    switch (expression.type) {
      case Filter.ExpressionType.NIN:
        this.doExpression(
          this.negate(Filter.ExpressionType.IN, expression),
          context,
        );
        break;
      case Filter.ExpressionType.NE:
        this.doExpression(
          this.negate(Filter.ExpressionType.EQ, expression),
          context,
        );
        break;
      case Filter.ExpressionType.AND:
        this.doBinaryOperation(" ", expression, context);
        break;
      case Filter.ExpressionType.OR:
        this.doBinaryOperation(" | ", expression, context);
        break;
      case Filter.ExpressionType.NOT:
        context.value += "-";
        this.convertOperandToContext(expression.left, context);
        break;
      default:
        this.doField(expression, context);
        break;
    }
  }

  private negate(
    expressionType: Filter.ExpressionType,
    expression: Filter.Expression,
  ): Filter.Expression {
    return new Filter.Expression(
      Filter.ExpressionType.NOT,
      new Filter.Expression(expressionType, expression.left, expression.right),
      null,
    );
  }

  private doBinaryOperation(
    delimiter: string,
    expression: Filter.Expression,
    context: { value: string },
  ): void {
    assert(
      expression.right != null,
      "Expected expression.right to be non-null",
    );
    this.convertOperandToContext(expression.left, context);
    context.value += delimiter;
    this.convertOperandToContext(expression.right, context);
  }

  private doField(
    expression: Filter.Expression,
    context: { value: string },
  ): void {
    assert(
      expression.left instanceof Filter.Key,
      "Expected expression.left to be Filter.Key",
    );
    const key = expression.left;
    this.doKey(key, context);

    const field =
      this._metadataFields.get(key.key) ?? RedisMetadataField.tag(key.key);

    assert(
      expression.right instanceof Filter.Value,
      "Expected expression.right to be Filter.Value",
    );
    const value = expression.right;

    switch (field.fieldType) {
      case RedisMetadataFieldType.NUMERIC: {
        const numeric = this.numeric(expression, value);
        context.value += `[${numeric.lower} ${numeric.upper}]`;
        break;
      }
      case RedisMetadataFieldType.TAG:
        context.value += `{${String(this.stringValue(expression, value))}}`;
        break;
      case RedisMetadataFieldType.TEXT:
        context.value += `(${String(this.stringValue(expression, value))})`;
        break;
      default:
        throw new Error(`Field type ${field.fieldType} not supported`);
    }
  }

  private stringValue(
    expression: Filter.Expression,
    value: Filter.Value,
  ): unknown {
    const delimiter = this.tagValueDelimiter(expression);
    if (Array.isArray(value.value)) {
      return value.value.map((listItem) => String(listItem)).join(delimiter);
    }
    return value.value;
  }

  private tagValueDelimiter(expression: Filter.Expression): string {
    switch (expression.type) {
      case Filter.ExpressionType.IN:
        return " | ";
      case Filter.ExpressionType.EQ:
        return " ";
      default:
        throw new Error(`Tag operand ${expression.type} not supported`);
    }
  }

  private numeric(expression: Filter.Expression, value: Filter.Value): Numeric {
    switch (expression.type) {
      case Filter.ExpressionType.EQ:
        return new Numeric(this.inclusive(value), this.inclusive(value));
      case Filter.ExpressionType.GT:
        return new Numeric(
          this.exclusive(value),
          NumericBoundary.POSITIVE_INFINITY,
        );
      case Filter.ExpressionType.GTE:
        return new Numeric(
          this.inclusive(value),
          NumericBoundary.POSITIVE_INFINITY,
        );
      case Filter.ExpressionType.LT:
        return new Numeric(
          NumericBoundary.NEGATIVE_INFINITY,
          this.exclusive(value),
        );
      case Filter.ExpressionType.LTE:
        return new Numeric(
          NumericBoundary.NEGATIVE_INFINITY,
          this.inclusive(value),
        );
      default:
        throw new Error(
          `Expression type ${expression.type} not supported for numeric fields`,
        );
    }
  }

  private inclusive(value: Filter.Value): NumericBoundary {
    return new NumericBoundary(value.value, false);
  }

  private exclusive(value: Filter.Value): NumericBoundary {
    return new NumericBoundary(value.value, true);
  }
}
