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
import { describe, expect, it } from "vitest";

import {
  AnthropicCacheOptions,
  AnthropicCacheStrategy,
  AnthropicCacheTtl,
} from "../index";

describe("AnthropicCacheOptions", () => {
  it("defaults are sane", () => {
    const options = new AnthropicCacheOptions();

    expect(options.strategy).toBe(AnthropicCacheStrategy.NONE);
    expect(options.messageTypeTtl.get(MessageType.SYSTEM)).toBe(
      AnthropicCacheTtl.FIVE_MINUTES,
    );
    expect(options.messageTypeMinContentLengths.get(MessageType.SYSTEM)).toBe(
      1,
    );
    expect(options.contentLengthFunction("hello")).toBe(5);
    expect(options.contentLengthFunction(null)).toBe(0);
  });

  it("builder overrides", () => {
    const options = new AnthropicCacheOptions({
      strategy: AnthropicCacheStrategy.SYSTEM_AND_TOOLS,
      messageTypeTtl: new Map([
        [MessageType.SYSTEM, AnthropicCacheTtl.ONE_HOUR],
      ]),
      messageTypeMinContentLengths: new Map([[MessageType.SYSTEM, 100]]),
      contentLengthFunction: (content) =>
        content != null ? content.length * 2 : 0,
    });

    expect(options.strategy).toBe(AnthropicCacheStrategy.SYSTEM_AND_TOOLS);
    expect(options.messageTypeTtl.get(MessageType.SYSTEM)).toBe(
      AnthropicCacheTtl.ONE_HOUR,
    );
    expect(options.messageTypeMinContentLengths.get(MessageType.SYSTEM)).toBe(
      100,
    );
    expect(options.contentLengthFunction("test")).toBe(8);
  });

  it("multi-block system caching defaults to false", () => {
    const options = new AnthropicCacheOptions();
    expect(options.multiBlockSystemCaching).toBe(false);
  });

  it("multi-block system caching builder override", () => {
    const options = new AnthropicCacheOptions({
      multiBlockSystemCaching: true,
    });
    expect(options.multiBlockSystemCaching).toBe(true);
  });

  it("disabled singleton has none strategy", () => {
    expect(AnthropicCacheOptions.disabled().strategy).toBe(
      AnthropicCacheStrategy.NONE,
    );
  });
});
