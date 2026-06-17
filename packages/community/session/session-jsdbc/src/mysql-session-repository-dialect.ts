/*
 * Copyright 2026-present the original author or authors.
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

import { type SqlFragment, sql } from "@nestjs-port/jsdbc";
import { JsdbcSessionRepositoryDialect } from "./jsdbc-session-repository-dialect.js";

/**
 * {@link JsdbcSessionRepositoryDialect} for MySQL and MariaDB.
 */
export class MysqlSessionRepositoryDialect extends JsdbcSessionRepositoryDialect {
  getUpsertSessionSql(
    id: string,
    userId: string,
    createdAt: Date,
    expiresAt: Date | null,
    metadata: string | null,
  ) {
    return sql`
INSERT INTO AI_SESSION (id, user_id, created_at, expires_at, metadata)
VALUES (${id}, ${userId}, ${createdAt}, ${expiresAt}, ${metadata})
ON DUPLICATE KEY UPDATE
    user_id    = VALUES(user_id),
    created_at = VALUES(created_at),
    expires_at = VALUES(expires_at),
    metadata   = VALUES(metadata)`;
  }

  getKeywordFilterFragment(pattern: string) {
    // MySQL LIKE is case-insensitive for most collations; LOWER() is still
    // applied for safety with binary collations.
    return sql`AND LOWER(COALESCE(e.message_content, '')) LIKE ${pattern}`;
  }

  override getBranchFilterFragment(branch: string): SqlFragment {
    // || is logical OR in MySQL/MariaDB; use CONCAT() for string concatenation.
    return sql`AND (e.branch IS NULL OR e.branch = ${branch} OR ${branch} LIKE CONCAT(e.branch, '.%')) `;
  }
}
