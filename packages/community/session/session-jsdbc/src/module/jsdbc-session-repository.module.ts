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

import { SESSION_REPOSITORY_TOKEN } from "@nestjs-ai/session";
import {
  type DynamicModule,
  type FactoryProvider,
  type InjectionToken,
  Module,
  type ModuleMetadata,
  type Provider,
} from "@nestjs/common";
import {
  DatabaseDialect,
  JSDBC_TEMPLATE,
  type JsdbcTemplate,
  type SqlFragment,
} from "@nestjs-port/jsdbc";
import { JsdbcSessionRepository } from "../jsdbc-session-repository.js";
import { MYSQL_SESSION_SCHEMA } from "../resources/mysql-session-repository-schema.js";
import { POSTGRESQL_SESSION_SCHEMA } from "../resources/postgresql-session-repository-schema.js";
import { SQLITE_SESSION_SCHEMA } from "../resources/sqlite-session-repository-schema.js";
import type { JsdbcSessionRepositoryProperties } from "./jsdbc-session-repository-properties.js";

export const JSDBC_SESSION_PROPERTIES_TOKEN = Symbol.for(
  "JSDBC_SESSION_PROPERTIES_TOKEN",
);

export interface JsdbcSessionRepositoryModuleAsyncOptions {
  imports?: ModuleMetadata["imports"];
  inject?: InjectionToken[];
  useFactory: (
    ...args: never[]
  ) =>
    | Promise<JsdbcSessionRepositoryProperties>
    | JsdbcSessionRepositoryProperties;
  global?: boolean;
}

/**
 * Provides a {@link JsdbcSessionRepository} under {@link SESSION_REPOSITORY_TOKEN}, backed
 * by the injected {@link JsdbcTemplate} (`JSDBC_TEMPLATE`). The SQL dialect is auto-detected
 * from the data source. With `initializeSchema: true` the matching DDL is run idempotently
 * at startup.
 *
 * Compose with `SessionModule` from `@nestjs-ai/session` to expose a `SessionService` over
 * the provided repository.
 */
@Module({})
export class JsdbcSessionRepositoryModule {
  static forFeature(
    properties: JsdbcSessionRepositoryProperties = {},
    options?: { imports?: ModuleMetadata["imports"]; global?: boolean },
  ): DynamicModule {
    return JsdbcSessionRepositoryModule.forFeatureAsync({
      imports: options?.imports,
      useFactory: () => properties,
      global: options?.global,
    });
  }

  static forFeatureAsync(
    options: JsdbcSessionRepositoryModuleAsyncOptions,
  ): DynamicModule {
    const providers = createProviders();

    return {
      module: JsdbcSessionRepositoryModule,
      imports: options.imports ?? [],
      providers: [
        {
          provide: JSDBC_SESSION_PROPERTIES_TOKEN,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        ...providers,
      ],
      exports: providers.map(
        (provider) => (provider as FactoryProvider).provide,
      ),
      global: options.global ?? false,
    };
  }
}

function createProviders(): Provider[] {
  return [
    {
      provide: SESSION_REPOSITORY_TOKEN,
      useFactory: async (
        properties: JsdbcSessionRepositoryProperties,
        template: JsdbcTemplate,
      ): Promise<JsdbcSessionRepository> => {
        if (properties.initializeSchema) {
          await initializeSchema(template);
        }

        return JsdbcSessionRepository.builder().jsdbcTemplate(template).build();
      },
      inject: [JSDBC_SESSION_PROPERTIES_TOKEN, JSDBC_TEMPLATE],
    },
  ];
}

async function initializeSchema(template: JsdbcTemplate): Promise<void> {
  const schema = getSchemaFragments(await template.dataSource.getDialect());

  for (const fragment of schema) {
    await template.update(fragment);
  }
}

function getSchemaFragments(dialect: DatabaseDialect): SqlFragment[] {
  switch (dialect) {
    case DatabaseDialect.MYSQL:
    case DatabaseDialect.MARIADB:
      return MYSQL_SESSION_SCHEMA;
    case DatabaseDialect.SQLITE:
      return SQLITE_SESSION_SCHEMA;
    default:
      return POSTGRESQL_SESSION_SCHEMA;
  }
}
