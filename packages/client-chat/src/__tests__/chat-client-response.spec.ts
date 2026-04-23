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

import type { ChatResponse } from "@nestjs-ai/model";
import { describe, expect, it } from "vitest";
import { ChatClientResponse } from "../chat-client-response.js";

describe("ChatClientResponse", () => {
  it("when context is null then throw", () => {
    expect(() => new ChatClientResponse(null, null as never)).toThrowError(
      "context cannot be null",
    );

    expect(() =>
      ChatClientResponse.builder()
        .chatResponse(null)
        .context(null as never)
        .build(),
    ).toThrowError("context cannot be null");
  });

  it("when context has null keys then throw", () => {
    const context = new Map<string, unknown>();
    context.set(null as unknown as string, "something");

    expect(() => new ChatClientResponse(null, context)).toThrowError(
      "context keys cannot be null",
    );
  });

  it("when copy then immutable context", () => {
    const context = new Map<string, unknown>([["key", "value"]]);
    const response = ChatClientResponse.builder()
      .chatResponse(null)
      .context(context)
      .build();

    const copy = response.copy();
    const mutableCopyContext = copy.context;
    mutableCopyContext.set("key2", "value2");
    expect(response.context.has("key2")).toBe(false);
    expect(copy.context.has("key2")).toBe(false);

    mutableCopyContext.set("key", "newValue");
    expect(copy.context.get("key")).toBe("value");
    expect(response.context.get("key")).toBe("value");
  });

  it("when mutate then immutable context", () => {
    const context = new Map<string, unknown>([["key", "value"]]);
    const response = ChatClientResponse.builder()
      .chatResponse(null)
      .context(context)
      .build();

    const copy = response
      .mutate()
      .context(new Map<string, unknown>([["key2", "value2"]]))
      .build();

    expect(response.context.has("key2")).toBe(false);
    expect(copy.context.has("key2")).toBe(true);

    const mutableCopyContext = copy.context;
    mutableCopyContext.set("key", "newValue");
    expect(copy.context.get("key")).toBe("value");
    expect(response.context.get("key")).toBe("value");
  });

  it("when valid chat response then create successfully", () => {
    const chatResponse = {} as ChatResponse;
    const context = new Map<string, unknown>([["key", "value"]]);

    const response = new ChatClientResponse(chatResponse, context);

    expect(response.chatResponse).toBe(chatResponse);
    expect(response.context).toEqual(context);
  });

  it("when builder with valid data then create successfully", () => {
    const chatResponse = {} as ChatResponse;
    const context = new Map<string, unknown>([
      ["key1", "value1"],
      ["key2", 42],
    ]);

    const response = ChatClientResponse.builder()
      .chatResponse(chatResponse)
      .context(context)
      .build();

    expect(response.chatResponse).toBe(chatResponse);
    expect(response.context).toEqual(context);
  });

  it("when empty context then create successfully", () => {
    const chatResponse = {} as ChatResponse;
    const emptyContext = new Map<string, unknown>();

    const response = new ChatClientResponse(chatResponse, emptyContext);

    expect(response.chatResponse).toBe(chatResponse);
    expect(response.context.size).toBe(0);
  });

  it("when context with null values then create successfully", () => {
    const chatResponse = {} as ChatResponse;
    const context = new Map<string, unknown>([
      ["key1", "value1"],
      ["key2", null],
    ]);

    const response = new ChatClientResponse(chatResponse, context);

    expect(response.context.get("key1")).toBe("value1");
    expect(response.context.get("key2")).toBeNull();
  });

  it("when copy with null chat response then preserve null", () => {
    const context = new Map<string, unknown>([["key", "value"]]);
    const response = new ChatClientResponse(null, context);

    const copy = response.copy();

    expect(copy.chatResponse).toBeNull();
    expect(copy.context).toEqual(context);
  });

  it("when mutate with new chat response then update", () => {
    const originalResponse = {} as ChatResponse;
    const newResponse = {} as ChatResponse;
    const context = new Map<string, unknown>([["key", "value"]]);

    const response = new ChatClientResponse(originalResponse, context);
    const mutated = response.mutate().chatResponse(newResponse).build();

    expect(response.chatResponse).toBe(originalResponse);
    expect(mutated.chatResponse).toBe(newResponse);
    expect(mutated.context).toEqual(context);
  });

  it("when builder without chat response then create with null", () => {
    const context = new Map<string, unknown>([["key", "value"]]);

    const response = ChatClientResponse.builder().context(context).build();

    expect(response.chatResponse).toBeNull();
  });

  it("when complex objects in context then preserve correctly", () => {
    const chatResponse = {} as ChatResponse;
    const generation = { id: "gen" };
    const nestedMap = new Map<string, unknown>([["nested", "value"]]);

    const context = new Map<string, unknown>([
      ["string", "value"],
      ["number", 1],
      ["boolean", true],
      ["generation", generation],
      ["map", nestedMap],
    ]);

    const response = new ChatClientResponse(chatResponse, context);

    expect(response.context.get("string")).toBe("value");
    expect(response.context.get("number")).toBe(1);
    expect(response.context.get("boolean")).toBe(true);
    expect(response.context.get("generation")).toBe(generation);
    expect(response.context.get("map")).toBe(nestedMap);
  });
});
