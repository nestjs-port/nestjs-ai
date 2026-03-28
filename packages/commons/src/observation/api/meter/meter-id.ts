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

import type { Tag } from "./tag";

/**
 * Immutable identifier for a meter.
 * Corresponds to Micrometer's Meter.Id.
 */
export class MeterId {
  readonly name: string;
  readonly tags: readonly Tag[];
  readonly description?: string;
  readonly baseUnit?: string;

  private constructor(
    name: string,
    tags: Tag[],
    description?: string,
    baseUnit?: string,
  ) {
    this.name = name;
    this.tags = MeterId.normalizeTags(tags);
    this.description = description;
    this.baseUnit = baseUnit;
  }

  static of(
    name: string,
    tags: Tag[] = [],
    description?: string,
    baseUnit?: string,
  ): MeterId {
    return new MeterId(name, tags, description, baseUnit);
  }

  withTags(tags: Tag[]): MeterId {
    return new MeterId(
      this.name,
      [...this.tags, ...tags],
      this.description,
      this.baseUnit,
    );
  }

  withDescription(description?: string): MeterId {
    return new MeterId(this.name, [...this.tags], description, this.baseUnit);
  }

  equals(other: MeterId): boolean {
    return this.getIdentityKey() === other.getIdentityKey();
  }

  /**
   * Micrometer-style identity: name + tags.
   * Description/baseUnit are not part of equality.
   */
  getIdentityKey(): string {
    return `${this.name}|${JSON.stringify(this.tags.map((t) => [t.key, t.value]))}`;
  }

  toAttributes(): Record<string, string> {
    const attributes: Record<string, string> = {};
    for (const tag of this.tags) {
      attributes[tag.key] = tag.value;
    }
    return attributes;
  }

  private static normalizeTags(tags: Tag[]): Tag[] {
    return [...tags].sort((a, b) => {
      const keyCmp = a.key.localeCompare(b.key);
      if (keyCmp !== 0) {
        return keyCmp;
      }
      return a.value.localeCompare(b.value);
    });
  }
}
