import type { Connection } from "./connection.interface";

export interface DataSource {
  getConnection(): Promise<Connection>;
}
