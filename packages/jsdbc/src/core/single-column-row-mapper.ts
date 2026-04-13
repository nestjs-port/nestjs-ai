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

type SingleColumnValue<T extends SingleColumnType> = T extends StringConstructor
  ? string
  : T extends NumberConstructor
    ? number
    : T extends BooleanConstructor
      ? boolean
      : T extends DateConstructor
        ? Date
        : T extends BigIntConstructor
          ? bigint
          : never;

export class SingleColumnRowMapper<
  T extends SingleColumnType = SingleColumnType,
> implements RowMapper<SingleColumnValue<T> | null>
{
  constructor(private readonly requiredType: T) {}

  mapRow(
    row: Record<string, unknown>,
    rowNum: number,
  ): SingleColumnValue<T> | null {
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

  private convertValue(value: unknown): SingleColumnValue<T> {
    if (this.requiredType === String) {
      return String(value) as SingleColumnValue<T>;
    }

    if (this.requiredType === Number) {
      return (
        typeof value === "number" ? value : Number(value)
      ) as SingleColumnValue<T>;
    }

    if (this.requiredType === Boolean) {
      if (typeof value === "boolean") {
        return value as SingleColumnValue<T>;
      }

      if (typeof value === "number") {
        return (value !== 0) as SingleColumnValue<T>;
      }

      if (typeof value === "string") {
        return (value.toLowerCase() === "true" ||
          value === "1") as SingleColumnValue<T>;
      }
    }

    if (this.requiredType === Date) {
      return (
        value instanceof Date ? value : new Date(value as string | number)
      ) as SingleColumnValue<T>;
    }

    if (this.requiredType === BigInt) {
      return (
        typeof value === "bigint" ? value : BigInt(value as string | number)
      ) as SingleColumnValue<T>;
    }

    return value as SingleColumnValue<T>;
  }
}
