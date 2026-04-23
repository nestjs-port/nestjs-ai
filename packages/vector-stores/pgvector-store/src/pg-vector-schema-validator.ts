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

import { LoggerFactory } from "@nestjs-port/core";
import { type JsdbcTemplate, sql } from "@nestjs-port/jsdbc";

export class PgVectorSchemaValidator {
  private static readonly logger = LoggerFactory.getLogger(
    PgVectorSchemaValidator.name,
  );

  constructor(private readonly jdbcTemplate: JsdbcTemplate) {}

  static isValidNameForDatabaseObject(name: string | null): boolean {
    if (name == null) {
      return false;
    }

    // Check if the table or schema has Only alphanumeric characters and underscores
    // and should be less than 64 characters
    if (!/^[a-zA-Z0-9_]{1,64}$/.test(name)) {
      return false;
    }

    // Check to ensure the table or schema name is not purely numeric
    if (/^[0-9]+$/.test(name)) {
      return false;
    }

    return true;
  }

  async isTableExists(schemaName: string, tableName: string): Promise<boolean> {
    try {
      const rows = await this.jdbcTemplate.queryForList(
        sql`SELECT 1 FROM information_schema.tables WHERE table_schema = ${schemaName} AND table_name = ${tableName}`,
      );
      return rows.length > 0;
    } catch {
      return false;
    }
  }

  async validateTableSchema(
    schemaName: string,
    tableName: string,
  ): Promise<void> {
    if (!PgVectorSchemaValidator.isValidNameForDatabaseObject(schemaName)) {
      throw new Error(
        "Schema name should only contain alphanumeric characters and underscores",
      );
    }
    if (!PgVectorSchemaValidator.isValidNameForDatabaseObject(tableName)) {
      throw new Error(
        "Table name should only contain alphanumeric characters and underscores",
      );
    }

    if (!(await this.isTableExists(schemaName, tableName))) {
      throw new Error(
        `Table ${tableName} does not exist in schema ${schemaName}`,
      );
    }

    try {
      PgVectorSchemaValidator.logger.info(
        `Validating PGVectorStore schema for table: ${tableName} in schema: ${schemaName}`,
      );

      const expectedColumns = ["id", "content", "metadata", "embedding"];

      // Query to check if the table exists with the required fields and types
      // Include the schema name in the query to target the correct table
      const columns = await this.jdbcTemplate.queryForList(
        sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = ${schemaName} AND table_name = ${tableName}`,
      );

      if (columns.length === 0) {
        throw new Error(
          `Error while validating table schema, Table ${tableName} does not exist in schema ${schemaName}`,
        );
      }

      // Check each column against expected fields
      const availableColumns = columns.map((column) =>
        String(column.column_name),
      );

      const missing = expectedColumns.filter(
        (column) => !availableColumns.includes(column),
      );

      if (missing.length === 0) {
        PgVectorSchemaValidator.logger.info(
          "PG VectorStore schema validation successful",
        );
      } else {
        throw new Error(`Missing fields ${missing.join(",")}`);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      PgVectorSchemaValidator.logger.error(
        `Error while validating table schema${message}`,
      );
      PgVectorSchemaValidator.logger.error(
        `Failed to operate with the specified table in the database. To resolve this issue, please ensure the following steps are completed:
1. Ensure the necessary PostgreSQL extensions are enabled. Run the following SQL commands:
   CREATE EXTENSION IF NOT EXISTS vector;
   CREATE EXTENSION IF NOT EXISTS hstore;
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
2. Verify that the table exists with the appropriate structure. If it does not exist, create it using a SQL command similar to the following, replacing 'embedding_dimensions' with the appropriate size based on your vector embeddings:
   CREATE TABLE IF NOT EXISTS ${schemaName}.${tableName} (
       id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
       content text,
       metadata json,
       embedding vector(embedding_dimensions)  // Replace 'embedding_dimensions' with your specific value
   );
3. Create an appropriate index for the vector embedding to optimize performance. Adjust the index type and options based on your usage. Example SQL for creating an index:
   CREATE INDEX ON ${tableName} USING HNSW (embedding vector_cosine_ops);

Please adjust these commands based on your specific configuration and the capabilities of your vector database system.`,
      );
      throw new Error(message);
    }
  }
}
