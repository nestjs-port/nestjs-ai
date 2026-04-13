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

import { AsyncLocalStorage } from "node:async_hooks";

import type { Connection, DataSource } from "../api";

interface TransactionStore {
  readonly connections: Map<DataSource, Connection>;
}

export class TransactionSynchronizationManager {
  private static readonly transactionStorage =
    new AsyncLocalStorage<TransactionStore>();

  static getResource(dataSource: DataSource): Connection | null {
    return (
      TransactionSynchronizationManager.transactionStorage
        .getStore()
        ?.connections.get(dataSource) ?? null
    );
  }

  static async withResourceContext<T>(
    dataSource: DataSource,
    connection: Connection,
    callback: () => Promise<T>,
  ): Promise<T> {
    const store =
      TransactionSynchronizationManager.transactionStorage.getStore();
    if (store == null) {
      return TransactionSynchronizationManager.transactionStorage.run(
        {
          connections: new Map([[dataSource, connection]]),
        },
        callback,
      );
    }

    const nextStore: TransactionStore = {
      connections: new Map(store.connections),
    };
    nextStore.connections.set(dataSource, connection);

    return TransactionSynchronizationManager.transactionStorage.run(
      nextStore,
      callback,
    );
  }
}
