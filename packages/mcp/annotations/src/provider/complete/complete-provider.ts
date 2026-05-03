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

import "reflect-metadata";
import assert from "node:assert/strict";

import type {
  CompleteRequest,
  CompleteResult,
  ServerContext,
} from "@modelcontextprotocol/server";

import {
  CompleteAdapter,
  type CompleteReference,
} from "../../adapter/index.js";
import { MCP_COMPLETE_METADATA_KEY } from "../../metadata.js";
import type { McpCompleteMetadata } from "../../mcp-complete.js";
import {
  McpCompleteMethodCallback,
  McpStatelessCompleteMethodCallback,
} from "../../method/complete/index.js";
import type { McpServerExchange } from "../../context/index.js";

export interface CompleteSpecification<TContext> {
  referenceKey: CompleteReference;
  completionHandler: (
    context: TContext,
    request: CompleteRequest,
  ) => Promise<CompleteResult>;
}

export class McpCompleteProvider {
  private readonly _completeObjects: object[];

  constructor(completeObjects: object[]) {
    assert(completeObjects != null, "completeObjects cannot be null");
    this._completeObjects = completeObjects;
  }

  getCompleteSpecifications(): CompleteSpecification<McpServerExchange>[] {
    return this._completeObjects.flatMap((completeObject) =>
      this.doGetClassMethods(completeObject)
        .filter((methodName) => this.isAsyncMethod(completeObject, methodName))
        .filter(
          (methodName) =>
            this.getCompleteMetadata(completeObject, methodName) != null,
        )
        .sort((a, b) => a.localeCompare(b))
        .map((propertyKey) => {
          const complete = this.getCompleteMetadata(
            completeObject,
            propertyKey,
          );
          if (complete == null) {
            throw new Error("complete metadata cannot be null");
          }
          const callback = new McpCompleteMethodCallback({
            provider: completeObject,
            propertyKey,
            complete,
          });
          return {
            referenceKey: CompleteAdapter.asCompleteReference(complete),
            completionHandler: callback.apply.bind(callback),
          };
        }),
    ) as CompleteSpecification<McpServerExchange>[];
  }

  protected doGetClassMethods(bean: object): string[] {
    return Object.getOwnPropertyNames(Object.getPrototypeOf(bean)).filter(
      (name) =>
        name !== "constructor" &&
        typeof (bean as Record<string, unknown>)[name] === "function",
    );
  }

  protected getCompleteMetadata(
    bean: object,
    propertyKey: string,
  ): McpCompleteMetadata | null {
    return (
      (Reflect.getMetadata(
        MCP_COMPLETE_METADATA_KEY,
        Object.getPrototypeOf(bean),
        propertyKey,
      ) as McpCompleteMetadata | undefined) ?? null
    );
  }

  protected isAsyncMethod(bean: object, propertyKey: string): boolean {
    const method = (bean as Record<string, unknown>)[propertyKey];
    return (
      typeof method === "function" &&
      method.constructor.name === "AsyncFunction"
    );
  }
}

export class McpStatelessCompleteProvider {
  private readonly _completeObjects: object[];

  constructor(completeObjects: object[]) {
    assert(completeObjects != null, "completeObjects cannot be null");
    this._completeObjects = completeObjects;
  }

  getCompleteSpecifications(): CompleteSpecification<ServerContext>[] {
    return this._completeObjects.flatMap((completeObject) =>
      Object.getOwnPropertyNames(Object.getPrototypeOf(completeObject))
        .filter(
          (name) =>
            name !== "constructor" &&
            typeof (completeObject as Record<string, unknown>)[name] ===
              "function",
        )
        .filter((methodName) => this.isAsyncMethod(completeObject, methodName))
        .filter(
          (methodName) =>
            this.getCompleteMetadata(completeObject, methodName) != null,
        )
        .sort((a, b) => a.localeCompare(b))
        .map((propertyKey) => {
          const complete = this.getCompleteMetadata(
            completeObject,
            propertyKey,
          );
          if (complete == null) {
            throw new Error("complete metadata cannot be null");
          }
          const callback = new McpStatelessCompleteMethodCallback({
            provider: completeObject,
            propertyKey,
            complete,
          });
          return {
            referenceKey: CompleteAdapter.asCompleteReference(complete),
            completionHandler: callback.apply.bind(callback),
          };
        }),
    ) as CompleteSpecification<ServerContext>[];
  }

  protected getCompleteMetadata(
    bean: object,
    propertyKey: string,
  ): McpCompleteMetadata | null {
    return (
      (Reflect.getMetadata(
        MCP_COMPLETE_METADATA_KEY,
        Object.getPrototypeOf(bean),
        propertyKey,
      ) as McpCompleteMetadata | undefined) ?? null
    );
  }

  protected isAsyncMethod(bean: object, propertyKey: string): boolean {
    const method = (bean as Record<string, unknown>)[propertyKey];
    return (
      typeof method === "function" &&
      method.constructor.name === "AsyncFunction"
    );
  }
}
