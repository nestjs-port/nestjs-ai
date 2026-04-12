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

import { DatabaseDialect } from "./database-dialect.enum";

export type SqlTagExpression = unknown | (() => unknown);

export interface SqlFragment {
  readonly strings: TemplateStringsArray;
  readonly expressions: readonly SqlTagExpression[];
}

export interface BuiltSqlTag {
  query: string;
  parameters: unknown[];
}

function createParameterFormatter(
  dialect: DatabaseDialect,
): (index: number) => string {
  switch (dialect) {
    case DatabaseDialect.POSTGRESQL:
      return (index) => `$${index + 1}`;
    case DatabaseDialect.ORACLE:
      return (index) => `:${index + 1}`;
    case DatabaseDialect.MICROSOFT_SQL_SERVER:
      return (index) => `@${index}`;
    default:
      return () => "?";
  }
}

export function sql(
  strings: TemplateStringsArray,
  ...expressions: readonly SqlTagExpression[]
): SqlFragment {
  return {
    strings,
    expressions,
  };
}

/**
 * Builds a parameterized SQL query from a tagged template literal in the same
 * shape TypeORM's `sql` tag uses.
 */
export function buildSqlTag(
  strings: TemplateStringsArray,
  expressions: readonly SqlTagExpression[],
  dialect: DatabaseDialect,
): BuiltSqlTag {
  const formatParameter = createParameterFormatter(dialect);
  let query = "";
  const parameters: unknown[] = [];

  for (let index = 0; index < expressions.length; index++) {
    query += strings[index];
    const expression = expressions[index];

    if (expression === null) {
      query += "NULL";
      continue;
    }

    if (typeof expression === "function") {
      const value = expression();

      if (typeof value === "string") {
        query += value;
        continue;
      }

      if (Array.isArray(value)) {
        if (value.length === 0) {
          throw new Error(
            `Expression ${index} in this sql tagged template is a function which returned an empty array. Empty arrays cannot safely be expanded into parameter lists.`,
          );
        }

        const placeholders = value.map((_, arrayIndex) =>
          formatParameter(parameters.length + arrayIndex),
        );
        query += placeholders.join(", ");
        parameters.push(...value);
        continue;
      }

      throw new Error(
        `Expression ${index} in this sql tagged template is a function which returned a value of type "${value === null ? "null" : typeof value}". Only array and string types are supported as function return values in sql tagged template expressions.`,
      );
    }

    query += formatParameter(parameters.length);
    parameters.push(expression);
  }

  query += strings[strings.length - 1];

  return { query, parameters };
}
