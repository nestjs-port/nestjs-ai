import type { Query } from "../query";

export abstract class QueryExpander {
  abstract expand(query: Query): Query[];

  apply(query: Query): Query[] {
    return this.expand(query);
  }
}
