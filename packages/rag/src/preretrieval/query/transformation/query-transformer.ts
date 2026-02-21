import type { Query } from "../query";

export abstract class QueryTransformer {
  abstract transform(query: Query): Promise<Query>;

  apply(query: Query): Promise<Query> {
    return this.transform(query);
  }
}
