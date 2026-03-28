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

import { Prompt } from "@nestjs-ai/model";
import { describe, expect, it } from "vitest";
import { ChatClientRequest } from "../chat-client-request";

describe("ChatClientRequest", () => {
  it("when prompt is null then throw", () => {
    expect(
      () => new ChatClientRequest(null as unknown as Prompt, new Map()),
    ).toThrow("prompt cannot be null");

    expect(() =>
      ChatClientRequest.builder()
        .prompt(null as unknown as Prompt)
        .context(new Map())
        .build(),
    ).toThrow("prompt cannot be null");
  });

  it("when context is null then throw", () => {
    expect(
      () => new ChatClientRequest(new Prompt("test"), null as never),
    ).toThrow("context cannot be null");

    expect(() =>
      ChatClientRequest.builder()
        .prompt(new Prompt("test"))
        .context(null as never)
        .build(),
    ).toThrow("context cannot be null");
  });

  it("when context has null keys then throw", () => {
    const context = new Map<string, unknown>();
    context.set(null as unknown as string, "something");

    expect(() => new ChatClientRequest(new Prompt("test"), context)).toThrow(
      "context keys cannot be null",
    );
  });

  it("when copy then immutable context", () => {
    const context = new Map<string, unknown>([["key", "value"]]);
    const request = ChatClientRequest.builder()
      .prompt(new Prompt("test"))
      .context(context)
      .build();

    const copy = request.copy();
    copy.context.set("key", "newValue");

    expect(request.context).toEqual(new Map([["key", "value"]]));
  });

  it("when mutate then immutable context", () => {
    const context = new Map<string, unknown>([["key", "value"]]);
    const request = ChatClientRequest.builder()
      .prompt(new Prompt("test"))
      .context(context)
      .build();

    const copy = request.mutate().context("key", "newValue").build();

    expect(request.context).toEqual(new Map([["key", "value"]]));
    expect(copy.context).toEqual(new Map([["key", "newValue"]]));
  });

  it("when builder with multiple context entries then success", () => {
    const prompt = new Prompt("test message");
    const context = new Map<string, unknown>([
      ["key1", "value1"],
      ["key2", 42],
      ["key3", true],
      ["key4", { nested: "value" }],
    ]);

    const request = ChatClientRequest.builder()
      .prompt(prompt)
      .context(context)
      .build();

    expect(request.context.size).toBe(4);
    expect(request.context.get("key1")).toBe("value1");
    expect(request.context.get("key2")).toBe(42);
    expect(request.context.get("key3")).toBe(true);
    expect(request.context.get("key4")).toEqual({ nested: "value" });
  });

  it("when mutate with new context keys then merged", () => {
    const prompt = new Prompt("test message");
    const original = ChatClientRequest.builder()
      .prompt(prompt)
      .context(new Map([["existing", "value"]]))
      .build();

    const mutated = original
      .mutate()
      .context("new1", "newValue1")
      .context("new2", "newValue2")
      .build();

    expect(original.context.size).toBe(1);
    expect(mutated.context.size).toBe(3);
    expect(mutated.context.get("existing")).toBe("value");
    expect(mutated.context.get("new1")).toBe("newValue1");
    expect(mutated.context.get("new2")).toBe("newValue2");
  });

  it("when mutate with overriding context keys then overridden", () => {
    const prompt = new Prompt("test message");
    const original = ChatClientRequest.builder()
      .prompt(prompt)
      .context(
        new Map<string, unknown>([
          ["key", "originalValue"],
          ["other", "untouched"],
        ]),
      )
      .build();

    const mutated = original.mutate().context("key", "newValue").build();

    expect(original.context.get("key")).toBe("originalValue");
    expect(mutated.context.get("key")).toBe("newValue");
    expect(mutated.context.get("other")).toBe("untouched");
  });

  it("when mutate prompt then prompt changed", () => {
    const originalPrompt = new Prompt("original message");
    const newPrompt = new Prompt("new message");

    const original = ChatClientRequest.builder()
      .prompt(originalPrompt)
      .context(new Map([["key", "value"]]))
      .build();

    const mutated = original.mutate().prompt(newPrompt).build();

    expect(original.prompt).toBe(originalPrompt);
    expect(mutated.prompt).toBe(newPrompt);
    expect(mutated.context).toEqual(original.context);
  });

  it("when mutate context with map then merged", () => {
    const prompt = new Prompt("test message");
    const original = ChatClientRequest.builder()
      .prompt(prompt)
      .context(new Map([["existing", "value"]]))
      .build();

    const newContext = new Map<string, unknown>([
      ["new1", "value1"],
      ["new2", "value2"],
    ]);
    const mutated = original.mutate().context(newContext).build();

    expect(mutated.context.size).toBe(3);
    expect(mutated.context.get("existing")).toBe("value");
    expect(mutated.context.get("new1")).toBe("value1");
    expect(mutated.context.get("new2")).toBe("value2");
  });

  it("when context contains complex objects then preserved", () => {
    const prompt = new Prompt("test message");
    const nestedMap = new Map([["nested", "value"]]);
    const list = ["item1", "item2"];

    const request = ChatClientRequest.builder()
      .prompt(prompt)
      .context(
        new Map<string, unknown>([
          ["map", nestedMap],
          ["list", list],
          ["string", "value"],
          ["number", 123],
          ["boolean", true],
        ]),
      )
      .build();

    expect(request.context.get("map")).toBe(nestedMap);
    expect(request.context.get("list")).toBe(list);
    expect(request.context.get("string")).toBe("value");
    expect(request.context.get("number")).toBe(123);
    expect(request.context.get("boolean")).toBe(true);
  });
});
