import { describe, expect, it } from "vitest";
import { MapOutputConverter } from "../map-output-converter";

describe("MapOutputConverter", () => {
  const converter = new MapOutputConverter();

  it("converts JSON object", () => {
    expect(converter.convert('{"foo":"bar","count":3}')).toEqual({
      foo: "bar",
      count: 3,
    });
  });

  it("converts fenced JSON object", () => {
    expect(
      converter.convert('```json\n{"foo":"bar","active":true}\n```'),
    ).toEqual({
      foo: "bar",
      active: true,
    });
  });

  it("returns empty object for null", () => {
    expect(converter.convert("null")).toEqual({});
  });

  it("throws for non-object JSON", () => {
    expect(() => converter.convert('["a","b"]')).toThrow(
      "JSON output must be an object",
    );
  });
});
