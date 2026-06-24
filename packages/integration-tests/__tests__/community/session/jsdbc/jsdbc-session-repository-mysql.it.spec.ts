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

import "reflect-metadata";

import {
  JsdbcSessionRepository,
  MYSQL_SESSION_SCHEMA,
  MysqlSessionRepositoryDialect,
} from "@nestjs-ai/session-jsdbc";
import { JsdbcTemplate } from "@nestjs-port/jsdbc";
import { TypeOrmDataSource } from "@nestjs-port/jsdbc/typeorm";
import {
  MySqlContainer,
  type StartedMySqlContainer,
} from "@testcontainers/mysql";
import { DataSource } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { AbstractJsdbcSessionRepositoryIT } from "./abstract-jsdbc-session-repository.it-shared.js";

/** A custom dialect subclass used to verify branch-filter SQL is sourced from the dialect. */
class CustomMysqlDialect extends MysqlSessionRepositoryDialect {
  override getBranchFilterFragment(branch: string) {
    return super.getBranchFilterFragment(branch); // delegates to the CONCAT() impl
  }
}

describe("JsdbcSessionRepositoryMysqlIT", () => {
  let mysqlContainer: StartedMySqlContainer;
  let typeormDataSource: DataSource;
  let integration: AbstractJsdbcSessionRepositoryIT;

  beforeAll(async () => {
    mysqlContainer = await new MySqlContainer("mysql:8.0.42")
      .withDatabase("session_integration")
      .withUsername("jsdbc")
      .withUserPassword("jsdbc")
      .withRootPassword("jsdbc")
      .start();

    typeormDataSource = new DataSource({
      type: "mysql",
      url: mysqlContainer.getConnectionUri(),
      synchronize: false,
      logging: false,
    });
    await typeormDataSource.initialize();

    const jsdbcDataSource = new TypeOrmDataSource(typeormDataSource);
    const jsdbcTemplate = new JsdbcTemplate(jsdbcDataSource);
    for (const fragment of MYSQL_SESSION_SCHEMA) {
      await jsdbcTemplate.update(fragment);
    }

    const repository = await JsdbcSessionRepository.builder()
      .dataSource(jsdbcDataSource)
      .build();
    const customDialectRepository = await JsdbcSessionRepository.builder()
      .dataSource(jsdbcDataSource)
      .dialect(new CustomMysqlDialect())
      .build();

    integration = new AbstractJsdbcSessionRepositoryIT(
      repository,
      jsdbcTemplate,
      customDialectRepository,
    );
  }, 120_000);

  afterAll(async () => {
    await typeormDataSource?.destroy();
    await mysqlContainer?.stop();
  }, 60_000);

  beforeEach(async () => {
    await integration.cleanUp();
  });

  it("save and find by id round trip", async () => {
    await integration.saveAndFindByIdRoundTrip();
  });

  it("save preserves expires at and metadata", async () => {
    await integration.savePreservesExpiresAtAndMetadata();
  });

  it("save upsert updates metadata but preserves event version", async () => {
    await integration.saveUpsertUpdatesMetadataButPreservesEventVersion();
  });

  it("find by id returns empty when not found", async () => {
    await integration.findByIdReturnsEmptyWhenNotFound();
  });

  it("find by user id returns all sessions for user", async () => {
    await integration.findByUserIdReturnsAllSessionsForUser();
  });

  it("delete removes session and cascades to events", async () => {
    await integration.deleteRemovesSessionAndCascadesToEvents();
  });

  it("find expired session ids returns only expired ones", async () => {
    await integration.findExpiredSessionIdsReturnsOnlyExpiredOnes();
  });

  it("append event throws when session not found", async () => {
    await integration.appendEventThrowsWhenSessionNotFound();
  });

  it("appended events are returned in chronological order", async () => {
    await integration.appendedEventsAreReturnedInChronologicalOrder();
  });

  it("find events last n returns only last n in chronological order", async () => {
    await integration.findEventsLastNReturnsOnlyLastN();
  });

  it("find events real only excludes synthetic", async () => {
    await integration.findEventsRealOnlyExcludesSynthetic();
  });

  it("find events filter by message type", async () => {
    await integration.findEventsFilterByMessageType();
  });

  it("find events keyword search", async () => {
    await integration.findEventsKeywordSearch();
  });

  it("find events filter by time range", async () => {
    await integration.findEventsFilterByTimeRange();
  });

  it("find events pagination", async () => {
    await integration.findEventsPagination();
  });

  it("find events returns empty list for non existent session", async () => {
    await integration.findEventsReturnsEmptyListForNonExistentSession();
  });

  it("assistant message with tool calls round trip", async () => {
    await integration.assistantMessageWithToolCallsRoundTrip();
  });

  it("tool response message round trip", async () => {
    await integration.toolResponseMessageRoundTrip();
  });

  it("get event version starts at zero and increments on append", async () => {
    await integration.getEventVersionStartsAtZeroAndIncrementsOnAppend();
  });

  it("compact events increments version", async () => {
    await integration.compactEventsIncrementsVersion();
  });

  it("compact events with correct version succeeds", async () => {
    await integration.compactEventsWithCorrectVersionSucceeds();
  });

  it("compact events with stale version fails", async () => {
    await integration.compactEventsWithStaleVersionFails();
  });

  it("compact events preserves previously archived events", async () => {
    await integration.compactEventsPreservesPreviouslyArchivedEvents();
  });

  it("find events with branch filter delegates to dialect", async () => {
    await integration.findEventsWithBranchFilterDelegatesToDialect();
  });

  it("find events with branch filter isolates peer agents", async () => {
    await integration.findEventsWithBranchFilterIsolatesPeerAgents();
  });
});
