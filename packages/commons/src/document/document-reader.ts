import type { Document } from "./document";

export abstract class DocumentReader {
  abstract get(): Promise<Document[]>;

  async read(): Promise<Document[]> {
    return this.get();
  }
}
