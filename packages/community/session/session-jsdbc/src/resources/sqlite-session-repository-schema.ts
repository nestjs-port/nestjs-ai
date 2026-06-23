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

export const SQLITE_SESSION_SCHEMA = [
  // language=SQL
  sql`
CREATE TABLE IF NOT EXISTS AI_SESSION (
    id            TEXT     NOT NULL PRIMARY KEY,
    user_id       TEXT     NOT NULL,
    created_at    INTEGER  NOT NULL,
    expires_at    INTEGER,
    metadata      TEXT,
    event_version INTEGER  NOT NULL DEFAULT 0
);
`,
  // language=SQL
  sql`
CREATE INDEX IF NOT EXISTS idx_ai_session_user_id
    ON AI_SESSION (user_id);
`,
  // language=SQL
  sql`
CREATE INDEX IF NOT EXISTS idx_ai_session_expires_at
    ON AI_SESSION (expires_at);
`,
  // language=SQL
  sql`
CREATE TABLE IF NOT EXISTS AI_SESSION_EVENT (
    seq             INTEGER  PRIMARY KEY AUTOINCREMENT,
    id              TEXT     NOT NULL UNIQUE,
    session_id      TEXT     NOT NULL,
    timestamp       INTEGER  NOT NULL,
    message_type    TEXT     NOT NULL,
    message_content TEXT,
    message_data    TEXT,
    synthetic       INTEGER  NOT NULL DEFAULT 0,
    archived        INTEGER  NOT NULL DEFAULT 0,
    branch          TEXT,
    metadata        TEXT,
    CONSTRAINT fk_ai_session_event_session
        FOREIGN KEY (session_id) REFERENCES AI_SESSION (id) ON DELETE CASCADE
);
`,
  // language=SQL
  sql`
CREATE INDEX IF NOT EXISTS idx_ai_session_event_session_seq
    ON AI_SESSION_EVENT (session_id, seq);
`,
];
