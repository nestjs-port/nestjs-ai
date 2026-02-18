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
