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

import { sql } from "@nestjs-ai/jsdbc";

// language=SQL
export const ORACLE_CHAT_MEMORY_SCHEMA = sql`
CREATE TABLE SPRING_AI_CHAT_MEMORY (
    CONVERSATION_ID VARCHAR2(36 CHAR) NOT NULL,
    CONTENT CLOB NOT NULL,
    "TYPE" VARCHAR2(10 CHAR) NOT NULL CHECK ("TYPE" IN ('USER', 'ASSISTANT', 'SYSTEM', 'TOOL')),
    "TIMESTAMP" TIMESTAMP NOT NULL
);

CREATE INDEX SPRING_AI_CHAT_MEMORY_CONVERSATION_ID_TIMESTAMP_IDX ON SPRING_AI_CHAT_MEMORY(CONVERSATION_ID, "TIMESTAMP");
`;
