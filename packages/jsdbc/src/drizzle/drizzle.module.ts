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
  InjectionToken,
  ModuleMetadata,
  Provider,
} from "@nestjs/common";
import { Module } from "@nestjs/common";

import { type DataSource, JSDBC_DATA_SOURCE, JSDBC_TEMPLATE } from "../api";
import { JsdbcTemplate } from "../core";
import type { DrizzleDatabase } from "./drizzle";
import {
  DrizzleDataSource,
  type DrizzleJsdbcOptions,
} from "./drizzle-data-source";

export interface DrizzleJsdbcModuleOptions extends DrizzleJsdbcOptions {
  dbToken: InjectionToken;
  global?: boolean;
  imports?: ModuleMetadata["imports"];
}

@Module({})
export class DrizzleJsdbcModule {
  static forRoot(options: DrizzleJsdbcModuleOptions): DynamicModule {
    return {
      module: DrizzleJsdbcModule,
      imports: options.imports ?? [],
      providers: createProviders(options),
      exports: [JSDBC_DATA_SOURCE, JSDBC_TEMPLATE],
      global: options.global ?? false,
    };
  }
}

function createProviders(options: DrizzleJsdbcModuleOptions): Provider[] {
  return [createDrizzleProvider(options), createTemplateProvider()];
}

function createDrizzleProvider(options: DrizzleJsdbcModuleOptions): Provider {
  if (options.dbToken == null) {
    throw new Error("DrizzleJsdbcModule requires dbToken.");
  }

  return {
    provide: JSDBC_DATA_SOURCE,
    useFactory: (db: DrizzleDatabase): DataSource =>
      new DrizzleDataSource(db, options),
    inject: [options.dbToken],
  };
}

function createTemplateProvider(): Provider {
  return {
    provide: JSDBC_TEMPLATE,
    useFactory: (dataSource: DataSource) => new JsdbcTemplate(dataSource),
    inject: [JSDBC_DATA_SOURCE],
  };
}
