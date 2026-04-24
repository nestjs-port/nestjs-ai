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
import { assert, describe, expect, it } from "vitest";

import {
  AnthropicCacheOptions,
  AnthropicCacheStrategy,
  AnthropicCacheTtl,
  CacheEligibilityResolver,
} from "../index.js";

describe("CacheEligibilityResolver", () => {
  it("no caching when strategy is none", () => {
    const options = new AnthropicCacheOptions({
      strategy: AnthropicCacheStrategy.NONE,
    });
    const resolver = CacheEligibilityResolver.from(options);

    expect(resolver.isCachingEnabled()).toBe(false);
    expect(resolver.resolve(MessageType.SYSTEM, "some text")).toBeNull();
    expect(resolver.resolveToolCacheControl()).toBeNull();
  });

  it("system caching respects min length", () => {
    const options = new AnthropicCacheOptions();
    options.setStrategy(AnthropicCacheStrategy.SYSTEM_ONLY);
    options.messageTypeMinContentLengths.set(MessageType.SYSTEM, 10);
    const resolver = CacheEligibilityResolver.from(options);

    // Below min length -> no cache
    expect(resolver.resolve(MessageType.SYSTEM, "short")).toBeNull();

    // Above min length -> cache control with default TTL
    const cc = resolver.resolve(MessageType.SYSTEM, "01234567890");
    assert.exists(cc);
    expect(cc?.ttl).toBe("5m");
  });

  it("empty text should not be cached even if min is zero", () => {
    const options = new AnthropicCacheOptions();
    options.setStrategy(AnthropicCacheStrategy.SYSTEM_ONLY);
    const resolver = CacheEligibilityResolver.from(options);

    expect(resolver.resolve(MessageType.SYSTEM, "")).toBeNull();
    expect(resolver.resolve(MessageType.SYSTEM, null)).toBeNull();
  });

  it("tool cache control respects strategy", () => {
    // NONE -> no tool caching
    const none = CacheEligibilityResolver.from(
      new AnthropicCacheOptions({
        strategy: AnthropicCacheStrategy.NONE,
      }),
    );
    expect(none.resolveToolCacheControl()).toBeNull();

    // SYSTEM_ONLY -> no explicit tool caching
    const sysOptions = new AnthropicCacheOptions();
    sysOptions.setStrategy(AnthropicCacheStrategy.SYSTEM_ONLY);
    sysOptions.messageTypeTtl.set(
      MessageType.SYSTEM,
      AnthropicCacheTtl.ONE_HOUR,
    );
    const sys = CacheEligibilityResolver.from(sysOptions);
    expect(sys.resolveToolCacheControl()).toBeNull();

    // TOOLS_ONLY -> tool caching enabled, system messages NOT cached
    const toolsOnlyOptions = new AnthropicCacheOptions();
    toolsOnlyOptions.setStrategy(AnthropicCacheStrategy.TOOLS_ONLY);
    toolsOnlyOptions.messageTypeTtl.set(
      MessageType.SYSTEM,
      AnthropicCacheTtl.ONE_HOUR,
    );
    const toolsOnly = CacheEligibilityResolver.from(toolsOnlyOptions);
    assert.exists(toolsOnly.resolveToolCacheControl());
    expect(
      toolsOnly.resolve(MessageType.SYSTEM, "Large system prompt text"),
    ).toBeNull();

    // SYSTEM_AND_TOOLS -> tool caching enabled (uses SYSTEM TTL)
    const sysAndToolsOptions = new AnthropicCacheOptions();
    sysAndToolsOptions.setStrategy(AnthropicCacheStrategy.SYSTEM_AND_TOOLS);
    sysAndToolsOptions.messageTypeTtl.set(
      MessageType.SYSTEM,
      AnthropicCacheTtl.ONE_HOUR,
    );
    const sysAndTools = CacheEligibilityResolver.from(sysAndToolsOptions);
    const cc = sysAndTools.resolveToolCacheControl();
    assert.exists(cc);
    expect(cc?.ttl).toBe("1h");

    // CONVERSATION_HISTORY -> tool caching enabled
    const history = CacheEligibilityResolver.from(
      new AnthropicCacheOptions({
        strategy: AnthropicCacheStrategy.CONVERSATION_HISTORY,
      }),
    );
    assert.exists(history.resolveToolCacheControl());
  });

  it("tools only strategy behavior", () => {
    const options = new AnthropicCacheOptions();
    options.setStrategy(AnthropicCacheStrategy.TOOLS_ONLY);
    const resolver = CacheEligibilityResolver.from(options);

    expect(resolver.isCachingEnabled()).toBe(true);
    expect(
      resolver.resolve(
        MessageType.SYSTEM,
        "Large system prompt with plenty of content",
      ),
    ).toBeNull();
    expect(
      resolver.resolve(MessageType.USER, "User message content"),
    ).toBeNull();
    expect(
      resolver.resolve(MessageType.ASSISTANT, "Assistant message content"),
    ).toBeNull();
    expect(
      resolver.resolve(MessageType.TOOL, "Tool result content"),
    ).toBeNull();

    const toolCache = resolver.resolveToolCacheControl();
    assert.exists(toolCache);
  });

  it("breakpoint count for each strategy", () => {
    // NONE: 0 breakpoints
    const none = CacheEligibilityResolver.from(
      new AnthropicCacheOptions({
        strategy: AnthropicCacheStrategy.NONE,
      }),
    );
    expect(none.resolveToolCacheControl()).toBeNull();
    expect(none.resolve(MessageType.SYSTEM, "content")).toBeNull();

    // SYSTEM_ONLY: system cached, tools not explicitly cached
    const systemOnly = CacheEligibilityResolver.from(
      new AnthropicCacheOptions({
        strategy: AnthropicCacheStrategy.SYSTEM_ONLY,
      }),
    );
    expect(systemOnly.resolveToolCacheControl()).toBeNull();
    assert.exists(systemOnly.resolve(MessageType.SYSTEM, "content"));

    // TOOLS_ONLY: tools cached, system not cached
    const toolsOnly = CacheEligibilityResolver.from(
      new AnthropicCacheOptions({
        strategy: AnthropicCacheStrategy.TOOLS_ONLY,
      }),
    );
    assert.exists(toolsOnly.resolveToolCacheControl());
    expect(toolsOnly.resolve(MessageType.SYSTEM, "content")).toBeNull();

    // SYSTEM_AND_TOOLS: both cached
    const systemAndTools = CacheEligibilityResolver.from(
      new AnthropicCacheOptions({
        strategy: AnthropicCacheStrategy.SYSTEM_AND_TOOLS,
      }),
    );
    assert.exists(systemAndTools.resolveToolCacheControl());
    assert.exists(systemAndTools.resolve(MessageType.SYSTEM, "content"));
  });

  it("message type eligibility per strategy", () => {
    // NONE: No message types eligible
    const none = CacheEligibilityResolver.from(
      new AnthropicCacheOptions({
        strategy: AnthropicCacheStrategy.NONE,
      }),
    );
    expect(none.resolve(MessageType.SYSTEM, "content")).toBeNull();
    expect(none.resolve(MessageType.USER, "content")).toBeNull();
    expect(none.resolve(MessageType.ASSISTANT, "content")).toBeNull();
    expect(none.resolve(MessageType.TOOL, "content")).toBeNull();

    // SYSTEM_ONLY: Only SYSTEM eligible
    const systemOnly = CacheEligibilityResolver.from(
      new AnthropicCacheOptions({
        strategy: AnthropicCacheStrategy.SYSTEM_ONLY,
      }),
    );
    assert.exists(systemOnly.resolve(MessageType.SYSTEM, "content"));
    expect(systemOnly.resolve(MessageType.USER, "content")).toBeNull();
    expect(systemOnly.resolve(MessageType.ASSISTANT, "content")).toBeNull();
    expect(systemOnly.resolve(MessageType.TOOL, "content")).toBeNull();

    // TOOLS_ONLY: No message types eligible
    const toolsOnly = CacheEligibilityResolver.from(
      new AnthropicCacheOptions({
        strategy: AnthropicCacheStrategy.TOOLS_ONLY,
      }),
    );
    expect(toolsOnly.resolve(MessageType.SYSTEM, "content")).toBeNull();
    expect(toolsOnly.resolve(MessageType.USER, "content")).toBeNull();
    expect(toolsOnly.resolve(MessageType.ASSISTANT, "content")).toBeNull();
    expect(toolsOnly.resolve(MessageType.TOOL, "content")).toBeNull();

    // SYSTEM_AND_TOOLS: Only SYSTEM eligible
    const systemAndTools = CacheEligibilityResolver.from(
      new AnthropicCacheOptions({
        strategy: AnthropicCacheStrategy.SYSTEM_AND_TOOLS,
      }),
    );
    assert.exists(systemAndTools.resolve(MessageType.SYSTEM, "content"));
    expect(systemAndTools.resolve(MessageType.USER, "content")).toBeNull();
    expect(systemAndTools.resolve(MessageType.ASSISTANT, "content")).toBeNull();
    expect(systemAndTools.resolve(MessageType.TOOL, "content")).toBeNull();

    // CONVERSATION_HISTORY: All message types eligible
    const history = CacheEligibilityResolver.from(
      new AnthropicCacheOptions({
        strategy: AnthropicCacheStrategy.CONVERSATION_HISTORY,
      }),
    );
    assert.exists(history.resolve(MessageType.SYSTEM, "content"));
    assert.exists(history.resolve(MessageType.USER, "content"));
    assert.exists(history.resolve(MessageType.ASSISTANT, "content"));
    assert.exists(history.resolve(MessageType.TOOL, "content"));
  });

  it("system and tools independent breakpoints", () => {
    const resolver = CacheEligibilityResolver.from(
      new AnthropicCacheOptions({
        strategy: AnthropicCacheStrategy.SYSTEM_AND_TOOLS,
      }),
    );

    const toolCache = resolver.resolveToolCacheControl();
    const systemCache = resolver.resolve(MessageType.SYSTEM, "content");

    assert.exists(toolCache);
    assert.exists(systemCache);
    expect(toolCache?.ttl).toBe(systemCache?.ttl);
  });

  it("breakpoint limit enforced", () => {
    const options = new AnthropicCacheOptions({
      strategy: AnthropicCacheStrategy.CONVERSATION_HISTORY,
    });
    const resolver = CacheEligibilityResolver.from(options);

    // Use up breakpoints
    resolver.resolve(MessageType.SYSTEM, "content");
    resolver.useCacheBlock();
    resolver.resolve(MessageType.USER, "content");
    resolver.useCacheBlock();
    resolver.resolve(MessageType.ASSISTANT, "content");
    resolver.useCacheBlock();
    resolver.resolve(MessageType.TOOL, "content");
    resolver.useCacheBlock();

    // 5th attempt should return null
    expect(resolver.resolve(MessageType.USER, "more content")).toBeNull();
  });

  it("empty and null content handling", () => {
    const resolver = CacheEligibilityResolver.from(
      new AnthropicCacheOptions({
        strategy: AnthropicCacheStrategy.CONVERSATION_HISTORY,
      }),
    );

    expect(resolver.resolve(MessageType.SYSTEM, "")).toBeNull();
    expect(resolver.resolve(MessageType.SYSTEM, null)).toBeNull();
    assert.exists(resolver.resolve(MessageType.SYSTEM, "   "));
  });

  it("one hour ttl returned for configured message type", () => {
    const options = new AnthropicCacheOptions();
    options.setStrategy(AnthropicCacheStrategy.SYSTEM_ONLY);
    options.messageTypeTtl.set(MessageType.SYSTEM, AnthropicCacheTtl.ONE_HOUR);
    const resolver = CacheEligibilityResolver.from(options);

    const cc = resolver.resolve(MessageType.SYSTEM, "enough content");
    assert.exists(cc);
    expect(cc?.ttl).toBe("1h");
  });
});
