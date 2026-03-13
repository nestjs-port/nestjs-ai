export interface DatabaseMetaData {
  getDatabaseProductName(): Promise<string>;
}
