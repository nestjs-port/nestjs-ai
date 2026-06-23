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

import {
  DefaultSessionService,
  SESSION_REPOSITORY_TOKEN,
  SESSION_SERVICE_TOKEN,
  type SessionRepository,
  type SessionService,
} from "@nestjs-ai/session";
import { Module } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import {
  DatabaseDialect,
  type JsdbcTemplate,
  JSDBC_TEMPLATE,
  type SqlFragment,
} from "@nestjs-port/jsdbc";
import { describe, expect, it } from "vitest";
import { JsdbcSessionRepository } from "../../jsdbc-session-repository.js";
import { POSTGRESQL_SESSION_SCHEMA } from "../../resources/postgresql-session-repository-schema.js";
import { JsdbcSessionRepositoryModule } from "../jsdbc-session-repository.module.js";

/** Builds a mock JsdbcTemplate that records executed update fragments. */
function createMockTemplate(updateCalls: SqlFragment[]): JsdbcTemplate {
  return {
    dataSource: {
      getDialect: () => Promise.resolve(DatabaseDialect.POSTGRESQL),
    },
    update: (fragment: SqlFragment) => {
      updateCalls.push(fragment);
      return Promise.resolve(0);
    },
  } as unknown as JsdbcTemplate;
}

/** Provides a mock JSDBC_TEMPLATE so the repository module can resolve it. */
function templateModule(template: JsdbcTemplate) {
  @Module({
    providers: [{ provide: JSDBC_TEMPLATE, useValue: template }],
    exports: [JSDBC_TEMPLATE],
  })
  class TemplateModule {}
  return TemplateModule;
}

describe("JsdbcSessionRepositoryModule", () => {
  it("provides a JsdbcSessionRepository under SESSION_REPOSITORY_TOKEN", async () => {
    const updateCalls: SqlFragment[] = [];
    const template = createMockTemplate(updateCalls);

    const moduleRef = await Test.createTestingModule({
      imports: [
        JsdbcSessionRepositoryModule.forFeature(
          {},
          { imports: [templateModule(template)] },
        ),
      ],
    }).compile();

    const repository = moduleRef.get<SessionRepository>(
      SESSION_REPOSITORY_TOKEN,
    );
    expect(repository).toBeInstanceOf(JsdbcSessionRepository);
    // No schema DDL runs when initializeSchema is omitted.
    expect(updateCalls).toHaveLength(0);
  });

  it("initializes the dialect schema when initializeSchema is true", async () => {
    const updateCalls: SqlFragment[] = [];
    const template = createMockTemplate(updateCalls);

    await Test.createTestingModule({
      imports: [
        JsdbcSessionRepositoryModule.forFeature(
          { initializeSchema: true },
          { imports: [templateModule(template)] },
        ),
      ],
    }).compile();

    expect(updateCalls).toHaveLength(POSTGRESQL_SESSION_SCHEMA.length);
  });

  it("supports forFeatureAsync with an injected properties factory", async () => {
    const updateCalls: SqlFragment[] = [];
    const template = createMockTemplate(updateCalls);

    const moduleRef = await Test.createTestingModule({
      imports: [
        JsdbcSessionRepositoryModule.forFeatureAsync({
          imports: [templateModule(template)],
          useFactory: () => ({ initializeSchema: false }),
        }),
      ],
    }).compile();

    expect(
      moduleRef.get<SessionRepository>(SESSION_REPOSITORY_TOKEN),
    ).toBeInstanceOf(JsdbcSessionRepository);
  });

  it("composes with a SessionService over the provided repository", async () => {
    const updateCalls: SqlFragment[] = [];
    const template = createMockTemplate(updateCalls);

    // An application module that turns the provided repository into a SessionService,
    // mirroring how SessionModule wires SESSION_SERVICE_TOKEN.
    @Module({
      imports: [
        JsdbcSessionRepositoryModule.forFeature(
          {},
          { imports: [templateModule(template)] },
        ),
      ],
      providers: [
        {
          provide: SESSION_SERVICE_TOKEN,
          useFactory: (repository: SessionRepository) =>
            new DefaultSessionService(repository),
          inject: [SESSION_REPOSITORY_TOKEN],
        },
      ],
    })
    class AppModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const service = moduleRef.get<SessionService>(SESSION_SERVICE_TOKEN);
    expect(service).toBeInstanceOf(DefaultSessionService);
  });
});
