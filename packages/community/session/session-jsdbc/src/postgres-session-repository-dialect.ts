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

import { sql } from "@nestjs-port/jsdbc";
import { JsdbcSessionRepositoryDialect } from "./jsdbc-session-repository-dialect.js";

/**
 * {@link JsdbcSessionRepositoryDialect} for PostgreSQL.
 */
export class PostgresSessionRepositoryDialect extends JsdbcSessionRepositoryDialect {
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
ON CONFLICT (id) DO UPDATE
    SET user_id    = EXCLUDED.user_id,
        created_at = EXCLUDED.created_at,
        expires_at = EXCLUDED.expires_at,
        metadata   = EXCLUDED.metadata`;
  }

  getKeywordFilterFragment(pattern: string) {
    return sql`AND LOWER(COALESCE(e.message_content, '')) LIKE ${pattern}`;
  }
}
