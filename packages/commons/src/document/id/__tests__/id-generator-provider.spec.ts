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

import { JdkSha256HexIdGenerator } from "../index.js";

const UUID_V4_OR_V3_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function expectValidUuid(value: string): void {
  expect(UUID_V4_OR_V3_REGEX.test(value)).toBe(true);
}

describe("IdGeneratorProvider", () => {
  it("hashGeneratorGenerateSimilarIdsForSimilarContent", () => {
    const idGenerator1 = new JdkSha256HexIdGenerator();
    const idGenerator2 = new JdkSha256HexIdGenerator();

    const content = "Content";
    const metadata = { metadata: new Set(["META_DATA"]) };

    const actualHashes1 = idGenerator1.generateId(content, metadata);
    const actualHashes2 = idGenerator2.generateId(content, metadata);

    expect(actualHashes1).toBe(actualHashes2);
    expectValidUuid(actualHashes1);
    expectValidUuid(actualHashes2);
  });

  it("hashGeneratorGenerateDifferentIdsForDifferentContent", () => {
    const idGenerator1 = new JdkSha256HexIdGenerator();
    const idGenerator2 = new JdkSha256HexIdGenerator();

    const content1 = "Content";
    const metadata1 = { metadata: new Set(["META_DATA"]) };
    const content2 = `${content1} `;
    const metadata2 = metadata1;

    const actualHashes1 = idGenerator1.generateId(content1, metadata1);
    const actualHashes2 = idGenerator2.generateId(content2, metadata2);

    expect(actualHashes1).not.toBe(actualHashes2);
    expectValidUuid(actualHashes1);
    expectValidUuid(actualHashes2);
  });

  it("hashGeneratorGeneratesDifferentIdsForDifferentMetadata", () => {
    const idGenerator = new JdkSha256HexIdGenerator();

    const content = "Same content";
    const metadata1 = { key: "value1" };
    const metadata2 = { key: "value2" };

    const hash1 = idGenerator.generateId(content, metadata1);
    const hash2 = idGenerator.generateId(content, metadata2);

    expect(hash1).not.toBe(hash2);
  });

  it("hashGeneratorProducesValidSha256BasedUuid", () => {
    const idGenerator = new JdkSha256HexIdGenerator();
    const content = "Test content";
    const metadata = { key: "value" };

    const generatedId = idGenerator.generateId(content, metadata);

    expectValidUuid(generatedId);
    expect(generatedId).toHaveLength(36);
    expect(generatedId.charAt(8)).toBe("-");
    expect(generatedId.charAt(13)).toBe("-");
    expect(generatedId.charAt(18)).toBe("-");
    expect(generatedId.charAt(23)).toBe("-");
  });

  it("hashGeneratorConsistencyAcrossMultipleCalls", () => {
    const idGenerator = new JdkSha256HexIdGenerator();
    const content = "Consistency test";
    const metadata = { test: "consistency" };

    const id1 = idGenerator.generateId(content, metadata);
    const id2 = idGenerator.generateId(content, metadata);
    const id3 = idGenerator.generateId(content, metadata);

    expect(id1).toBe(id2);
    expect(id1).toBe(id3);
  });

  it("hashGeneratorMetadataOrderIndependence", () => {
    const idGenerator = new JdkSha256HexIdGenerator();
    const content = "Order test";

    const metadata1: Record<string, unknown> = {};
    metadata1.a = "value1";
    metadata1.b = "value2";
    metadata1.c = "value3";

    const metadata2: Record<string, unknown> = {};
    metadata2.c = "value3";
    metadata2.a = "value1";
    metadata2.b = "value2";

    const id1 = idGenerator.generateId(content, metadata1);
    const id2 = idGenerator.generateId(content, metadata2);

    expect(id1).toBe(id2);
  });

  it("hashGeneratorSensitiveToMinorChanges", () => {
    const idGenerator = new JdkSha256HexIdGenerator();
    const metadata = { key: "value" };

    const id1 = idGenerator.generateId("content", metadata);
    const id2 = idGenerator.generateId("Content", metadata);
    const id3 = idGenerator.generateId("content ", metadata);
    const id4 = idGenerator.generateId("content\n", metadata);

    expect(id1).not.toBe(id2);
    expect(id1).not.toBe(id3);
    expect(id1).not.toBe(id4);
    expect(id2).not.toBe(id3);
    expect(id2).not.toBe(id4);
    expect(id3).not.toBe(id4);
  });

  it("multipleGeneratorInstancesProduceSameResults", () => {
    const content = "Multi-instance test";
    const metadata = { instance: "test" };

    const generator1 = new JdkSha256HexIdGenerator();
    const generator2 = new JdkSha256HexIdGenerator();
    const generator3 = new JdkSha256HexIdGenerator();

    const id1 = generator1.generateId(content, metadata);
    const id2 = generator2.generateId(content, metadata);
    const id3 = generator3.generateId(content, metadata);

    expect(id1).toBe(id2);
    expect(id1).toBe(id3);
  });
});
