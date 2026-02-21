import type { Document } from "@nestjs-ai/commons";
import type { Query } from "../../preretrieval";

export abstract class DocumentPostProcessor {
  abstract process(query: Query, documents: Document[]): Document[];

  apply(query: Query, documents: Document[]): Document[] {
    return this.process(query, documents);
  }
}
