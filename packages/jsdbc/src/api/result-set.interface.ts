export interface ResultSet {
  next(): Promise<boolean>;
  getString(columnIndex: number): Promise<string | null>;
  getDouble(columnIndex: number): Promise<number>;
}
