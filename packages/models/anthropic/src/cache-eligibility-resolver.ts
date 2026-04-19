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

import type { CacheControlEphemeral } from "@anthropic-ai/sdk/resources/messages";
import { LoggerFactory } from "@nestjs-ai/commons";
import { MessageType } from "@nestjs-ai/model";

import type { AnthropicCacheOptions } from "./anthropic-cache-options";
import { AnthropicCacheStrategy } from "./anthropic-cache-strategy";
import type { AnthropicCacheTtl } from "./anthropic-cache-ttl";
import { toSdkCacheTtl } from "./anthropic-cache-ttl";
import { CacheBreakpointTracker } from "./cache-breakpoint-tracker";

/**
 * Resolves cache eligibility for messages based on the provided
 * {@link AnthropicCacheOptions}. Returns SDK {@link CacheControlEphemeral}
 * instances instead of raw cache control records.
 */
export class CacheEligibilityResolver {
  private readonly logger = LoggerFactory.getLogger(
    CacheEligibilityResolver.name,
  );

  private static readonly TOOL_DEFINITION_MESSAGE_TYPE = MessageType.SYSTEM;

  private readonly cacheBreakpointTracker = new CacheBreakpointTracker();

  constructor(
    private readonly cacheStrategy: AnthropicCacheStrategy,
    private readonly messageTypeTtl: Map<MessageType, AnthropicCacheTtl>,
    private readonly messageTypeMinContentLengths: Map<MessageType, number>,
    private readonly contentLengthFunction: (content: string | null) => number,
    private readonly cacheEligibleMessageTypes: Set<MessageType>,
  ) {}

  static from(cacheOptions: AnthropicCacheOptions): CacheEligibilityResolver {
    const strategy = cacheOptions.strategy;
    return new CacheEligibilityResolver(
      strategy,
      cacheOptions.messageTypeTtl,
      cacheOptions.messageTypeMinContentLengths,
      cacheOptions.contentLengthFunction,
      extractEligibleMessageTypes(strategy),
    );
  }

  resolve(
    messageType: MessageType,
    content: string | null,
  ): CacheControlEphemeral | null {
    const length = this.contentLengthFunction(content);
    const minLength = this.messageTypeMinContentLengths.get(messageType);
    assert(
      minLength != null,
      "The minimum content length of the message type must be defined",
    );

    if (
      this.cacheStrategy === AnthropicCacheStrategy.NONE ||
      !this.cacheEligibleMessageTypes.has(messageType) ||
      length < minLength ||
      this.cacheBreakpointTracker.allBreakpointsAreUsed()
    ) {
      this.logger.debug(
        `Caching not enabled for messageType=${messageType}, contentLength=${length}, minContentLength=${minLength}, cacheStrategy=${this.cacheStrategy}, usedBreakpoints=${this.cacheBreakpointTracker.getCount()}`,
      );
      return null;
    }

    const cacheTtl = this.messageTypeTtl.get(messageType);
    assert(
      cacheTtl != null,
      "The message type ttl of the message type must be defined",
    );

    this.logger.debug(
      `Caching enabled for messageType=${messageType}, ttl=${cacheTtl}`,
    );

    return {
      type: "ephemeral",
      ttl: toSdkCacheTtl(cacheTtl),
    };
  }

  resolveToolCacheControl(): CacheControlEphemeral | null {
    if (
      this.cacheStrategy !== AnthropicCacheStrategy.TOOLS_ONLY &&
      this.cacheStrategy !== AnthropicCacheStrategy.SYSTEM_AND_TOOLS &&
      this.cacheStrategy !== AnthropicCacheStrategy.CONVERSATION_HISTORY
    ) {
      this.logger.debug(
        `Caching not enabled for tool definition, cacheStrategy=${this.cacheStrategy}`,
      );
      return null;
    }

    if (this.cacheBreakpointTracker.allBreakpointsAreUsed()) {
      this.logger.debug(
        `Caching not enabled for tool definition, usedBreakpoints=${this.cacheBreakpointTracker.getCount()}`,
      );
      return null;
    }

    const cacheTtl = this.messageTypeTtl.get(
      CacheEligibilityResolver.TOOL_DEFINITION_MESSAGE_TYPE,
    );
    assert(cacheTtl != null, "messageTypeTtl must contain a 'system' entry");

    this.logger.debug(`Caching enabled for tool definition, ttl=${cacheTtl}`);

    return {
      type: "ephemeral",
      ttl: toSdkCacheTtl(cacheTtl),
    };
  }

  isCachingEnabled(): boolean {
    return this.cacheStrategy !== AnthropicCacheStrategy.NONE;
  }

  useCacheBlock(): void {
    this.cacheBreakpointTracker.use();
  }
}

function extractEligibleMessageTypes(
  strategy: AnthropicCacheStrategy,
): Set<MessageType> {
  switch (strategy) {
    case AnthropicCacheStrategy.NONE:
      return new Set();
    case AnthropicCacheStrategy.SYSTEM_ONLY:
    case AnthropicCacheStrategy.SYSTEM_AND_TOOLS:
      return new Set([MessageType.SYSTEM]);
    case AnthropicCacheStrategy.TOOLS_ONLY:
      return new Set();
    case AnthropicCacheStrategy.CONVERSATION_HISTORY:
      return new Set(MessageType.values());
  }
}
