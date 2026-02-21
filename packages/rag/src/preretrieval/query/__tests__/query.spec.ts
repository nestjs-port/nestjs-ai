import { describe, expect, it } from "vitest";
import { Query } from "../query";

describe("Query", () => {
  it("when text is null then throw", () => {
    expect(() => new Query(null as unknown as string)).toThrow(
      "text cannot be null or empty",
    );
  });

  it("when text is empty then throw", () => {
    expect(() => new Query("")).toThrow("text cannot be null or empty");
  });

  it("when text is blank then throw", () => {
    expect(() => new Query("   ")).toThrow("text cannot be null or empty");
  });

  it("when text is tabs and spaces then throw", () => {
    expect(() => new Query("\t\n  \r")).toThrow("text cannot be null or empty");
  });

  it("when multiple queries with same text then equal", () => {
    const text = "Same query text";
    const query1 = new Query(text);
    const query2 = new Query(text);

    expect(query1).toEqual(query2);
  });

  it("when queries with different text then not equal", () => {
    const query1 = new Query("First query");
    const query2 = new Query("Second query");

    expect(query1).not.toEqual(query2);
  });

  it("when compare query to null then not equal", () => {
    const query = new Query("Test query");
    expect(query).not.toEqual(null);
  });

  it("when compare query to different type then not equal", () => {
    const query = new Query("Test query");
    const notAQuery = "Test query";
    expect(query).not.toEqual(notAQuery);
  });
});
