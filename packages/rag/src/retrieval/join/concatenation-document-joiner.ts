/*
 * Copyright 2023-present the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import assert from "node:assert/strict";
import type { Document } from "@nestjs-ai/commons";
import { type Logger, LoggerFactory } from "@nestjs-port/core";
import type { Query } from "../../query";
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
