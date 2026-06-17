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

export const MYSQL_SESSION_SCHEMA = [
  // language=SQL
  sql`
CREATE TABLE IF NOT EXISTS AI_SESSION (
    id            VARCHAR(255)  NOT NULL PRIMARY KEY,
    user_id       VARCHAR(255)  NOT NULL,
    created_at    DATETIME(6)   NOT NULL,
    expires_at    DATETIME(6),
    metadata      LONGTEXT,
    event_version BIGINT        NOT NULL DEFAULT 0
);
`,
  // language=SQL
  sql`
CREATE INDEX idx_ai_session_user_id
    ON AI_SESSION (user_id);
`,
  // language=SQL
  sql`
CREATE INDEX idx_ai_session_expires_at
    ON AI_SESSION (expires_at);
`,
  // language=SQL
  sql`
CREATE TABLE IF NOT EXISTS AI_SESSION_EVENT (
    id              VARCHAR(255)  NOT NULL PRIMARY KEY,
    session_id      VARCHAR(255)  NOT NULL,
    timestamp       DATETIME(6)   NOT NULL,
    message_type    VARCHAR(20)   NOT NULL,
    message_content LONGTEXT,
    message_data    LONGTEXT,
    synthetic       TINYINT(1)    NOT NULL DEFAULT 0,
    branch          VARCHAR(500),
    metadata        LONGTEXT,
    CONSTRAINT fk_ai_session_event_session
        FOREIGN KEY (session_id) REFERENCES AI_SESSION (id) ON DELETE CASCADE
);
`,
  // language=SQL
  sql`
CREATE INDEX idx_ai_session_event_session_ts
    ON AI_SESSION_EVENT (session_id, timestamp);
`,
];
