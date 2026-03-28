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

import type { Milliseconds } from "@nestjs-ai/commons";
import type { CachedContentRequest } from "../cached-content-request";
import { CachedContentUpdateRequest } from "../cached-content-update-request";
import { GoogleGenAiCachedContent } from "../google-gen-ai-cached-content";
import {
  CachedContentException,
  CachedContentPage,
} from "../google-gen-ai-cached-content-service";

export class TestGoogleGenAiCachedContentService {
  private readonly _cache = new Map<string, GoogleGenAiCachedContent>();
  private _nextId = 1;

  create(request: CachedContentRequest): GoogleGenAiCachedContent {
    const name = `cachedContent/${this._nextId++}`;
    const cached = new GoogleGenAiCachedContent({
      name,
      model: request.model,
      displayName: request.displayName,
      ttl: request.ttl,
      expireTime: request.expireTime?.toISOString(),
      contents: request.contents,
      systemInstruction: request.systemInstruction,
      createTime: new Date().toISOString(),
    });

    this._cache.set(name, cached);
    return cached;
  }

  get(name: string): GoogleGenAiCachedContent | undefined {
    return this._cache.get(name);
  }

  update(
    name: string,
    request: CachedContentUpdateRequest,
  ): GoogleGenAiCachedContent {
    const existing = this._cache.get(name);
    if (!existing) {
      throw new CachedContentException(`Cached content not found: ${name}`);
    }

    const updated = new GoogleGenAiCachedContent({
      name,
      model: existing.model,
      displayName: existing.displayName,
      ttl: request.ttl ?? existing.ttl,
      expireTime: request.expireTime?.toISOString() ?? existing.expireTime,
      contents: existing.contents,
      systemInstruction: existing.systemInstruction,
      createTime: existing.createTime,
      updateTime: new Date().toISOString(),
    });

    this._cache.set(name, updated);
    return updated;
  }

  delete(name: string): boolean {
    return this._cache.delete(name);
  }

  list(_pageSize?: number, _pageToken?: string): CachedContentPage {
    const contents = [...this._cache.values()];
    return new CachedContentPage(contents, null);
  }

  listAll(): GoogleGenAiCachedContent[] {
    return [...this._cache.values()];
  }

  async createAsync(
    request: CachedContentRequest,
  ): Promise<GoogleGenAiCachedContent> {
    return this.create(request);
  }

  async getAsync(name: string): Promise<GoogleGenAiCachedContent | undefined> {
    return this.get(name);
  }

  async updateAsync(
    name: string,
    request: CachedContentUpdateRequest,
  ): Promise<GoogleGenAiCachedContent> {
    return this.update(name, request);
  }

  async deleteAsync(name: string): Promise<boolean> {
    return this.delete(name);
  }

  extendTtl(
    name: string,
    additionalTtlMs: Milliseconds,
  ): GoogleGenAiCachedContent {
    const existing = this.get(name);
    if (!existing) {
      throw new CachedContentException(`Cached content not found: ${name}`);
    }

    const baseTime = existing.expireTime
      ? new Date(existing.expireTime).getTime()
      : Date.now();
    const newExpireTime = new Date(baseTime + additionalTtlMs);

    return this.update(
      name,
      new CachedContentUpdateRequest({ expireTime: newExpireTime }),
    );
  }

  refreshExpiration(
    name: string,
    maxTtl: Milliseconds,
  ): GoogleGenAiCachedContent {
    return this.update(name, new CachedContentUpdateRequest({ ttl: maxTtl }));
  }

  cleanupExpired(): number {
    const toRemove: string[] = [];
    for (const [key, value] of this._cache) {
      if (value.expired) {
        toRemove.push(key);
      }
    }
    for (const key of toRemove) {
      this._cache.delete(key);
    }
    return toRemove.length;
  }

  clearAll(): void {
    this._cache.clear();
  }

  contains(name: string): boolean {
    return this._cache.has(name);
  }

  get size(): number {
    return this._cache.size;
  }
}
