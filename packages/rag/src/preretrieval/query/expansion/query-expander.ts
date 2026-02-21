import type { Query } from "../query";

export abstract class QueryExpander {
  abstract expand(query: Query): Promise<Query[]>;

  apply(query: Query): Promise<Query[]> {
    return this.expand(query);
  }
}
