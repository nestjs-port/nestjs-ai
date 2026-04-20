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

export const MYSQL_CHAT_MEMORY_SCHEMA = [
  // language=SQL
  sql`
CREATE TABLE IF NOT EXISTS SPRING_AI_CHAT_MEMORY (
    \`conversation_id\` VARCHAR(36) NOT NULL,
    \`content\` TEXT NOT NULL,
    \`type\` ENUM('USER', 'ASSISTANT', 'SYSTEM', 'TOOL') NOT NULL,
    \`timestamp\` TIMESTAMP NOT NULL,

    INDEX \`SPRING_AI_CHAT_MEMORY_CONVERSATION_ID_TIMESTAMP_IDX\` (\`conversation_id\`, \`timestamp\`)
);
`,
];
