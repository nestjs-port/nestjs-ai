import type { DatabaseMetaData } from "./database-metadata.interface";
import type { PreparedStatement } from "./prepared-statement.interface";
import type { SqlArray } from "./sql-array.interface";

export interface Connection {
  getMetaData(): Promise<DatabaseMetaData>;
  prepareStatement(sql: string): Promise<PreparedStatement>;
  createArrayOf(
    typeName: string,
    values: readonly unknown[],
  ): Promise<SqlArray>;

  close(): Promise<void>;
}
