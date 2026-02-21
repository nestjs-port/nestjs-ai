import type { Query } from "../query";

export abstract class QueryTransformer {
  abstract transform(query: Query): Query;

  apply(query: Query): Query {
    return this.transform(query);
  }
}
