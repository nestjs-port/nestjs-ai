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

import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  type Connection,
  DatabaseDialect,
  type DataSource,
  type SqlFragment,
  sql,
} from "../../api";
import { JsdbcTemplate } from "../jsdbc-template";
import type { RowMapper, RowMapperFunction } from "../row-mapper.interface";

describe("JsdbcTemplate", () => {
  describe("update", () => {
    it("executes an update statement and closes the connection", async () => {
      const close = vi.fn(async () => {});
      const update = vi.fn(async () => 3);
      const connection = createConnection({ query: vi.fn(), update, close });
      const dataSource = createDataSource(connection);
      const template = new JsdbcTemplate(dataSource);

      await expect(
        template.update(sql`update users set name = 'Ada'`),
      ).resolves.toBe(3);
      expect(update).toHaveBeenCalledTimes(1);
      expect(close).toHaveBeenCalledTimes(1);
    });

    it("closes the connection when update fails", async () => {
      const close = vi.fn(async () => {});
      const update = vi.fn(async () => {
        throw new Error("boom");
      });
      const connection = createConnection({ query: vi.fn(), update, close });
      const dataSource = createDataSource(connection);
      const template = new JsdbcTemplate(dataSource);

      await expect(
        template.update(sql`update users set name = 'Ada'`),
      ).rejects.toThrow("boom");
      expect(update).toHaveBeenCalledTimes(1);
      expect(close).toHaveBeenCalledTimes(1);
    });
  });

  describe("queryForList", () => {
    it("maps single-column rows using a scalar zod schema", async () => {
      const rows = [{ CONVERSATION_ID: "1" }];
      const close = vi.fn(async () => {});
      const query = vi.fn(async () => rows);
      const connection = createConnection({ query, close });
      const dataSource = createDataSource(connection);
      const template = new JsdbcTemplate(dataSource);

      await expect(
        template.queryForList(
          sql`select distinct conversation_id from chat`,
          z.number(),
        ),
      ).resolves.toEqual([1]);
      expect(query).toHaveBeenCalledTimes(1);
      expect(close).toHaveBeenCalledTimes(1);
    });

    it("maps rows using a zod schema", async () => {
      const rows = [{ CONVERSATION_ID: "1", DISPLAY_NAME: "Grace" }];
      const close = vi.fn(async () => {});
      const query = vi.fn(async () => rows);
      const connection = createConnection({ query, close });
      const dataSource = createDataSource(connection);
      const template = new JsdbcTemplate(dataSource);
      const schema = z.object({
        conversationId: z.coerce.number(),
        displayName: z.string(),
      });

      await expect(
        template.queryForList(sql`select * from users`, schema),
      ).resolves.toEqual([{ conversationId: 1, displayName: "Grace" }]);
      expect(query).toHaveBeenCalledTimes(1);
      expect(close).toHaveBeenCalledTimes(1);
    });

    it("maps nullable scalar rows without conversion", async () => {
      const rows = [{ value: null }];
      const close = vi.fn(async () => {});
      const query = vi.fn(async () => rows);
      const connection = createConnection({ query, close });
      const dataSource = createDataSource(connection);
      const template = new JsdbcTemplate(dataSource);

      await expect(
        template.queryForList(
          sql`select value from items`,
          z.number().nullable(),
        ),
      ).resolves.toEqual([null]);
      expect(query).toHaveBeenCalledTimes(1);
      expect(close).toHaveBeenCalledTimes(1);
    });

    it("maps rows using a row mapper function", async () => {
      const rows = [
        { id: 1, name: "Ada" },
        { id: 2, name: "Linus" },
      ];
      const close = vi.fn(async () => {});
      const query = vi.fn(async () => rows);
      const connection = createConnection({ query, close });
      const dataSource = createDataSource(connection);
      const template = new JsdbcTemplate(dataSource);
      const rowMapper: RowMapperFunction<{ id: number; name: string }> = (
        row,
        rowNum,
      ) => ({
        id: Number(row.id),
        name: `${rowNum}:${String(row.name)}`,
      });

      const result = await template.queryForList(
        sql`select * from users`,
        rowMapper,
      );

      expect(result).toEqual([
        { id: 1, name: "0:Ada" },
        { id: 2, name: "1:Linus" },
      ]);
      expect(query).toHaveBeenCalledTimes(1);
      expect(close).toHaveBeenCalledTimes(1);
    });

    it("maps rows using a row mapper instance", async () => {
      const rows = [
        { id: 1, name: "Ada" },
        { id: 2, name: "Linus" },
      ];
      const close = vi.fn(async () => {});
      const query = vi.fn(async () => rows);
      const connection = createConnection({ query, close });
      const dataSource = createDataSource(connection);
      const template = new JsdbcTemplate(dataSource);
      const rowMapper: RowMapper<{ id: number; name: string }> = {
        mapRow(row) {
          return {
            id: Number(row.id),
            name: String(row.name),
          };
        },
      };

      const result = await template.queryForList(
        sql`select * from users`,
        rowMapper,
      );

      expect(result).toEqual([
        { id: 1, name: "Ada" },
        { id: 2, name: "Linus" },
      ]);
      expect(query).toHaveBeenCalledTimes(1);
      expect(close).toHaveBeenCalledTimes(1);
    });

    it("closes the connection when a row mapper instance throws", async () => {
      const rows = [{ id: 1 }];
      const close = vi.fn(async () => {});
      const query = vi.fn(async () => rows);
      const connection = createConnection({ query, close });
      const dataSource = createDataSource(connection);
      const template = new JsdbcTemplate(dataSource);
      const rowMapper: RowMapper<{ id: number }> = {
        mapRow() {
          throw new Error("boom");
        },
      };

      await expect(
        template.queryForList(sql`select * from users`, rowMapper),
      ).rejects.toThrow("boom");
      expect(query).toHaveBeenCalledTimes(1);
      expect(close).toHaveBeenCalledTimes(1);
    });
  });
});

function createConnection(connection: {
  query: (fragment: SqlFragment) => Promise<Record<string, unknown>[]>;
  update?: (fragment: SqlFragment) => Promise<number>;
  close: () => Promise<void>;
}): Connection {
  return {
    query: connection.query,
    update: connection.update ?? vi.fn(async () => 0),
    close: connection.close,
  };
}

function createDataSource(connection: Connection): DataSource {
  const getConnection = vi.fn(async () => connection);
  const getDialect = vi.fn(async () => DatabaseDialect.POSTGRESQL);
  const transaction: DataSource["transaction"] = async <T>(
    callback: (connection: Connection) => Promise<T>,
  ) => callback(connection);

  return {
    getConnection,
    getDialect,
    transaction,
  };
}
