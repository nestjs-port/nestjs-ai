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

import { type DataSource, JSDBC_DATA_SOURCE } from "../api";
import {
  PrismaDataSource,
  type PrismaJsdbcOptions,
  type PrismaLike,
} from "./prisma-data-source";

export interface PrismaJsdbcModuleOptions extends PrismaJsdbcOptions {
  global?: boolean;
  imports?: ModuleMetadata["imports"];
  prismaToken: InjectionToken;
}

@Module({})
export class PrismaJsdbcModule {
  static forRoot(options: PrismaJsdbcModuleOptions): DynamicModule {
    return {
      module: PrismaJsdbcModule,
      imports: options.imports ?? [],
      providers: [createPrismaProvider(options)],
      exports: [JSDBC_DATA_SOURCE],
      global: options.global ?? false,
    };
  }
}

function createPrismaProvider(options: PrismaJsdbcModuleOptions): Provider {
  const prismaToken = options.prismaToken;

  if (prismaToken == null) {
    throw new Error("PrismaJsdbcModule requires prismaToken.");
  }

  return {
    provide: JSDBC_DATA_SOURCE,
    useFactory: (prisma: PrismaLike): DataSource =>
      new PrismaDataSource(prisma as unknown as PrismaLike, options),
    inject: [prismaToken],
  };
}
