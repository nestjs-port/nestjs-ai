import type { DataSource } from "../api";
import type { BatchPreparedStatementSetter } from "./batch-prepared-statement-setter.interface";
import type { PreparedStatementCreator } from "./prepared-statement-creator.interface";
import type { ResultSetExtractor } from "./result-set-extractor.interface";
import type { RowMapper } from "./row-mapper.interface";

type JdbcRequiredType<T> =
  | StringConstructor
  | NumberConstructor
  | BooleanConstructor
  | BigIntConstructor
  | DateConstructor
  | (abstract new (
      ...args: never[]
    ) => T);

export interface JdbcTemplate {
  getDataSource(): DataSource | null;
  execute(sql: string): Promise<void>;
  update(sql: string, ...args: readonly unknown[]): Promise<number>;
  query<T>(
    sql: string,
    rowMapper: RowMapper<T>,
    ...args: readonly unknown[]
  ): Promise<T[]>;
  query<T>(
    preparedStatementCreator: PreparedStatementCreator,
    resultSetExtractor: ResultSetExtractor<T>,
  ): Promise<T>;
  queryForObject<T>(
    sql: string,
    requiredType: JdbcRequiredType<T>,
    ...args: readonly unknown[]
  ): Promise<T | null>;
  queryForObject<T>(
    sql: string,
    rowMapper: RowMapper<T>,
    ...args: readonly unknown[]
  ): Promise<T | null>;
  queryForList<T>(sql: string, elementType: JdbcRequiredType<T>): Promise<T[]>;
  queryForList(
    sql: string,
    ...args: readonly unknown[]
  ): Promise<Array<Record<string, unknown>>>;
  queryForMap(
    sql: string,
    ...args: readonly unknown[]
  ): Promise<Record<string, unknown>>;
  batchUpdate(
    sql: string,
    batchPreparedStatementSetter: BatchPreparedStatementSetter,
  ): Promise<number[]>;
  batchUpdate(
    sql: string,
    batchArgs: ReadonlyArray<ReadonlyArray<unknown>>,
    argTypes: readonly number[],
  ): Promise<number[]>;
}
