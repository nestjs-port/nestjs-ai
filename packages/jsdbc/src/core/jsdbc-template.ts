import type { DataSource } from "../api";

export interface JsdbcTemplate {
  get dataSource(): DataSource | null;
  execute(sql: string): Promise<void>;
  update(sql: string, ...args: readonly unknown[]): Promise<number>;
}
