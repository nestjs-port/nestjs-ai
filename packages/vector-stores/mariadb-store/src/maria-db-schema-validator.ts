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

import assert from "node:assert/strict";

import { LoggerFactory } from "@nestjs-port/core";
import { type JsdbcTemplate, sql } from "@nestjs-port/jsdbc";

export class MariaDBSchemaValidator {
  private readonly logger = LoggerFactory.getLogger(
    MariaDBSchemaValidator.name,
  );

  constructor(private readonly _jdbcTemplate: JsdbcTemplate) {}

  private async isTableExists(
    schemaName: string | null,
    tableName: string,
  ): Promise<boolean> {
    try {
      // schema and table are expected to be escaped
      const schemaClause =
        schemaName == null ? sql`SCHEMA()` : sql`${schemaName}`;
      // Query for a single integer value, if it exists, table exists
      const rows = await this._jdbcTemplate.queryForList(
        sql`SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ${schemaClause} AND TABLE_NAME = ${tableName}`,
      );
      return rows.length > 0;
    } catch {
      return false;
    }
  }

  async validateTableSchema(
    schemaName: string | null,
    tableName: string,
    idFieldName: string,
    contentFieldName: string,
    metadataFieldName: string,
    embeddingFieldName: string,
    embeddingDimensions: number,
  ): Promise<void> {
    if (!(await this.isTableExists(schemaName, tableName))) {
      throw new Error(
        `Table '${tableName}' does not exist in schema '${schemaName}'`,
      );
    }

    try {
      // ensure server support VECTORs
      await this._jdbcTemplate.queryForList(
        sql`SELECT vec_distance_euclidean(x'0000803f', x'0000803f')`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error while validating database vector support ${message}`,
      );
      this.logger.error(
        `Failed to validate that database supports VECTOR.
Run the following SQL commands:
   SELECT @@version;
And ensure that version is >= 11.7.1`,
      );
      throw new Error(message, { cause: error });
    }

    try {
      this.logger.info(
        `Validating MariaDBStore schema for table: ${tableName} in schema: ${schemaName}`,
      );

      const expectedColumns = [
        idFieldName,
        contentFieldName,
        metadataFieldName,
        embeddingFieldName,
      ];

      const schemaClause =
        schemaName == null ? sql`SCHEMA()` : sql`${schemaName}`;
      // Query to check if the table exists with the required fields and types
      // Include the schema name in the query to target the correct table
      const columns = await this._jdbcTemplate.queryForList(
        sql`SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ${schemaClause} AND TABLE_NAME = ${tableName}`,
      );

      if (columns.length === 0) {
        throw new Error(
          `Error while validating table schema, Table ${tableName} does not exist in schema ${schemaName}`,
        );
      }

      const availableColumns: string[] = [];
      for (const column of columns) {
        const columnName = column.COLUMN_NAME ?? column.column_name;
        assert(columnName != null, "COLUMN_NAME result should not be null");
        // Check each column against expected fields
        availableColumns.push(
          MariaDBSchemaValidator.validateAndEnquoteIdentifier(
            String(columnName),
            false,
          ),
        );
      }

      // TODO ensure id is a primary key for batch update
      const missingColumns = expectedColumns.filter(
        (column) => !availableColumns.includes(column),
      );

      if (missingColumns.length === 0) {
        this.logger.info("MariaDB VectorStore schema validation successful");
      } else {
        throw new Error(`Missing fields ${missingColumns}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error while validating table schema${message}`);
      this.logger.error(
        `Failed to operate with the specified table in the database. To resolve this issue, please ensure the following steps are completed:
1. Verify that the table exists with the appropriate structure. If it does not exist, create it using a SQL command similar to the following:
${MariaDBSchemaValidator.createTableMessage(
  schemaName,
  tableName,
  idFieldName,
  contentFieldName,
  metadataFieldName,
  embeddingFieldName,
  embeddingDimensions,
)}
Please adjust these commands based on your specific configuration and the capabilities of your vector database system.`,
      );
      throw new Error(message);
    }
  }

  /**
   * Escaped identifier according to MariaDB requirement.
   *
   * @param identifier identifier
   * @param alwaysQuote indicate if identifier must be quoted even if not necessary.
   * @returns return escaped identifier, quoted when necessary or indicated with
   * alwaysQuote.
   */
  public static validateAndEnquoteIdentifier(
    identifier: string,
    alwaysQuote: boolean,
  ): string {
    const normalizedIdentifier =
      identifier.startsWith("`") && identifier.endsWith("`")
        ? identifier.slice(1, -1)
        : identifier;

    if (!/^[A-Za-z0-9_]+$/.test(normalizedIdentifier)) {
      throw new Error(
        `Identifier '${identifier}' should only contain alphanumeric characters and underscores`,
      );
    }

    if (normalizedIdentifier.length > 64) {
      throw new Error(
        `Identifier '${identifier}' should only contain alphanumeric characters and underscores`,
      );
    }

    if (alwaysQuote || normalizedIdentifier.length === 64) {
      return `\`${normalizedIdentifier.replace(/`/g, "``")}\``;
    }

    return normalizedIdentifier;
  }

  private static createTableMessage(
    schemaName: string | null,
    tableName: string,
    idFieldName: string,
    contentFieldName: string,
    metadataFieldName: string,
    embeddingFieldName: string,
    embeddingDimensions: number,
  ): string {
    const qualifiedTableName =
      schemaName == null ? tableName : `${schemaName}.${tableName}`;

    return `   CREATE TABLE IF NOT EXISTS ${qualifiedTableName} (
       ${idFieldName} UUID NOT NULL DEFAULT uuid() PRIMARY KEY,
       ${contentFieldName} TEXT,
       ${metadataFieldName} JSON,
       ${embeddingFieldName} VECTOR(${embeddingDimensions}) NOT NULL,
       VECTOR INDEX (${embeddingFieldName})
) ENGINE=InnoDB`;
  }
}
