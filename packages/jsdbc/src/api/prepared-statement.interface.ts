import type { SqlArray } from "./sql-array.interface";

export interface PreparedStatement {
  setString(parameterIndex: number, value: string): Promise<void>;
  setObject(parameterIndex: number, value: unknown): Promise<void>;
  setArray(parameterIndex: number, value: SqlArray): Promise<void>;
}
