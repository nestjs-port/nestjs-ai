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

import type {
  DynamicModule,
  InjectionToken,
  ModuleMetadata,
  Provider,
} from "@nestjs/common";
import { Module } from "@nestjs/common";

import type { DataSource } from "../api";
import { JSDBC_DATA_SOURCE, JSDBC_TEMPLATE } from "../api";
import { JsdbcTemplate } from "../core";

export interface CustomJsdbcModuleAsyncOptions {
  global?: boolean;
  imports?: ModuleMetadata["imports"];
  inject?: InjectionToken[];
  useFactory: (...args: never[]) => Promise<DataSource> | DataSource;
}

export interface CustomJsdbcModuleOptions {
  dataSource: DataSource;
  global?: boolean;
  imports?: ModuleMetadata["imports"];
}

@Module({})
export class CustomJsdbcModule {
  static forRoot(options: CustomJsdbcModuleOptions): DynamicModule {
    return {
      module: CustomJsdbcModule,
      imports: options.imports ?? [],
      providers: createProviders(options.dataSource),
      exports: [JSDBC_DATA_SOURCE, JSDBC_TEMPLATE],
      global: options.global ?? false,
    };
  }

  static forRootAsync(options: CustomJsdbcModuleAsyncOptions): DynamicModule {
    return {
      module: CustomJsdbcModule,
      imports: options.imports ?? [],
      providers: createAsyncProviders(options),
      exports: [JSDBC_DATA_SOURCE, JSDBC_TEMPLATE],
      global: options.global ?? false,
    };
  }
}

function createProviders(dataSource: DataSource): Provider[] {
  return [createDataSourceProvider(dataSource), createTemplateProvider()];
}

function createAsyncProviders(
  options: CustomJsdbcModuleAsyncOptions,
): Provider[] {
  return [createAsyncDataSourceProvider(options), createTemplateProvider()];
}

function createDataSourceProvider(dataSource: DataSource): Provider {
  return {
    provide: JSDBC_DATA_SOURCE,
    useValue: dataSource,
  };
}

function createAsyncDataSourceProvider(
  options: CustomJsdbcModuleAsyncOptions,
): Provider {
  return {
    provide: JSDBC_DATA_SOURCE,
    useFactory: async (...args: never[]) => options.useFactory(...args),
    inject: options.inject ?? [],
  };
}

function createTemplateProvider(): Provider {
  return {
    provide: JSDBC_TEMPLATE,
    useFactory: (dataSource: DataSource) => new JsdbcTemplate(dataSource),
    inject: [JSDBC_DATA_SOURCE],
  };
}
