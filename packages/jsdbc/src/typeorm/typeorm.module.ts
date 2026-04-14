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

import type { DynamicModule, ModuleMetadata, Provider } from "@nestjs/common";
import { Module } from "@nestjs/common";
import { getDataSourceToken } from "@nestjs/typeorm";
import type { DataSource as TypeOrmDataSource } from "typeorm";

import { type DataSource, JSDBC_DATA_SOURCE, JSDBC_TEMPLATE } from "../api";
import { JsdbcTemplate } from "../core";
import { TypeOrmDataSource as JsdbcTypeOrmDataSource } from "./typeorm-data-source";

export interface TypeOrmJsdbcModuleOptions {
  dataSourceName?: string;
  global?: boolean;
  imports?: ModuleMetadata["imports"];
}

@Module({})
export class TypeOrmJsdbcModule {
  static forRoot(options: TypeOrmJsdbcModuleOptions = {}): DynamicModule {
    return {
      module: TypeOrmJsdbcModule,
      imports: options.imports ?? [],
      providers: createProviders(options.dataSourceName),
      exports: [JSDBC_DATA_SOURCE, JSDBC_TEMPLATE],
      global: options.global ?? false,
    };
  }
}

function createProviders(dataSourceName?: string): Provider[] {
  return [createTypeOrmProvider(dataSourceName), createTemplateProvider()];
}

function createTypeOrmProvider(dataSourceName?: string): Provider {
  return {
    provide: JSDBC_DATA_SOURCE,
    useFactory: (typeormDataSource: TypeOrmDataSource): DataSource =>
      new JsdbcTypeOrmDataSource(typeormDataSource),
    inject: [getDataSourceToken(dataSourceName)],
  };
}

function createTemplateProvider(): Provider {
  return {
    provide: JSDBC_TEMPLATE,
    useFactory: (dataSource: DataSource) => new JsdbcTemplate(dataSource),
    inject: [JSDBC_DATA_SOURCE],
  };
}
