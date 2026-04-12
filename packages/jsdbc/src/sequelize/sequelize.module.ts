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
import { getConnectionToken } from "@nestjs/sequelize";
import type { Sequelize } from "sequelize";

import { type DataSource, JSDBC_DATA_SOURCE } from "../api";
import { SequelizeDataSource } from "./sequelize-data-source";

export interface SequelizeJsdbcModuleOptions {
  connectionName?: string;
  global?: boolean;
  imports?: ModuleMetadata["imports"];
  sequelizeToken?: InjectionToken;
}

@Module({})
export class SequelizeJsdbcModule {
  static forRoot(options: SequelizeJsdbcModuleOptions = {}): DynamicModule {
    return {
      module: SequelizeJsdbcModule,
      imports: options.imports ?? [],
      providers: [
        createSequelizeProvider(options.connectionName, options.sequelizeToken),
      ],
      exports: [JSDBC_DATA_SOURCE],
      global: options.global ?? false,
    };
  }
}

function createSequelizeProvider(
  connectionName?: string,
  sequelizeToken?: InjectionToken,
): Provider {
  return {
    provide: JSDBC_DATA_SOURCE,
    useFactory: (sequelize: Sequelize): DataSource =>
      new SequelizeDataSource(sequelize),
    inject: [sequelizeToken ?? getConnectionToken(connectionName)],
  };
}
