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

/**
 * Converts {@link Filter.Expression} into PgVector metadata filter expression format.
 * (https://www.postgresql.org/docs/current/functions-json.html)
 * <p>
 * The output is a complete SQL predicate ready for use in a WHERE clause (e.g.
 * {@code metadata::jsonb @@ '...'::jsonpath}). Single quotes are properly escaped, and
 * JSONPath member names are always wrapped in double quotes with {@code \} and {@code "}
 * JS-escaped.
 */
export class PgVectorFilterExpressionConverter extends AbstractFilterExpressionConverter {
  private static readonly DEFAULT_METADATA_COLUMN = "metadata";

  private readonly _metadataColumn: string;

  constructor(
    metadataColumn = PgVectorFilterExpressionConverter.DEFAULT_METADATA_COLUMN,
  ) {
    super();
    assert(metadataColumn.length > 0, "Metadata column name must not be empty");
    this._metadataColumn = metadataColumn;
  }

  override convertExpression(expression: Filter.Expression): string {
    const jsonPath = super.convertExpression(expression);
    return `${PgVectorFilterExpressionConverter.quoteIdentifier(
      this._metadataColumn,
    )}::jsonb @@ '${PgVectorFilterExpressionConverter.sqlEscape(jsonPath)}'::jsonpath`;
  }

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
        right.value == null ? "null" : right.value.constructor.name;
      throw new Error(`Expected a List, but got: ${typeName}`);
    }
    const values = right.value;
    for (let i = 0; i < values.length; i++) {
      this.convertOperandToContext(expression.left, context);
      context.value += " == ";
      this.doSingleValue(
        AbstractFilterExpressionConverter.normalizeDateString(values[i]),
        context,
      );
      if (i < values.length - 1) {
        context.value += " || ";
      }
    }
  }

  private static sqlEscape(value: string): string {
    return value.replace(/'/g, "''");
  }

  /**
   * Quote a SQL identifier using double quotes (PostgreSQL/SQL standard) only if
   * needed. Simple identifiers (alphanumeric starting with letter/underscore) are
   * returned unquoted to preserve PostgreSQL's case-insensitive behavior. Identifiers
   * containing special characters are quoted with internal double quotes escaped by
   * doubling.
   */
  private static quoteIdentifier(identifier: string): string {
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
      return identifier;
    }

    return `"${identifier.replace(/"/g, '""')}"`;
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
    const jsonKey = { value: "" };
    AbstractFilterExpressionConverter.emitJsonValue(filterKey.key, jsonKey);
    context.value += `$.${PgVectorFilterExpressionConverter.sqlEscape(
      jsonKey.value,
    )}`;
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

  /**
   * Serialize values for PostgreSQL JSONPath expressions with proper escaping.
   * <p>
   * Values are JSON-serialized, then single quotes are escaped for SQL embedding.
   * @param value the value to serialize
   * @param context the context to append the representation to
   */
  protected override doSingleValue(
    value: unknown,
    context: { value: string },
  ): void {
    const serialized = { value: "" };
    if (value instanceof Date) {
      AbstractFilterExpressionConverter.emitJsonValue(
        value.toISOString(),
        serialized,
      );
    } else {
      AbstractFilterExpressionConverter.emitJsonValue(value, serialized);
    }
    context.value += PgVectorFilterExpressionConverter.sqlEscape(
      serialized.value,
    );
  }
}
