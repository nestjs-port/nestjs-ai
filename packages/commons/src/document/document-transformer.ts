import type { Document } from "./document";

export abstract class DocumentTransformer {
  abstract apply(documents: Document[]): Document[];

  transform(documents: Document[]): Document[] {
    return this.apply(documents);
  }
}
