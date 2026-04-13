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

import type { DynamicModule } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import {
  type Connection,
  DatabaseDialect,
  type DataSource,
  JSDBC_DATA_SOURCE,
} from "../../api";
import {
  CustomJsdbcModule,
  type CustomJsdbcModuleAsyncOptions,
} from "../custom.module";

describe("CustomJsdbcModule", () => {
  it("registers a provided data source", () => {
    const dataSource = createDataSource();

    const module = CustomJsdbcModule.forRoot({
      dataSource,
      global: true,
    });

    expect(module).toMatchObject<DynamicModule>({
      module: CustomJsdbcModule,
      exports: [JSDBC_DATA_SOURCE],
      global: true,
    });
    expect(module.providers).toHaveLength(1);
    expect(module.providers?.[0]).toMatchObject({
      provide: JSDBC_DATA_SOURCE,
      useValue: dataSource,
    });
  });

  it("registers an async data source factory", () => {
    const useFactory = vi.fn(async () => createDataSource());
    const options: CustomJsdbcModuleAsyncOptions = {
      imports: [],
      inject: ["CONFIG"],
      useFactory,
    };

    const module = CustomJsdbcModule.forRootAsync(options);

    expect(module).toMatchObject<DynamicModule>({
      module: CustomJsdbcModule,
      exports: [JSDBC_DATA_SOURCE],
      global: false,
    });
    expect(module.providers).toHaveLength(1);
    expect(module.providers?.[0]).toMatchObject({
      provide: JSDBC_DATA_SOURCE,
      inject: ["CONFIG"],
    });
  });
});

function createDataSource(): DataSource {
  const connection = createConnection();

  return {
    getConnection: vi.fn(async () => connection),
    getDialect: vi.fn(async () => DatabaseDialect.POSTGRESQL),
    transaction: async <T>(
      callback: (connection: Connection) => Promise<T>,
    ): Promise<T> => callback(connection),
  };
}

function createConnection(): Connection {
  return {
    query: vi.fn(async () => []),
    update: vi.fn(async () => 0),
    close: vi.fn(async () => {}),
  };
}
