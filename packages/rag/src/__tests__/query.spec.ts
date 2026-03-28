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
