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

/**
 * Converts {@link Filter.Expression} into MongoDB Atlas metadata filter expression
 * format.
 * (https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/#std-label-vectorSearch-agg-pipeline-filter)
 */
export class MongoDBAtlasFilterExpressionConverter extends AbstractFilterExpressionConverter {
  protected override doExpression(
    expression: Filter.Expression,
    context: { value: string },
  ): void {
    if (
      expression.type === Filter.ExpressionType.AND ||
      expression.type === Filter.ExpressionType.OR
    ) {
      this.doCompoundExpressionType(expression, context);
      return;
    }

    this.doSingleExpressionType(expression, context);
  }

  private doCompoundExpressionType(
    expression: Filter.Expression,
    context: { value: string },
  ): void {
    assert(
      expression.right != null,
      "expected expression.right to be non null",
    );
    context.value += "{";
    context.value += this.getOperationSymbol(expression);
    context.value += ":[";
    this.convertOperandToContext(expression.left, context);
    context.value += ",";
    this.convertOperandToContext(expression.right, context);
    context.value += "]}";
  }

  private doSingleExpressionType(
    expression: Filter.Expression,
    context: { value: string },
  ): void {
    assert(
      expression.right != null,
      "expected expression.right to be non null",
    );
    context.value += "{";
    this.convertOperandToContext(expression.left, context);
    context.value += ":{";
    context.value += this.getOperationSymbol(expression);
    context.value += ":";
    this.convertOperandToContext(expression.right, context);
    context.value += "}}";
  }

  private getOperationSymbol(expression: Filter.Expression): string {
    switch (expression.type) {
      case Filter.ExpressionType.AND:
        return "$and";
      case Filter.ExpressionType.OR:
        return "$or";
      case Filter.ExpressionType.EQ:
        return "$eq";
      case Filter.ExpressionType.NE:
        return "$ne";
      case Filter.ExpressionType.LT:
        return "$lt";
      case Filter.ExpressionType.LTE:
        return "$lte";
      case Filter.ExpressionType.GT:
        return "$gt";
      case Filter.ExpressionType.GTE:
        return "$gte";
      case Filter.ExpressionType.IN:
        return "$in";
      case Filter.ExpressionType.NIN:
        return "$nin";
      default:
        throw new Error(
          `Not supported expression type: ${String(expression.type)}`,
        );
    }
  }

  protected override doKey(
    filterKey: Filter.Key,
    context: { value: string },
  ): void {
    const identifier = this.hasOuterQuotes(filterKey.key)
      ? this.removeOuterQuotes(filterKey.key)
      : filterKey.key;
    context.value += `"metadata.${identifier}"`;
  }

  /**
   * Serialize values using JSON serialization for MongoDB Atlas filter expressions.
   * Delegates to {@link AbstractFilterExpressionConverter.emitJsonValue} for JSON
   * serialization.
   */
  protected override doSingleValue(
    value: unknown,
    context: { value: string },
  ): void {
    AbstractFilterExpressionConverter.emitJsonValue(value, context);
  }
}
