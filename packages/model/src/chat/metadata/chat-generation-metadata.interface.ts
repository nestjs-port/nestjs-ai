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
import type { ResultMetadata } from "../../model";
import { DefaultChatGenerationMetadataBuilder } from "./default-chat-generation-metadata-builder";

/**
 * Represents the metadata associated with the generation of a chat response.
 */
export abstract class ChatGenerationMetadata implements ResultMetadata {
  /**
   * NULL instance of ChatGenerationMetadata with empty values.
   */
  static get NULL(): ChatGenerationMetadata {
    return DefaultChatGenerationMetadata.builder().build();
  }

  /**
   * Get the reason this choice completed for the generation.
   *
   * @returns the reason this choice completed for the generation
   */
  abstract get finishReason(): string | null;

  /**
   * Get the content filters applied to this generation.
   *
   * @returns the content filters applied to this generation
   */
  abstract get contentFilters(): string[];

  /**
   * Get a value from the metadata.
   *
   * @typeParam T - Type used to cast the metadata value
   * @param key - the metadata key
   * @returns the metadata value, or null if not found
   */
  abstract get<T>(key: string): T | null;

  /**
   * Check if the metadata contains a key.
   *
   * @param key - the metadata key
   * @returns true if the metadata contains the key
   */
  abstract containsKey(key: string): boolean;

  /**
   * Get a value from the metadata or return a default value.
   *
   * @typeParam T - Type used to cast the metadata value
   * @param key - the metadata key
   * @param defaultValue - the default value to return if key is not found
   * @returns the metadata value or the default value
   */
  abstract getOrDefault<T>(key: string, defaultValue: T): T;

  /**
   * Get all entries in the metadata.
   *
   * @returns all entries in the metadata
   */
  abstract get entrySet(): Array<[string, unknown]>;

  /**
   * Get all keys in the metadata.
   *
   * @returns all keys in the metadata
   */
  abstract get keySet(): string[];

  /**
   * Check if the metadata is empty.
   *
   * @returns true if the metadata is empty
   */
  abstract get isEmpty(): boolean;

  /**
   * Create a new Builder instance.
   *
   * @returns a new Builder instance
   */
  static builder(): DefaultChatGenerationMetadataBuilder {
    return new DefaultChatGenerationMetadataBuilder();
  }
}

/**
 * Builder interface for creating ChatGenerationMetadata instances.
 */
export interface ChatGenerationMetadataBuilder {
  /**
   * Set the reason this choice completed for the generation.
   *
   * @param finishReason - the finish reason
   * @returns this builder for method chaining
   */
  finishReason(finishReason: string | null): this;

  /**
   * Add metadata to the Generation result.
   *
   * @typeParam T - Type of the metadata value
   * @param key - the metadata key
   * @param value - the metadata value
   * @returns this builder for method chaining
   */
  metadata<T>(key: string, value: T): this;

  /**
   * Add metadata to the Generation result.
   *
   * @param metadata - the metadata map
   * @returns this builder for method chaining
   */
  metadata(metadata: Record<string, unknown>): this;

  /**
   * Add content filter to the Generation result.
   *
   * @param contentFilter - the content filter
   * @returns this builder for method chaining
   */
  contentFilter(contentFilter: string): this;

  /**
   * Add content filters to the Generation result.
   *
   * @param contentFilters - the content filters
   * @returns this builder for method chaining
   */
  contentFilters(contentFilters: string[]): this;

  /**
   * Build the Generation metadata.
   *
   * @returns the built ChatGenerationMetadata instance
   */
  build(): ChatGenerationMetadata;
}

/**
 * Properties for creating a DefaultChatGenerationMetadata instance.
 */
export interface DefaultChatGenerationMetadataProps {
  metadata?: Record<string, unknown>;
  finishReason?: string | null;
  contentFilters?: string[];
}

/**
 * Default implementation of {@link ChatGenerationMetadata}.
 */
export class DefaultChatGenerationMetadata extends ChatGenerationMetadata {
  private readonly _metadata: Record<string, unknown>;
  private readonly _finishReason: string | null;
  private readonly _contentFilters: string[];

  /**
   * Create a new {@link DefaultChatGenerationMetadata} instance.
   *
   * @param props - the properties for creating the metadata
   * @throws {Error} if metadata or contentFilters is null
   */
  constructor(props: DefaultChatGenerationMetadataProps = {}) {
    super();
    assert(props.metadata != null, "Metadata must not be null");
    assert(props.contentFilters != null, "Content filters must not be null");
    this._metadata = { ...props.metadata };
    this._finishReason = props.finishReason ?? null;
    this._contentFilters = [...(props.contentFilters ?? [])];
  }

  get<T>(key: string): T | null {
    return (this._metadata[key] as T) ?? null;
  }

  containsKey(key: string): boolean {
    return key in this._metadata;
  }

  getOrDefault<T>(key: string, defaultValue: T): T {
    const value = this.get<T>(key);
    return value != null ? value : defaultValue;
  }

  get entrySet(): Array<[string, unknown]> {
    return Object.entries(this._metadata);
  }

  get keySet(): string[] {
    return Object.keys(this._metadata);
  }

  get isEmpty(): boolean {
    return Object.keys(this._metadata).length === 0;
  }

  get finishReason(): string | null {
    return this._finishReason;
  }

  get contentFilters(): string[] {
    return [...this._contentFilters];
  }
}
