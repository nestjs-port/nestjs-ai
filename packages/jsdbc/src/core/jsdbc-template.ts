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

import { LoggerFactory } from "@nestjs-ai/commons";
import type { z } from "zod";
import { type DataSource, type SqlFragment, toSql } from "../api";
import type { RowMapper, RowMapperFunction } from "./row-mapper.interface";
import { SingleColumnRowMapper } from "./single-column-row-mapper";

export class JsdbcTemplate {
  private readonly logger = LoggerFactory.getLogger(JsdbcTemplate.name);

  constructor(private readonly dataSource: DataSource) {}

  async update(fragment: SqlFragment): Promise<number> {
    this.logger.debug(`Executing SQL update [${toSql(fragment)}]`);

    const connection = await this.dataSource.getConnection();

    try {
      const updatedRows = await connection.update(fragment);
      this.logger.trace("SQL update affected {} rows", updatedRows);
      return updatedRows;
    } finally {
      await connection.close();
    }
  }

  async queryForList<T>(
    fragment: SqlFragment,
    rowMapper: RowMapperFunction<T>,
  ): Promise<T[]>;

  async queryForList<T>(
    fragment: SqlFragment,
    rowMapper: RowMapper<T>,
  ): Promise<T[]>;

  async queryForList<TSchema extends z.ZodTypeAny>(
    fragment: SqlFragment,
    schema: TSchema,
  ): Promise<Array<z.output<TSchema>>>;

  async queryForList<T>(
    fragment: SqlFragment,
    rowMapperOrSchema: RowMapperFunction<T> | RowMapper<T> | z.ZodTypeAny,
  ): Promise<T[]> {
    this.logger.debug(`Executing SQL query [${toSql(fragment)}]`);

    const connection = await this.dataSource.getConnection();

    try {
      const rows = await connection.query(fragment);

      if (typeof rowMapperOrSchema === "function") {
        return rows.map((row, rowNum) => rowMapperOrSchema(row, rowNum)) as T[];
      }

      if (isRowMapperInstance(rowMapperOrSchema)) {
        return rows.map((row, rowNum) =>
          rowMapperOrSchema.mapRow(row, rowNum),
        ) as T[];
      }

      if (!isObjectSchema(rowMapperOrSchema)) {
        const rowMapper = new SingleColumnRowMapper(rowMapperOrSchema);
        return rows.map((row, rowNum) => rowMapper.mapRow(row, rowNum)) as T[];
      }

      return rows.map((row) =>
        this.mapWithSchema(rowMapperOrSchema, row),
      ) as T[];
    } finally {
      await connection.close();
    }
  }

  private mapWithSchema<T>(
    schema: z.ZodType<T>,
    row: Record<string, unknown>,
  ): T {
    return schema.parse(mapRowToSchemaShape(schema, row));
  }
}

function isObjectSchema(schema: z.ZodTypeAny): boolean {
  const schemaType = (
    schema as {
      _zod?: { def?: { type?: string } };
    }
  )._zod?.def?.type;

  return schemaType === "object";
}

function isRowMapperInstance<T>(
  value: RowMapper<T> | z.ZodTypeAny,
): value is RowMapper<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { mapRow?: unknown }).mapRow === "function"
  );
}

function mapRowToSchemaShape<T>(
  schema: z.ZodType<T>,
  row: Record<string, unknown>,
): Record<string, unknown> {
  const shape = (
    schema as {
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
      ([rowKey]) => normalizeKey(rowKey) === normalizeKey(key),
    );

    if (entry) {
      mappedRow[key] = entry[1];
    }
  }

  return mappedRow;
}

function normalizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}
