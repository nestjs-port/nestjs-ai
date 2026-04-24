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

import "reflect-metadata";

import { MessageType } from "@nestjs-ai/model";
import {
  JsdbcChatMemoryRepository,
  SQL_SERVER_CHAT_MEMORY_SCHEMA,
} from "@nestjs-ai/model-chat-memory-repository-jsdbc";
import { JsdbcTemplate } from "@nestjs-port/jsdbc";
import { TypeOrmDataSource } from "@nestjs-port/jsdbc/typeorm";
import {
  MSSQLServerContainer,
  type StartedMSSQLServerContainer,
} from "@testcontainers/mssqlserver";
import { DataSource } from "typeorm";
import { afterAll, beforeAll, describe, it } from "vitest";

import { AbstractJdbcChatMemoryRepositoryIT } from "./abstract-jdbc-chat-memory-repository.it-shared.js";

describe("JsdbcChatMemoryRepositorySqlServerIT", () => {
  let sqlServerContainer: StartedMSSQLServerContainer;
  let typeormDataSource: DataSource;
  let jsdbcDataSource: TypeOrmDataSource;
  let jsdbcTemplate: JsdbcTemplate;
  let integration: AbstractJdbcChatMemoryRepositoryIT;

  beforeAll(async () => {
    sqlServerContainer = await new MSSQLServerContainer(
      "mcr.microsoft.com/mssql/server:2022-latest",
    )
      .acceptLicense()
      .withPassword("Jsdbc!12345")
      .withEnvironment({ MSSQL_PID: "Developer" })
      .start();

    typeormDataSource = new DataSource({
      type: "mssql",
      host: sqlServerContainer.getHost(),
      port: sqlServerContainer.getPort(),
      username: sqlServerContainer.getUsername(),
      password: sqlServerContainer.getPassword(),
      database: sqlServerContainer.getDatabase(),
      synchronize: false,
      logging: false,
      options: {
        encrypt: false,
        trustServerCertificate: true,
      },
    });
    await typeormDataSource.initialize();

    jsdbcDataSource = new TypeOrmDataSource(typeormDataSource);
    jsdbcTemplate = new JsdbcTemplate(jsdbcDataSource);
    for (const fragment of SQL_SERVER_CHAT_MEMORY_SCHEMA) {
      await jsdbcTemplate.update(fragment);
    }

    const chatMemoryRepository = await JsdbcChatMemoryRepository.builder()
      .dataSource(jsdbcDataSource)
      .build();

    integration = new AbstractJdbcChatMemoryRepositoryIT(
      chatMemoryRepository,
      jsdbcTemplate,
    );
  }, 180_000);

  afterAll(async () => {
    await typeormDataSource?.destroy();
    await sqlServerContainer?.stop();
  }, 60_000);

  it.each([
    [
      "saves a single assistant message",
      "Message from assistant",
      MessageType.ASSISTANT,
    ],
    ["saves a single user message", "Message from user", MessageType.USER],
    [
      "saves a single system message",
      "Message from system",
      MessageType.SYSTEM,
    ],
  ])("%s", async (_title, content, messageType) => {
    await integration.saveMessagesSingleMessage(content, messageType);
  });

  it("saves multiple messages", async () => {
    await integration.saveMessagesMultipleMessages();
  });

  it("finds messages by conversation id", async () => {
    await integration.findMessagesByConversationId();
  });

  it("deletes messages by conversation id", async () => {
    await integration.deleteMessagesByConversationId();
  });

  it("preserves message order", async () => {
    await integration.testMessageOrder();
  });

  it("preserves message order for large batches", async () => {
    await integration.testMessageOrderWithLargeBatch();
  });
});
