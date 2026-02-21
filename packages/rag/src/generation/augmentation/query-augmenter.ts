import type { Document } from "@nestjs-ai/commons";
import type { Query } from "../../preretrieval";

export abstract class QueryAugmenter {
  abstract augment(query: Query, documents: Document[]): Query;

  apply(query: Query, documents: Document[]): Query {
    return this.augment(query, documents);
  }
}
