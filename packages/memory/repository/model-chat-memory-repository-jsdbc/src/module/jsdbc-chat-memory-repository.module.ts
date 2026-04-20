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

import type {
  DynamicModule,
  FactoryProvider,
  InjectionToken,
  ModuleMetadata,
  Provider,
} from "@nestjs/common";
import { Module } from "@nestjs/common";
import { CHAT_MEMORY_TOKEN } from "@nestjs-ai/commons";
import type { JsdbcTemplate } from "@nestjs-port/jsdbc";
import {
  DatabaseDialect,
  JSDBC_TEMPLATE,
  type SqlFragment,
} from "@nestjs-port/jsdbc";

import { JsdbcChatMemoryRepository } from "../jsdbc-chat-memory-repository";
import {
  MARIADB_CHAT_MEMORY_SCHEMA,
  MYSQL_CHAT_MEMORY_SCHEMA,
  ORACLE_CHAT_MEMORY_SCHEMA,
  POSTGRESQL_CHAT_MEMORY_SCHEMA,
  SQL_SERVER_CHAT_MEMORY_SCHEMA,
  SQLITE_CHAT_MEMORY_SCHEMA,
} from "../resources";
import type { JsdbcChatMemoryRepositoryProperties } from "./jsdbc-chat-memory-repository-properties";

export const JSDBC_CHAT_MEMORY_PROPERTIES_TOKEN = Symbol.for(
  "JSDBC_CHAT_MEMORY_PROPERTIES_TOKEN",
);

export interface JsdbcChatMemoryRepositoryModuleAsyncOptions {
  imports?: ModuleMetadata["imports"];
  inject?: InjectionToken[];
  useFactory: (
    ...args: never[]
  ) =>
    | Promise<JsdbcChatMemoryRepositoryProperties>
    | JsdbcChatMemoryRepositoryProperties;
  global?: boolean;
}

@Module({})
export class JsdbcChatMemoryRepositoryModule {
  static forFeature(
    properties: JsdbcChatMemoryRepositoryProperties = {},
    options?: { imports?: ModuleMetadata["imports"]; global?: boolean },
  ): DynamicModule {
    return JsdbcChatMemoryRepositoryModule.forFeatureAsync({
      imports: options?.imports,
      useFactory: () => properties,
      global: options?.global,
    });
  }

  static forFeatureAsync(
    options: JsdbcChatMemoryRepositoryModuleAsyncOptions,
  ): DynamicModule {
    const providers = createProviders();

    return {
      module: JsdbcChatMemoryRepositoryModule,
      imports: options.imports ?? [],
      providers: [
        {
          provide: JSDBC_CHAT_MEMORY_PROPERTIES_TOKEN,
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
      provide: CHAT_MEMORY_TOKEN,
      useFactory: async (
        properties: JsdbcChatMemoryRepositoryProperties,
        template: JsdbcTemplate,
      ): Promise<JsdbcChatMemoryRepository> => {
        if (properties.initializeSchema) {
          await initializeSchema(template);
        }

        return JsdbcChatMemoryRepository.builder()
          .jsdbcTemplate(template)
          .build();
      },
      inject: [JSDBC_CHAT_MEMORY_PROPERTIES_TOKEN, JSDBC_TEMPLATE],
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
    case DatabaseDialect.MARIADB:
      return MARIADB_CHAT_MEMORY_SCHEMA;
    case DatabaseDialect.MYSQL:
      return MYSQL_CHAT_MEMORY_SCHEMA;
    case DatabaseDialect.MICROSOFT_SQL_SERVER:
      return SQL_SERVER_CHAT_MEMORY_SCHEMA;
    case DatabaseDialect.ORACLE:
      return ORACLE_CHAT_MEMORY_SCHEMA;
    case DatabaseDialect.SQLITE:
      return SQLITE_CHAT_MEMORY_SCHEMA;
    case DatabaseDialect.POSTGRESQL:
    case DatabaseDialect.H2:
    case DatabaseDialect.HSQLDB:
      return POSTGRESQL_CHAT_MEMORY_SCHEMA;
  }
}
