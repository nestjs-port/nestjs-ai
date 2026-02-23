import type { Document } from "./document";

export interface DocumentReader {
  get(): Promise<Document[]>;

  read(): Promise<Document[]>;
}
