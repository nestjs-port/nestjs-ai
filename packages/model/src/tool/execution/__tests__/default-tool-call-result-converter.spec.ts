import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { DefaultToolCallResultConverter } from "../default-tool-call-result-converter";

/**
 * Unit tests for {@link DefaultToolCallResultConverter}.
 */
describe("DefaultToolCallResultConverter", () => {
  const converter = new DefaultToolCallResultConverter();

  it("convert with null return type should return", async () => {
    const result = await converter.convert(null, null);
    expect(result).toBe("null");
  });

  it("convert void return type should return done json", async () => {
    const result = await converter.convert(null, z.void());
    expect(result).toBe('"Done"');
  });

  it("convert string return type should return json", async () => {
    const result = await converter.convert("test", z.string());
    expect(result).toBe('"test"');
  });

  it("convert null return value should return null json", async () => {
    const result = await converter.convert(null, z.string());
    expect(result).toBe("null");
  });

  it("convert object return type should return json", async () => {
    const testObject = new TestObject("test", 42);
    const result = await converter.convert(
      testObject,
      z.object({
        name: z.string(),
        value: z.number(),
      }),
    );

    // Helper function to normalize whitespace for comparison
    const normalizeWhitespace = (str: string): string => {
      return str.replace(/\s+/g, " ").trim();
    };

    const normalizedResult = normalizeWhitespace(result);
    expect(normalizedResult).toContain('"name":"test"');
    expect(normalizedResult).toContain('"value":42');
  });

  it("convert collection return type should return json", async () => {
    const testList = ["one", "two", "three"];
    const result = await converter.convert(testList, z.array(z.string()));
    expect(result).toBe('["one","two","three"]');
  });

  it("convert map return type should return json", async () => {
    const testMap = new Map([
      ["one", 1],
      ["two", 2],
    ]);
    const result = await converter.convert(
      testMap,
      z.record(z.string(), z.number()),
    );

    // Helper function to normalize whitespace for comparison
    const normalizeWhitespace = (str: string): string => {
      return str.replace(/\s+/g, " ").trim();
    };

    const normalizedResult = normalizeWhitespace(result);
    expect(normalizedResult).toContain('"one":1');
    expect(normalizedResult).toContain('"two":2');
  });

  it("convert image should return base64 image", async () => {
    const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
    const result = await converter.convert(buffer, z.unknown());
    const parsed = JSON.parse(result) as { mimeType: string; data: string };

    expect(parsed.mimeType).toBe("image/png");
    expect(parsed.data).toBe(buffer.toString("base64"));
  });

  it("convert readable stream should return base64 image payload", async () => {
    const chunk1 = Buffer.from([0x89, 0x50, 0x4e]);
    const chunk2 = Buffer.from([0x47, 0x0d, 0x0a]);
    const stream = Readable.from([chunk1, chunk2]);
    const result = await converter.convert(stream, z.unknown());
    const parsed = JSON.parse(result) as { mimeType: string; data: string };

    expect(parsed.mimeType).toBe("image/png");
    expect(parsed.data).toBe(
      Buffer.concat([chunk1, chunk2]).toString("base64"),
    );
  });

  it("convert empty collections should return empty json", async () => {
    expect(await converter.convert([], z.array(z.string()))).toBe("[]");
    expect(
      await converter.convert(new Map(), z.record(z.string(), z.number())),
    ).toBe("{}");
    expect(await converter.convert([] as string[], z.array(z.string()))).toBe(
      "[]",
    );
  });

  it("convert record return type should return json", async () => {
    const record: TestRecord = { name: "recordName", value: 1 };
    const result = await converter.convert(
      record,
      z.object({ name: z.string(), value: z.number() }),
    );

    // Helper function to normalize whitespace for comparison
    const normalizeWhitespace = (str: string): string => {
      return str.replace(/\s+/g, " ").trim();
    };

    const normalizedResult = normalizeWhitespace(result);
    expect(normalizedResult).toContain('"recordName"');
    expect(normalizedResult).toContain("1");
  });

  it("convert special characters in strings should escape json", async () => {
    const specialChars =
      'Test with "quotes", newlines\n, tabs\t, and backslashes\\';
    const result = await converter.convert(specialChars, z.string());

    // Should properly escape JSON special characters
    expect(result).toContain('\\"quotes\\"');
    expect(result).toContain("\\n");
    expect(result).toContain("\\t");
    expect(result).toContain("\\\\");
  });
});

interface TestRecord {
  name: string;
  value: number;
}

class TestObject {
  private readonly name: string;

  private readonly value: number;

  constructor(name: string, value: number) {
    this.name = name;
    this.value = value;
  }

  getName(): string {
    return this.name;
  }

  getValue(): number {
    return this.value;
  }
}
