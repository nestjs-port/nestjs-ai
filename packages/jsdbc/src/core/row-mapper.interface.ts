import type { ResultSet } from "../api";

export interface RowMapper<T> {
  mapRow(resultSet: ResultSet, rowNum: number): Promise<T>;
}
