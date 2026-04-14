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

import { type DataSource, JSDBC_DATA_SOURCE, JSDBC_TEMPLATE } from "../api";
import { JsdbcTemplate } from "../core";
import type { PrismaClientLike, PrismaRuntime } from "./prisma";
import {
  PrismaDataSource,
  type PrismaJsdbcOptions,
} from "./prisma-data-source";

export interface PrismaJsdbcModuleOptions extends PrismaJsdbcOptions {
  global?: boolean;
  imports?: ModuleMetadata["imports"];
  prismaToken: InjectionToken;
  prismaRuntime: PrismaRuntime;
}

@Module({})
export class PrismaJsdbcModule {
  static forRoot(options: PrismaJsdbcModuleOptions): DynamicModule {
    return {
      module: PrismaJsdbcModule,
      imports: options.imports ?? [],
      providers: createProviders(options),
      exports: [JSDBC_DATA_SOURCE, JSDBC_TEMPLATE],
      global: options.global ?? false,
    };
  }
}

function createProviders(options: PrismaJsdbcModuleOptions): Provider[] {
  return [createPrismaProvider(options), createTemplateProvider()];
}

function createPrismaProvider(options: PrismaJsdbcModuleOptions): Provider {
  const prismaToken = options.prismaToken;

  if (prismaToken == null) {
    throw new Error("PrismaJsdbcModule requires prismaToken.");
  }

  if (options.prismaRuntime == null) {
    throw new Error("PrismaJsdbcModule requires prismaRuntime.");
  }

  return {
    provide: JSDBC_DATA_SOURCE,
    useFactory: (prisma: PrismaClientLike): DataSource =>
      new PrismaDataSource(prisma, options.prismaRuntime, options),
    inject: [prismaToken],
  };
}

function createTemplateProvider(): Provider {
  return {
    provide: JSDBC_TEMPLATE,
    useFactory: (dataSource: DataSource) => new JsdbcTemplate(dataSource),
    inject: [JSDBC_DATA_SOURCE],
  };
}
