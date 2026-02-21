import type { Document } from "@nestjs-ai/commons";
import type { Query } from "../../preretrieval";

export abstract class DocumentRetriever {
  abstract retrieve(query: Query): Document[];

  apply(query: Query): Document[] {
    return this.retrieve(query);
  }
}
