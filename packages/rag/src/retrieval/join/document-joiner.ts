import type { Document } from "@nestjs-ai/commons";
import type { Query } from "../../preretrieval";

export abstract class DocumentJoiner {
  abstract join(documentsForQuery: Map<Query, Document[][]>): Document[];

  apply(documentsForQuery: Map<Query, Document[][]>): Document[] {
    return this.join(documentsForQuery);
  }
}
