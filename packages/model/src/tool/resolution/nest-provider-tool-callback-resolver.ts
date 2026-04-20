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
import type { ProviderInstanceExplorer } from "@nestjs-ai/commons";
import { type Logger, LoggerFactory } from "@nestjs-port/core";
import { MethodToolCallbackProvider } from "../method";
import type { ToolCallback } from "../tool-callback";
import type { ToolCallbackResolver } from "./tool-callback-resolver.interface";

/**
 * A provider explorer-based implementation that discovers Tool-annotated methods
 * from container providers and caches them as ToolCallback instances.
 */
export class NestProviderToolCallbackResolver implements ToolCallbackResolver {
  private readonly _logger: Logger = LoggerFactory.getLogger(
    NestProviderToolCallbackResolver.name,
  );
  private readonly _providerInstanceExplorer: ProviderInstanceExplorer;
  private readonly _toolCallbacksCache = new Map<string, ToolCallback>();
  private _cacheInitialized = false;

  constructor(providerInstanceExplorer: ProviderInstanceExplorer) {
    assert(
      providerInstanceExplorer != null,
      "providerInstanceExplorer cannot be null",
    );
    this._providerInstanceExplorer = providerInstanceExplorer;
  }

  resolve(toolName: string): ToolCallback | null {
    assert(toolName?.trim(), "toolName cannot be null or empty");
    this._logger.debug(
      "ToolCallback resolution attempt from provider instance explorer",
    );

    if (!this._cacheInitialized) {
      this.initializeCache();
    }

    return this._toolCallbacksCache.get(toolName) ?? null;
  }

  private initializeCache(): void {
    try {
      const toolCallbacks = this.collectToolCallbacks();
      this.cacheToolCallbacks(toolCallbacks);
      this._cacheInitialized = true;
    } catch (error) {
      this._toolCallbacksCache.clear();
      this._logger.debug(
        "ToolCallback cache initialization from provider instance explorer failed",
        error as Error,
      );
    }
  }

  private collectToolCallbacks(): ToolCallback[] {
    const providerInstances =
      this._providerInstanceExplorer.getProviderInstances();
    return providerInstances.flatMap((providerInstance) =>
      this.resolveToolCallbacksForProvider(providerInstance),
    );
  }

  private cacheToolCallbacks(toolCallbacks: ToolCallback[]): void {
    for (const toolCallback of toolCallbacks) {
      const toolName = toolCallback.toolDefinition.name;
      if (this._toolCallbacksCache.has(toolName)) {
        this._logger.warn(
          `Multiple tools with the same name (${toolName}) found across provider instances. Overwriting existing tool callback in cache.`,
        );
      }
      this._toolCallbacksCache.set(toolName, toolCallback);
    }
  }

  private resolveToolCallbacksForProvider(
    providerInstance: object,
  ): ToolCallback[] {
    try {
      return new MethodToolCallbackProvider([providerInstance]).toolCallbacks;
    } catch {
      return [];
    }
  }
}
