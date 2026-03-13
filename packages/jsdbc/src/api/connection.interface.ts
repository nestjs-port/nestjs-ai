import type { DatabaseMetaData } from "./database-metadata.interface";

export interface Connection {
  getMetaData(): Promise<DatabaseMetaData>;

  close(): Promise<void>;
}
