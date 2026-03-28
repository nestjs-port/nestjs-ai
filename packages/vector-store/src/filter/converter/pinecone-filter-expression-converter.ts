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

import { Filter } from "../filter";
import { AbstractFilterExpressionConverter } from "./abstract-filter-expression-converter";

export class PineconeFilterExpressionConverter extends AbstractFilterExpressionConverter {
  protected override doExpression(
    expression: Filter.Expression,
    context: { value: string },
  ): void {
    assert(
      expression.right != null,
      "Codepath expects exp.right to be non-null",
    );

    context.value += "{";
    if (
      expression.type === Filter.ExpressionType.AND ||
      expression.type === Filter.ExpressionType.OR
    ) {
      context.value += this.getOperationSymbol(expression);
      context.value += "[";
      this.convertOperandToContext(expression.left, context);
      context.value += ",";
      this.convertOperandToContext(expression.right, context);
      context.value += "]";
    } else {
      this.convertOperandToContext(expression.left, context);
      context.value += "{";
      context.value += this.getOperationSymbol(expression);
      this.convertOperandToContext(expression.right, context);
      context.value += "}";
    }
    context.value += "}";
  }

  private getOperationSymbol(expression: Filter.Expression): string {
    return `"$${expression.type.toLowerCase()}": `;
  }

  protected override doKey(
    filterKey: Filter.Key,
    context: { value: string },
  ): void {
    const identifier = this.hasOuterQuotes(filterKey.key)
      ? this.removeOuterQuotes(filterKey.key)
      : filterKey.key;
    context.value += `"${identifier}": `;
  }
}
