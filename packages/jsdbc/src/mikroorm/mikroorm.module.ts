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

import { MikroORM } from "@mikro-orm/core";
import type {
  DynamicModule,
  InjectionToken,
  ModuleMetadata,
  Provider,
} from "@nestjs/common";
import { Module } from "@nestjs/common";

import { type DataSource, JSDBC_DATA_SOURCE, JSDBC_TEMPLATE } from "../api";
import { JsdbcTemplate } from "../core";
import { MikroOrmDataSource } from "./mikroorm-data-source";

export interface MikroOrmJsdbcModuleOptions {
  global?: boolean;
  imports?: ModuleMetadata["imports"];
  ormToken?: InjectionToken;
}

@Module({})
export class MikroOrmJsdbcModule {
  static forRoot(options: MikroOrmJsdbcModuleOptions = {}): DynamicModule {
    return {
      module: MikroOrmJsdbcModule,
      imports: options.imports ?? [],
      providers: createProviders(options.ormToken),
      exports: [JSDBC_DATA_SOURCE, JSDBC_TEMPLATE],
      global: options.global ?? false,
    };
  }
}

function createProviders(ormToken?: InjectionToken): Provider[] {
  return [createMikroOrmProvider(ormToken), createTemplateProvider()];
}

function createMikroOrmProvider(ormToken?: InjectionToken): Provider {
  return {
    provide: JSDBC_DATA_SOURCE,
    useFactory: (orm: MikroORM): DataSource => new MikroOrmDataSource(orm),
    inject: [ormToken ?? MikroORM],
  };
}

function createTemplateProvider(): Provider {
  return {
    provide: JSDBC_TEMPLATE,
    useFactory: (dataSource: DataSource) => new JsdbcTemplate(dataSource),
    inject: [JSDBC_DATA_SOURCE],
  };
}
