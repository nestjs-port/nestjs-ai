import type { PreparedStatement } from "../api";

export interface BatchPreparedStatementSetter {
  setValues(statement: PreparedStatement, index: number): Promise<void>;
  getBatchSize(): number;
}
