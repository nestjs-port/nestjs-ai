export type PrismaSql = unknown;

export interface PrismaDialectInfo {
  _activeProvider?: string;
  _engineConfig?: { activeProvider?: string };
}

export interface PrismaRawClient {
  $queryRaw<T = unknown>(query: PrismaSql): Promise<T>;
  $executeRaw(query: PrismaSql): Promise<number>;
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
}

export interface PrismaClientLike extends PrismaRawClient, PrismaDialectInfo {
  $transaction<T>(
    callback: (prisma: PrismaRawClient) => Promise<T>,
    options?: { maxWait?: number; timeout?: number; isolationLevel?: string },
  ): Promise<T>;
}

export interface PrismaRuntime {
  raw(value: string): PrismaSql;
  join(values: readonly unknown[]): PrismaSql;
  sql(strings: TemplateStringsArray, ...values: readonly unknown[]): PrismaSql;
}
