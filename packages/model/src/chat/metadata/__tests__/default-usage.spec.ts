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

import { describe, expect, it } from "vitest";
import { DefaultUsage } from "../default-usage";

describe("DefaultUsage", () => {
  it("test serialization with all fields", () => {
    const usage = new DefaultUsage({
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
    });
    const json = JSON.stringify(usage.toJSON());
    expect(json).toBe(
      '{"promptTokens":100,"completionTokens":50,"totalTokens":150,"nativeUsage":null}',
    );
  });

  it("test deserialization with all fields", () => {
    const json = '{"promptTokens":100,"completionTokens":50,"totalTokens":150}';
    const usage = new DefaultUsage(JSON.parse(json));
    expect(usage.promptTokens).toBe(100);
    expect(usage.completionTokens).toBe(50);
    expect(usage.totalTokens).toBe(150);
  });

  it("test serialization with null fields", () => {
    const usage = new DefaultUsage({});
    const json = JSON.stringify(usage.toJSON());
    expect(json).toBe(
      '{"promptTokens":0,"completionTokens":0,"totalTokens":0,"nativeUsage":null}',
    );
  });

  it("test deserialization with missing fields", () => {
    const json = '{"promptTokens":100}';
    const usage = new DefaultUsage(JSON.parse(json));
    expect(usage.promptTokens).toBe(100);
    expect(usage.completionTokens).toBe(0);
    expect(usage.totalTokens).toBe(100);
  });

  it("test deserialization with null fields", () => {
    const json =
      '{"promptTokens":null,"completionTokens":null,"totalTokens":null}';
    const usage = new DefaultUsage(JSON.parse(json));
    expect(usage.promptTokens).toBe(0);
    expect(usage.completionTokens).toBe(0);
    expect(usage.totalTokens).toBe(0);
  });

  it("test round trip serialization", () => {
    const original = new DefaultUsage({
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
    });
    const json = JSON.stringify(original.toJSON());
    const deserialized = new DefaultUsage(JSON.parse(json));
    expect(deserialized.promptTokens).toBe(original.promptTokens);
    expect(deserialized.completionTokens).toBe(original.completionTokens);
    expect(deserialized.totalTokens).toBe(original.totalTokens);
  });

  it("test two argument constructor and serialization", () => {
    const usage = new DefaultUsage({ promptTokens: 100, completionTokens: 50 });

    // Test that the fields are set correctly
    expect(usage.promptTokens).toBe(100);
    expect(usage.completionTokens).toBe(50);
    expect(usage.totalTokens).toBe(150); // 100 + 50 = 150

    // Test serialization
    const json = JSON.stringify(usage.toJSON());
    expect(json).toBe(
      '{"promptTokens":100,"completionTokens":50,"totalTokens":150,"nativeUsage":null}',
    );

    // Test deserialization
    const deserializedUsage = new DefaultUsage(JSON.parse(json));
    expect(deserializedUsage.promptTokens).toBe(100);
    expect(deserializedUsage.completionTokens).toBe(50);
    expect(deserializedUsage.totalTokens).toBe(150);
  });

  it("test two argument constructor with null values", () => {
    const usage = new DefaultUsage({});

    // Test that null values are converted to 0
    expect(usage.promptTokens).toBe(0);
    expect(usage.completionTokens).toBe(0);
    expect(usage.totalTokens).toBe(0);

    // Test serialization
    const json = JSON.stringify(usage.toJSON());
    expect(json).toBe(
      '{"promptTokens":0,"completionTokens":0,"totalTokens":0,"nativeUsage":null}',
    );

    // Test deserialization
    const deserializedUsage = new DefaultUsage(JSON.parse(json));
    expect(deserializedUsage.promptTokens).toBe(0);
    expect(deserializedUsage.completionTokens).toBe(0);
    expect(deserializedUsage.totalTokens).toBe(0);
  });

  it("test deserialization with different property order", () => {
    const json = '{"totalTokens":150,"completionTokens":50,"promptTokens":100}';
    const usage = new DefaultUsage(JSON.parse(json));
    expect(usage.promptTokens).toBe(100);
    expect(usage.completionTokens).toBe(50);
    expect(usage.totalTokens).toBe(150);
  });

  it("test serialization with custom native usage", () => {
    const customNativeUsage = {
      custom_field: "custom_value",
      custom_number: 42,
    };

    const usage = new DefaultUsage({
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      nativeUsage: customNativeUsage,
    });
    const json = JSON.stringify(usage.toJSON());
    expect(json).toContain('"promptTokens":100');
    expect(json).toContain('"completionTokens":50');
    expect(json).toContain('"totalTokens":150');
    expect(json).toContain('"nativeUsage"');
  });

  it("test deserialization with custom native usage", () => {
    const json =
      '{"promptTokens":100,"completionTokens":50,"totalTokens":150,"nativeUsage":{"custom_field":"custom_value","custom_number":42}}';
    const usage = new DefaultUsage(JSON.parse(json));
    expect(usage.promptTokens).toBe(100);
    expect(usage.completionTokens).toBe(50);
    expect(usage.totalTokens).toBe(150);

    const nativeUsage = usage.nativeUsage as Record<string, unknown>;
    expect(nativeUsage.custom_field).toBe("custom_value");
    expect(nativeUsage.custom_number).toBe(42);
  });

  it("test arbitrary native usage map", () => {
    const arbitraryMap = {
      field1: "value1",
      field2: 42,
      field3: true,
      field4: [1, 2, 3],
      field5: { nested: "value" },
    };

    const usage = new DefaultUsage({
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      nativeUsage: arbitraryMap,
    });

    const json = JSON.stringify(usage.toJSON());
    const deserialized = new DefaultUsage(JSON.parse(json));

    expect(deserialized.promptTokens).toBe(usage.promptTokens);
    expect(deserialized.completionTokens).toBe(usage.completionTokens);
    expect(deserialized.totalTokens).toBe(usage.totalTokens);
    expect(deserialized.completionTokens).toBe(usage.completionTokens);

    const deserializedMap = deserialized.nativeUsage as Record<string, unknown>;
    expect(deserializedMap.field1).toBe("value1");
    expect(deserializedMap.field2).toBe(42);
    expect(deserializedMap.field3).toBe(true);
    expect(deserializedMap.field4).toEqual([1, 2, 3]);
    expect(deserializedMap.field5).toEqual({ nested: "value" });
  });

  it("test equals and hash code", () => {
    const usage1 = new DefaultUsage({
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
    });
    const usage2 = new DefaultUsage({
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
    });
    const usage3 = new DefaultUsage({
      promptTokens: 200,
      completionTokens: 100,
      totalTokens: 300,
    });
    const _usage4 = new DefaultUsage({
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      nativeUsage: { custom: "value" },
    });

    // Test equals
    expect(usage1.promptTokens).toBe(usage2.promptTokens);
    expect(usage1.completionTokens).toBe(usage2.completionTokens);
    expect(usage1.totalTokens).toBe(usage2.totalTokens);
    expect(usage1.promptTokens).not.toBe(usage3.promptTokens);
    expect(usage1.totalTokens).not.toBe(usage3.totalTokens);

    // Test with different nativeUsage
    const usage5 = new DefaultUsage({
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      nativeUsage: { key: "value" },
    });
    const usage6 = new DefaultUsage({
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      nativeUsage: { key: "value" },
    });
    expect(usage5.promptTokens).toBe(usage6.promptTokens);
    expect(usage5.completionTokens).toBe(usage6.completionTokens);
    expect(usage5.totalTokens).toBe(usage6.totalTokens);
  });

  it("test to string", () => {
    const usage = new DefaultUsage({
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
    });
    const stringValue = String(usage);
    expect(stringValue).toBeDefined();

    // Test with custom nativeUsage
    const usageWithNative = new DefaultUsage({
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      nativeUsage: { custom: "value" },
    });
    expect(String(usageWithNative)).toBeDefined();

    // Test with null values
    const usageWithNulls = new DefaultUsage({});
    expect(String(usageWithNulls)).toBeDefined();
  });

  it("test negative token values", () => {
    const usage = new DefaultUsage({
      promptTokens: -1,
      completionTokens: -2,
      totalTokens: -3,
    });
    expect(usage.promptTokens).toBe(-1);
    expect(usage.completionTokens).toBe(-2);
    expect(usage.totalTokens).toBe(-3);

    const json = JSON.stringify(usage.toJSON());
    expect(json).toBe(
      '{"promptTokens":-1,"completionTokens":-2,"totalTokens":-3,"nativeUsage":null}',
    );
  });

  it("test calculated total tokens", () => {
    // Test when total tokens is null and should be calculated
    const usage = new DefaultUsage({ promptTokens: 100, completionTokens: 50 });
    expect(usage.totalTokens).toBe(150); // Should be sum of prompt and completion tokens

    // Test that explicit total tokens takes precedence over calculated
    const usageWithExplicitTotal = new DefaultUsage({
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 200,
    });
    expect(usageWithExplicitTotal.totalTokens).toBe(200); // Should use explicit value
  });
});
