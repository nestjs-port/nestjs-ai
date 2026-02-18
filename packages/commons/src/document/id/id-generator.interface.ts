export interface IdGenerator {
  generateId(...contents: unknown[]): string;
}
