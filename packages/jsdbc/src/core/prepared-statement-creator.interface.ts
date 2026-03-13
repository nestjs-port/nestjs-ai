import type { Connection, PreparedStatement } from "../api";

export type PreparedStatementCreator = (
  connection: Connection,
) => Promise<PreparedStatement>;
