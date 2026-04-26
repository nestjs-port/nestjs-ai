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

import type { Filter } from "../filter.js";
import { AbstractFilterExpressionConverter } from "./abstract-filter-expression-converter.js";

export class PrintFilterExpressionConverter extends AbstractFilterExpressionConverter {
  protected override doExpression(
    expression: Filter.Expression,
    context: { value: string },
  ): void {
    this.convertOperandToContext(expression.left, context);
    context.value += ` ${expression.type} `;
    if (expression.right != null) {
      this.convertOperandToContext(expression.right, context);
    } else {
      context.value += "null";
    }
  }

  protected override doKey(
    filterKey: Filter.Key,
    context: { value: string },
  ): void {
    context.value += filterKey.key;
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
    AbstractFilterExpressionConverter.emitJsonValue(value, context);
  }
}
