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

import { MessageType } from "@nestjs-ai/model";

import { AnthropicCacheStrategy } from "./anthropic-cache-strategy.js";
import { AnthropicCacheTtl } from "./anthropic-cache-ttl.js";

export interface AnthropicCacheOptionsProps {
  strategy?: AnthropicCacheStrategy;
  contentLengthFunction?: (content: string | null) => number;
  messageTypeTtl?: Map<MessageType, AnthropicCacheTtl>;
  messageTypeMinContentLengths?: Map<MessageType, number>;
  multiBlockSystemCaching?: boolean;
}

/**
 * Anthropic cache options for configuring prompt caching behavior with the Anthropic
 * Java SDK.
 */
export class AnthropicCacheOptions {
  private static readonly DEFAULT_MIN_CONTENT_LENGTH = 1;

  /**
   * Returns a new disabled cache options instance with strategy `NONE`. Each call
   * returns a fresh instance to avoid shared mutable state.
   */
  static disabled(): AnthropicCacheOptions {
    return new AnthropicCacheOptions();
  }

  private _strategy: AnthropicCacheStrategy = AnthropicCacheStrategy.NONE;

  private _contentLengthFunction: (content: string | null) => number = (
    content,
  ) => (content != null ? content.length : 0);

  private _messageTypeTtl: Map<MessageType, AnthropicCacheTtl> = new Map(
    MessageType.values().map((messageType) => [
      messageType,
      AnthropicCacheTtl.FIVE_MINUTES,
    ]),
  );

  private _messageTypeMinContentLengths: Map<MessageType, number> = new Map(
    MessageType.values().map((messageType) => [
      messageType,
      AnthropicCacheOptions.DEFAULT_MIN_CONTENT_LENGTH,
    ]),
  );

  private _multiBlockSystemCaching = false;

  constructor(props?: AnthropicCacheOptionsProps) {
    if (props?.strategy != null) {
      this._strategy = props.strategy;
    }
    if (props?.contentLengthFunction != null) {
      this._contentLengthFunction = props.contentLengthFunction;
    }
    if (props?.messageTypeTtl != null) {
      this._messageTypeTtl = new Map(props.messageTypeTtl);
    }
    if (props?.messageTypeMinContentLengths != null) {
      this._messageTypeMinContentLengths = new Map(
        props.messageTypeMinContentLengths,
      );
    }
    if (props?.multiBlockSystemCaching != null) {
      this._multiBlockSystemCaching = props.multiBlockSystemCaching;
    }
  }

  get strategy(): AnthropicCacheStrategy {
    return this._strategy;
  }

  setStrategy(strategy: AnthropicCacheStrategy): void {
    this._strategy = strategy;
  }

  get contentLengthFunction(): (content: string | null) => number {
    return this._contentLengthFunction;
  }

  setContentLengthFunction(
    contentLengthFunction: (content: string | null) => number,
  ): void {
    this._contentLengthFunction = contentLengthFunction;
  }

  get messageTypeTtl(): Map<MessageType, AnthropicCacheTtl> {
    return this._messageTypeTtl;
  }

  setMessageTypeTtl(messageTypeTtl: Map<MessageType, AnthropicCacheTtl>): void {
    this._messageTypeTtl = messageTypeTtl;
  }

  get messageTypeMinContentLengths(): Map<MessageType, number> {
    return this._messageTypeMinContentLengths;
  }

  setMessageTypeMinContentLengths(
    messageTypeMinContentLengths: Map<MessageType, number>,
  ): void {
    this._messageTypeMinContentLengths = messageTypeMinContentLengths;
  }

  get multiBlockSystemCaching(): boolean {
    return this._multiBlockSystemCaching;
  }

  setMultiBlockSystemCaching(multiBlockSystemCaching: boolean): void {
    this._multiBlockSystemCaching = multiBlockSystemCaching;
  }

  equals(other: unknown): boolean {
    if (this === other) {
      return true;
    }
    if (!(other instanceof AnthropicCacheOptions)) {
      return false;
    }

    return (
      this._multiBlockSystemCaching === other._multiBlockSystemCaching &&
      this._strategy === other._strategy &&
      mapEquals(this._messageTypeTtl, other._messageTypeTtl) &&
      mapEquals(
        this._messageTypeMinContentLengths,
        other._messageTypeMinContentLengths,
      )
    );
  }

  hashCode(): number {
    return hashValues(
      this._strategy,
      this._messageTypeTtl,
      this._messageTypeMinContentLengths,
      this._multiBlockSystemCaching,
    );
  }

  toString(): string {
    return `AnthropicCacheOptions{strategy=${String(
      this._strategy,
    )}, contentLengthFunction=${String(
      this._contentLengthFunction,
    )}, messageTypeTtl=${mapToString(
      this._messageTypeTtl,
    )}, messageTypeMinContentLengths=${mapToString(
      this._messageTypeMinContentLengths,
    )}, multiBlockSystemCaching=${this._multiBlockSystemCaching}}`;
  }
}

function mapEquals<K, V>(left: Map<K, V>, right: Map<K, V>): boolean {
  if (left.size !== right.size) {
    return false;
  }
  for (const [key, value] of left) {
    if (!right.has(key) || right.get(key) !== value) {
      return false;
    }
  }
  return true;
}

function mapToString<K, V>(map: Map<K, V>): string {
  return `{${Array.from(map.entries())
    .map(([key, value]) => `${String(key)}=${String(value)}`)
    .join(", ")}}`;
}

function hashValues(...values: unknown[]): number {
  let hash = 17;
  for (const value of values) {
    hash = (hash * 31 + hashValue(value)) | 0;
  }
  return hash;
}

function hashValue(value: unknown): number {
  if (value == null) {
    return 0;
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value | 0 : 0;
  }
  if (typeof value === "string") {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash * 31 + value.charCodeAt(i)) | 0;
    }
    return hash;
  }
  if (value instanceof Map) {
    let hash = 1;
    for (const [key, entryValue] of value) {
      hash = (hash * 31 + hashValue(key)) | 0;
      hash = (hash * 31 + hashValue(entryValue)) | 0;
    }
    return hash;
  }
  return hashValue(String(value));
}
