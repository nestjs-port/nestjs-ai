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

export class ZodRowMapper<T> implements RowMapper<T> {
  constructor(private readonly schema: z.ZodType<T>) {}

  mapRow(row: Record<string, unknown>, rowNum: number): T {
    const shape = this.getSchemaShape();
    if (shape) {
      return this.schema.parse(this.mapRowToSchemaShape(row, shape));
    }

    return this.schema.parse(this.mapSingleColumnRow(row, rowNum));
  }

  private mapRowToSchemaShape(
    row: Record<string, unknown>,
    shape: Record<string, z.ZodTypeAny>,
  ): Record<string, unknown> {
    const rowEntries = Object.entries(row);
    const mappedRow: Record<string, unknown> = {};

    for (const key of Object.keys(shape)) {
      const entry = rowEntries.find(
        ([rowKey]) => this.normalizeKey(rowKey) === this.normalizeKey(key),
      );

      if (entry) {
        mappedRow[key] = entry[1];
      }
    }

    return mappedRow;
  }

  private getSchemaShape(): Record<string, z.ZodTypeAny> | undefined {
    return (
      this.schema as {
        _zod?: { def?: { shape?: Record<string, z.ZodTypeAny> } };
      }
    )._zod?.def?.shape;
  }

  private normalizeKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  }

  private mapSingleColumnRow(
    row: Record<string, unknown>,
    rowNum: number,
  ): unknown {
    const columnCount = Object.keys(row).length;
    if (columnCount !== 1) {
      throw new Error(
        `Expected a single-column row at row number ${rowNum}, but received ${columnCount} columns.`,
      );
    }

    const value = Object.values(row)[0];

    if (value == null) {
      return value;
    }

    const parsed = this.schema.safeParse(value);
    if (parsed.success) {
      return parsed.data;
    }

    return this.schema.parse(this.convertValueToRequiredType(value));
  }

  private convertValueToRequiredType(value: unknown): unknown {
    const schemaType = (
      this.schema as {
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
      return typeof value === "bigint"
        ? value
        : BigInt(value as string | number);
    }

    if (schemaType === "date") {
      return value instanceof Date ? value : new Date(value as string | number);
    }

    return value;
  }
}
