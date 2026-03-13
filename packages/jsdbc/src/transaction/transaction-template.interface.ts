export interface TransactionTemplate<TSession> {
  execute<T>(callback: (session: TSession) => Promise<T>): Promise<T>;
}
