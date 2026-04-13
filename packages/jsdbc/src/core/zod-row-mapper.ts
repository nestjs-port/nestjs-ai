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

  mapRow(row: Record<string, unknown>): T {
    return this.schema.parse(this.mapRowToSchemaShape(row));
  }

  private mapRowToSchemaShape(
    row: Record<string, unknown>,
  ): Record<string, unknown> {
    const shape = (
      this.schema as {
        _zod?: { def?: { shape?: Record<string, z.ZodTypeAny> } };
      }
    )._zod?.def?.shape;

    if (!shape) {
      return row;
    }

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

  private normalizeKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  }
}
