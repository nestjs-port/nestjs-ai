import type { Document } from "@nestjs-ai/commons";
import { SearchRequest } from "./search-request";

export abstract class VectorStoreRetriever {
  similaritySearch(query: string): Promise<Document[]>;
  similaritySearch(request: SearchRequest): Promise<Document[]>;
  similaritySearch(
    requestOrQuery: SearchRequest | string,
  ): Promise<Document[]> {
    if (typeof requestOrQuery === "string") {
      return this.similaritySearchWithRequest(
        SearchRequest.builder().query(requestOrQuery).build(),
      );
    }
    return this.similaritySearchWithRequest(requestOrQuery);
  }

  protected abstract similaritySearchWithRequest(
    request: SearchRequest,
  ): Promise<Document[]>;
}
