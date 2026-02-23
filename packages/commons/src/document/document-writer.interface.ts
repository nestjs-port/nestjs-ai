import type { Document } from "./document";

export interface DocumentWriter {
  write(documents: Document[]): Promise<void>;
}
