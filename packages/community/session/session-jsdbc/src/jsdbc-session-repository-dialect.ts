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

/**
 * Abstraction for database-specific SQL used by the JSDBC session repository.
 *
 * Each method returns a {@link SqlFragment} whose bound values are interpolated
 * through the `sql` tagged template (rendered as positional placeholders),
 * rather than raw `?` markers. Implementations only cover the SQL surface that
 * differs across databases (upsert syntax, boolean literals, keyword search,
 * branch concatenation). Generic queries shared by all dialects live directly
 * in the repository.
 */
export abstract class JsdbcSessionRepositoryDialect {
  /**
   * Upsert a row in `AI_SESSION`. Inserts a new row or updates an existing one.
   * The `event_version` column must not be modified on update — only the
   * session-metadata columns (`user_id`, `created_at`, `expires_at`,
   * `metadata`) are refreshed.
   */
  abstract getUpsertSessionSql(
    id: string,
    userId: string,
    createdAt: Date,
    expiresAt: Date | null,
    metadata: string | null,
  ): SqlFragment;

  /**
   * Case-insensitive substring filter appended to the dynamic `findEvents`
   * query when a keyword is set. The fragment is a complete `AND ...` clause;
   * the caller binds `pattern` as `'%' + keyword + '%'`.
   */
  abstract getKeywordFilterFragment(pattern: string): SqlFragment;

  /**
   * Branch visibility filter for multi-agent event isolation. Matches events
   * visible to the given branch: root events (null branch), exact branch match,
   * or ancestor branches (the caller is a descendant).
   *
   * The default uses `||` for string concatenation (PostgreSQL / SQLite).
   * MySQL/MariaDB must override this with `CONCAT()` because `||` is logical OR
   * in those databases.
   */
  getBranchFilterFragment(branch: string): SqlFragment {
    return sql`AND (e.branch IS NULL OR e.branch = ${branch} OR ${branch} LIKE e.branch || '.%') `;
  }
}
