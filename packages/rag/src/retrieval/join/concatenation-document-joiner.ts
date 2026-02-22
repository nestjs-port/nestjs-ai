import assert from "node:assert/strict";
import type { Document } from "@nestjs-ai/commons";
import { type Logger, LoggerFactory } from "@nestjs-ai/commons";
import type { Query } from "../../preretrieval";
import { DocumentJoiner } from "./document-joiner";

/**
 * Combines documents retrieved based on multiple queries and from multiple data sources
 * by concatenating them into a single collection of documents. In case of duplicate
 * documents, the first occurrence is kept. The score of each document is kept as is. The
 * result is a list of unique documents sorted by their score in descending order.
 */
export class ConcatenationDocumentJoiner extends DocumentJoiner {
  private readonly logger: Logger = LoggerFactory.getLogger(
    ConcatenationDocumentJoiner.name,
  );

  override join(documentsForQuery: Map<Query, Document[][]>): Document[] {
    assert(documentsForQuery, "documentsForQuery cannot be null");
    for (const key of documentsForQuery.keys()) {
      assert(key != null, "documentsForQuery cannot contain null keys");
    }
    for (const value of documentsForQuery.values()) {
      assert(value != null, "documentsForQuery cannot contain null values");
    }

    this.logger.debug("Joining documents by concatenation");

    // Flatten all documents, deduplicate by id (keep first), sort by score desc
    const seen = new Map<string, Document>();

    for (const documentLists of documentsForQuery.values()) {
      for (const documents of documentLists) {
        for (const doc of documents) {
          if (!seen.has(doc.id)) {
            seen.set(doc.id, doc);
          }
        }
      }
    }

    return [...seen.values()].sort((a, b) => {
      const scoreA = a.score ?? 0.0;
      const scoreB = b.score ?? 0.0;
      return scoreB - scoreA;
    });
  }
}
