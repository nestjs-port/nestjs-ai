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

import type { z } from "zod";

import type { RowMapper } from "./row-mapper.interface";

export class SingleColumnRowMapper<T> implements RowMapper<T> {
  constructor(private readonly requiredType: z.ZodType<T>) {}

  mapRow(row: Record<string, unknown>, rowNum: number): T {
    const columnCount = Object.keys(row).length;

    if (columnCount !== 1) {
      throw new Error(
        `Expected a single-column row at row number ${rowNum}, but received ${columnCount} columns.`,
      );
    }

    const value = Object.values(row)[0];

    if (value == null) {
      return this.requiredType.parse(value);
    }

    const parsed = this.requiredType.safeParse(value);
    if (parsed.success) {
      return parsed.data;
    }

    return this.requiredType.parse(
      convertValueToRequiredType(value, this.requiredType),
    );
  }
}

function convertValueToRequiredType<T>(
  value: unknown,
  schema: z.ZodType<T>,
): unknown {
  const schemaType = (
    schema as {
      _zod?: { def?: { type?: string } };
    }
  )._zod?.def?.type;

  if (schemaType === "string") {
    return String(value);
  }

  if (schemaType === "number") {
    return typeof value === "number" ? value : Number(value);
  }

  if (schemaType === "boolean") {
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

  if (schemaType === "bigint") {
    return typeof value === "bigint" ? value : BigInt(value as string | number);
  }

  if (schemaType === "date") {
    return value instanceof Date ? value : new Date(value as string | number);
  }

  return value;
}
