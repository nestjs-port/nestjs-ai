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

import type { Connection, SqlFragment } from "../api";
import type { PrismaRawClient, PrismaSql } from "./prisma";
import { Prisma } from "./prisma-runtime";

export class PrismaConnection implements Connection {
  #closed = false;

  constructor(private readonly prisma: PrismaRawClient) {}

  async query(fragment: SqlFragment): Promise<Record<string, unknown>[]> {
    this.assertOpen();
    return this.prisma.$queryRaw<Record<string, unknown>[]>(
      this.toPrismaSql(fragment),
    );
  }

  async update(fragment: SqlFragment): Promise<number> {
    this.assertOpen();
    return this.prisma.$executeRaw(this.toPrismaSql(fragment));
  }

  async close(): Promise<void> {
    this.#closed = true;
  }

  private assertOpen(): void {
    if (this.#closed) {
      throw new Error("Connection is already closed.");
    }
  }

  private toPrismaSql(fragment: SqlFragment): PrismaSql {
    const expressions = fragment.expressions.map((expression, index) => {
      if (expression === null) {
        return Prisma.raw("NULL");
      }

      if (typeof expression === "function") {
        const value = expression();

        if (typeof value === "string") {
          return Prisma.raw(value);
        }

        if (Array.isArray(value)) {
          if (value.length === 0) {
            throw new Error(
              `Expression ${index} in this sql tagged template is a function which returned an empty array. Empty arrays cannot safely be expanded into parameter lists.`,
            );
          }

          return Prisma.join(value);
        }

        throw new Error(
          `Expression ${index} in this sql tagged template is a function which returned a value of type "${value === null ? "null" : typeof value}". Only array and string types are supported as function return values in sql tagged template expressions.`,
        );
      }

      return expression;
    });

    return Prisma.sql(fragment.strings, ...expressions);
  }
}
