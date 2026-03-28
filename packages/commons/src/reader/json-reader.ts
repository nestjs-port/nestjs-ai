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
import { readFile } from "node:fs/promises";

import { Document, type DocumentReader } from "../document";
import { EmptyJsonMetadataGenerator } from "./empty-json-metadata-generator";
import type { JsonMetadataGenerator } from "./json-metadata-generator";

export interface JsonReaderProps {
  resource: string | URL | Buffer;
  jsonMetadataGenerator?: JsonMetadataGenerator;
  jsonKeysToUse?: string[];
}

export class JsonReader implements DocumentReader {
  private readonly _resource: string | URL | Buffer;
  private readonly _jsonMetadataGenerator: JsonMetadataGenerator;
  private readonly _jsonKeysToUse: string[];

  constructor({
    resource,
    jsonMetadataGenerator = new EmptyJsonMetadataGenerator(),
    jsonKeysToUse = [],
  }: JsonReaderProps) {
    assert(resource != null, "The resource must not be null");
    assert(
      jsonMetadataGenerator != null,
      "jsonMetadataGenerator must not be null",
    );
    assert(jsonKeysToUse != null, "keys must not be null");

    this._resource = resource;
    this._jsonMetadataGenerator = jsonMetadataGenerator;
    this._jsonKeysToUse = [...jsonKeysToUse];
  }

  async read(): Promise<Document[]> {
    return this.get();
  }

  async get(): Promise<Document[]>;
  async get(pointer: string): Promise<Document[]>;
  async get(pointer?: string): Promise<Document[]> {
    const rootNode = await this.readJsonNode();

    if (pointer == null) {
      return this.getFromNode(rootNode);
    }

    const targetNode = JsonReader.resolveJsonPointer(rootNode, pointer);
    if (targetNode === JsonReader.MISSING_NODE) {
      throw new Error(`Invalid JSON Pointer: ${pointer}`);
    }

    return this.getFromNode(targetNode);
  }

  protected getFromNode(rootNode: unknown): Document[] {
    if (Array.isArray(rootNode)) {
      return rootNode.map((jsonNode) => this.parseJsonNode(jsonNode));
    }

    return [this.parseJsonNode(rootNode)];
  }

  private parseJsonNode(jsonNode: unknown): Document {
    const item = JsonReader.toRecord(jsonNode);

    const lines: string[] = [];
    for (const key of this._jsonKeysToUse) {
      if (Object.hasOwn(item, key)) {
        lines.push(`${key}: ${String(item[key])}`);
      }
    }

    const metadata = this._jsonMetadataGenerator.generate(item);
    const content =
      lines.length === 0 ? JSON.stringify(item) : `${lines.join("\n")}\n`;

    return new Document(content, metadata);
  }

  private async readJsonNode(): Promise<unknown> {
    try {
      const raw = await this.readResourceAsString();
      return JSON.parse(raw) as unknown;
    } catch (error) {
      throw new Error("Error reading JSON resource", { cause: error });
    }
  }

  private async readResourceAsString(): Promise<string> {
    if (Buffer.isBuffer(this._resource)) {
      return this._resource.toString("utf8");
    }

    if (this._resource instanceof URL) {
      const buffer = await readFile(this._resource);
      return buffer.toString("utf8");
    }

    const resource = this._resource;

    try {
      const buffer = await readFile(resource);
      return buffer.toString("utf8");
    } catch {
      return resource;
    }
  }

  private static readonly MISSING_NODE = Symbol("missing-json-node");

  private static resolveJsonPointer(
    rootNode: unknown,
    pointer: string,
  ): unknown {
    if (pointer === "") {
      return rootNode;
    }

    if (!pointer.startsWith("/")) {
      return JsonReader.MISSING_NODE;
    }

    const tokens = pointer
      .split("/")
      .slice(1)
      .map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"));

    let current: unknown = rootNode;
    for (const token of tokens) {
      if (Array.isArray(current)) {
        if (!/^\d+$/.test(token)) {
          return JsonReader.MISSING_NODE;
        }

        const index = Number(token);
        if (index < 0 || index >= current.length) {
          return JsonReader.MISSING_NODE;
        }

        current = current[index];
        continue;
      }

      if (JsonReader.isRecord(current) && Object.hasOwn(current, token)) {
        current = current[token];
        continue;
      }

      return JsonReader.MISSING_NODE;
    }

    return current;
  }

  private static isRecord(value: unknown): value is Record<string, unknown> {
    return value != null && typeof value === "object" && !Array.isArray(value);
  }

  private static toRecord(value: unknown): Record<string, unknown> {
    if (JsonReader.isRecord(value)) {
      return { ...value };
    }

    return { value };
  }
}
