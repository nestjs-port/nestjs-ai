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
import { JsdbcChatMemoryRepositoryDialect } from "./jsdbc-chat-memory-repository-dialect";

/**
 * MySQL dialect for chat memory repository.
 */
export class MysqlChatMemoryRepositoryDialect extends JsdbcChatMemoryRepositoryDialect {
  getSelectMessagesSql(conversationId: string) {
    return sql`SELECT content, type FROM SPRING_AI_CHAT_MEMORY WHERE conversation_id = ${conversationId} ORDER BY \`timestamp\``;
  }

  getInsertMessageSql(
    conversationId: string,
    content: string | null,
    type: string,
    timestamp: Date,
  ) {
    return sql`INSERT INTO SPRING_AI_CHAT_MEMORY (conversation_id, content, type, \`timestamp\`) VALUES (${conversationId}, ${content}, ${type}, ${timestamp})`;
  }

  getSelectConversationIdsSql() {
    return sql`SELECT DISTINCT conversation_id FROM SPRING_AI_CHAT_MEMORY`;
  }

  getDeleteMessagesSql(conversationId: string) {
    return sql`DELETE FROM SPRING_AI_CHAT_MEMORY WHERE conversation_id = ${conversationId}`;
  }
}
