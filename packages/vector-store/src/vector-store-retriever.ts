import type { Document } from "@nestjs-ai/commons";
import { SearchRequest } from "./search-request";

export abstract class VectorStoreRetriever {
  similaritySearch(query: string): Document[];
  similaritySearch(request: SearchRequest): Document[];
  similaritySearch(requestOrQuery: SearchRequest | string): Document[] {
    if (typeof requestOrQuery === "string") {
      return this.similaritySearchWithRequest(
        SearchRequest.builder().query(requestOrQuery).build(),
      );
    }
    return this.similaritySearchWithRequest(requestOrQuery);
  }

  protected abstract similaritySearchWithRequest(
    request: SearchRequest,
  ): Document[];
}
