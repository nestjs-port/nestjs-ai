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

import { JdkSha256HexIdGenerator } from "../jdk-sha256-hex-id-generator";

type DigestAccessor = {
  getMessageDigest(input: Uint8Array): Buffer;
};

describe("JdkSha256HexIdGeneratorTest", () => {
  const testee = new JdkSha256HexIdGenerator();
  const accessor = testee as unknown as DigestAccessor;
  const charset: BufferEncoding = "utf8";

  it("message digest returns distinct instances", () => {
    const input = Buffer.from("same_input", charset);

    const md1 = accessor.getMessageDigest(input);
    const md2 = accessor.getMessageDigest(input);

    expect(md1).not.toBe(md2);
    expect(md1.length).toBe(md2.length);
    expect(md1.toString("hex")).toBe(md2.toString("hex"));
  });

  it("message digest returns instances with independent and reproducible digests", () => {
    const updateString1 = "md1_update";
    const updateString2 = "md2_update";

    const md1BytesFirstTry = accessor.getMessageDigest(
      Buffer.from(updateString1, charset),
    );
    const md2BytesFirstTry = accessor.getMessageDigest(
      Buffer.from(updateString2, charset),
    );
    const md1BytesSecondTry = accessor.getMessageDigest(
      Buffer.from(updateString1, charset),
    );
    const md2BytesSecondTry = accessor.getMessageDigest(
      Buffer.from(updateString2, charset),
    );

    expect(md1BytesFirstTry.toString("hex")).not.toBe(
      md2BytesFirstTry.toString("hex"),
    );
    expect(md1BytesFirstTry.toString("hex")).toBe(
      md1BytesSecondTry.toString("hex"),
    );
    expect(md2BytesFirstTry.toString("hex")).toBe(
      md2BytesSecondTry.toString("hex"),
    );
  });
});
