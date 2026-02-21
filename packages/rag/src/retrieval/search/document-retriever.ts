import type { Document } from "@nestjs-ai/commons";
import type { Query } from "../../preretrieval";

export abstract class DocumentRetriever {
  abstract retrieve(query: Query): Promise<Document[]>;

  apply(query: Query): Promise<Document[]> {
    return this.retrieve(query);
  }
}
