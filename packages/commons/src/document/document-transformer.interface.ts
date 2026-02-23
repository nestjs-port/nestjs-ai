import type { Document } from "./document";

export interface DocumentTransformer {
  apply(documents: Document[]): Document[];

  transform(documents: Document[]): Document[];
}
