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

import type { RowMapper } from "./row-mapper.interface";

type SingleColumnType =
  | StringConstructor
  | NumberConstructor
  | BooleanConstructor
  | DateConstructor
  | BigIntConstructor;

type SingleColumnValue = string | number | boolean | Date | bigint | null;

export class SingleColumnRowMapper implements RowMapper<SingleColumnValue> {
  constructor(private readonly requiredType: SingleColumnType) {}

  mapRow(row: Record<string, unknown>, rowNum: number): SingleColumnValue {
    const columnCount = Object.keys(row).length;
    if (columnCount !== 1) {
      throw new Error(
        `Expected a single-column row at row number ${rowNum}, but received ${columnCount} columns.`,
      );
    }

    const value = Object.values(row)[0];
    if (value == null) {
      return null;
    }

    return this.convertValue(value);
  }

  private convertValue(value: unknown): SingleColumnValue {
    if (this.requiredType === String) {
      return String(value);
    }

    if (this.requiredType === Number) {
      return typeof value === "number" ? value : Number(value);
    }

    if (this.requiredType === Boolean) {
      if (typeof value === "boolean") {
        return value;
      }

      if (typeof value === "number") {
        return value !== 0;
      }

      if (typeof value === "string") {
        return value.toLowerCase() === "true" || value === "1";
      }
    }

    if (this.requiredType === Date) {
      return value instanceof Date ? value : new Date(value as string | number);
    }

    if (this.requiredType === BigInt) {
      return typeof value === "bigint"
        ? value
        : BigInt(value as string | number);
    }

    return value as SingleColumnValue;
  }
}
