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
 * Converts {@link Filter.Expression} into MariaDB SQL WHERE clause format using JSON_VALUE
 * functions for metadata filtering.
 *
 * Generates SQL predicates that query JSON metadata fields using MariaDB's JSON
 * functions. For more information on MariaDB JSON functions, see:
 * <a href="https://mariadb.com/kb/en/json-functions/">MariaDB JSON Functions</a>
 */
export class MariaDBFilterExpressionConverter extends AbstractFilterExpressionConverter {
  private readonly _metadataFieldName: string;

  constructor(metadataFieldName: string) {
    super();
    this._metadataFieldName = metadataFieldName;
  }

  protected override doExpression(
    expression: Filter.Expression,
    context: { value: string },
  ): void {
    assert(
      expression.right != null,
      "expected expression.right to be non null",
    );
    context.value += this.convertOperand(expression.left);
    context.value += this.getOperationSymbol(expression);
    context.value += this.convertOperand(expression.right);
  }

  protected override doSingleValue(
    value: unknown,
    context: { value: string },
  ): void {
    if (value instanceof Date) {
      MariaDBFilterExpressionConverter.emitSqlString(
        MariaDBFilterExpressionConverter.formatDate(value),
        context,
      );
    } else if (typeof value === "string") {
      MariaDBFilterExpressionConverter.emitSqlString(value, context);
    } else {
      context.value += String(value);
    }
  }

  /**
   * Emit a SQL-formatted string value with single quote wrapping and escaping by
   * appending to the provided context. Used by MariaDB and MySQL for filter
   * expressions.
   *
   * This method prevents SQL injection attacks by properly escaping all special
   * characters and control sequences according to MariaDB/MySQL string literal rules.
   *
   * Escape sequences:
   * <ul>
   * <li>{@code '} → {@code ''} (SQL standard single quote doubling)</li>
   * <li>{@code \} → {@code \\} (backslash escaping)</li>
   * <li>{@code \b \f \n \r \t} → Escape sequences for control characters</li>
   * <li>Unicode control chars (U+0000 to U+001F) → {@code \\uXXXX} format</li>
   * </ul>
   * @param value the string value to format
   * @param context the context to append the SQL string literal to
   */
  protected static emitSqlString(
    value: string,
    context: { value: string },
  ): void {
    context.value += "'"; // Opening quote

    for (let index = 0; index < value.length; index++) {
      const character = value.charAt(index);

      switch (character) {
        case "'":
          // SQL standard: single quote → doubled
          context.value += "''";
          break;
        case "\\":
          // Backslash → escaped for MySQL/MariaDB
          context.value += "\\\\";
          break;
        case "\b":
          context.value += "\\b";
          break;
        case "\f":
          context.value += "\\f";
          break;
        case "\n":
          context.value += "\\n";
          break;
        case "\r":
          context.value += "\\r";
          break;
        case "\t":
          context.value += "\\t";
          break;
        default:
          // Escape Unicode control characters (U+0000 to U+001F)
          if (character.charCodeAt(0) < 0x20) {
            context.value += `\\u${character
              .charCodeAt(0)
              .toString(16)
              .padStart(4, "0")}`;
          } else {
            context.value += character;
          }
          break;
      }
    }

    context.value += "'"; // Closing quote
  }

  private getOperationSymbol(exp: Filter.Expression): string {
    switch (exp.type) {
      case Filter.ExpressionType.AND:
        return " AND ";
      case Filter.ExpressionType.OR:
        return " OR ";
      case Filter.ExpressionType.EQ:
        return " = ";
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
      case Filter.ExpressionType.IN:
        return " IN ";
      case Filter.ExpressionType.NOT:
      case Filter.ExpressionType.NIN:
        return " NOT IN ";
      // you never know what the future might bring
      default:
        throw new Error(`Not supported expression type: ${exp.type}`);
    }
  }

  protected override doKey(key: Filter.Key, context: { value: string }): void {
    // metadataFieldName could contain a malicious character and hence we treat it as
    // a MariaDB SQL identifier.
    context.value += "JSON_VALUE(";
    context.value += MariaDBFilterExpressionConverter.quoteIdentifier(
      this._metadataFieldName,
    );
    context.value += ", ";

    const jsonKey = { value: "" };
    AbstractFilterExpressionConverter.emitJsonValue(key.key, jsonKey);
    // Now, the whole JSONPath is emitted as a SQL string
    MariaDBFilterExpressionConverter.emitSqlString(
      `$.${jsonKey.value}`,
      context,
    );
    context.value += ")";
  }

  /**
   * Quote a SQL identifier using backticks (MySQL/MariaDB standard). Identifiers
   * containing backticks are escaped by doubling them.
   */
  private static quoteIdentifier(identifier: string): string {
    // Quote a SQL identifier using backticks (MySQL/MariaDB standard). Identifiers
    // containing backticks are escaped by doubling them.
    return `\`${identifier.replace(/`/g, "``")}\``;
  }

  protected override doStartValueRange(
    _listValue: Filter.Value,
    context: { value: string },
  ): void {
    context.value += "(";
  }

  protected override doEndValueRange(
    _listValue: Filter.Value,
    context: { value: string },
  ): void {
    context.value += ")";
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

  private static formatDate(date: Date): string {
    return date.toISOString();
  }
}
