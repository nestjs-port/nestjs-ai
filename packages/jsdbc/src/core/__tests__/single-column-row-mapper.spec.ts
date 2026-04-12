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
import { z } from "zod";

import { SingleColumnRowMapper } from "../single-column-row-mapper";

describe("SingleColumnRowMapper", () => {
  it("returns already-typed scalar values without conversion", () => {
    const mapper = new SingleColumnRowMapper(z.number());

    expect(mapper.mapRow({ value: 7 }, 0)).toBe(7);
  });

  it("converts string values to the required scalar type", () => {
    const mapper = new SingleColumnRowMapper(z.number());

    expect(mapper.mapRow({ CONVERSATION_ID: "1" }, 0)).toBe(1);
  });

  it("converts primitive values to string, boolean, date, and bigint", () => {
    expect(
      new SingleColumnRowMapper(z.string()).mapRow({ value: 123 }, 0),
    ).toBe("123");
    expect(
      new SingleColumnRowMapper(z.boolean()).mapRow({ value: "true" }, 0),
    ).toBe(true);
    expect(
      new SingleColumnRowMapper(z.date()).mapRow(
        { value: "2026-04-13T00:00:00.000Z" },
        0,
      ),
    ).toEqual(new Date("2026-04-13T00:00:00.000Z"));
    expect(
      new SingleColumnRowMapper(z.bigint()).mapRow({ value: "42" }, 0),
    ).toBe(42n);
  });

  it("treats false-like values as false", () => {
    const mapper = new SingleColumnRowMapper(z.boolean());

    expect(mapper.mapRow({ value: "false" }, 0)).toBe(false);
    expect(mapper.mapRow({ value: "0" }, 0)).toBe(false);
    expect(mapper.mapRow({ value: 0 }, 0)).toBe(false);
  });

  it("rejects invalid scalar conversions", () => {
    const mapper = new SingleColumnRowMapper(z.number());

    expect(() => mapper.mapRow({ value: "abc" }, 0)).toThrow();
  });

  it("rejects null values for non-nullable scalars", () => {
    const mapper = new SingleColumnRowMapper(z.number());

    expect(() => mapper.mapRow({ value: null }, 0)).toThrow();
  });

  it("rejects empty rows", () => {
    const mapper = new SingleColumnRowMapper(z.number());

    expect(() => mapper.mapRow({}, 0)).toThrow(
      "Expected a single-column row at row number 0, but received 0 columns.",
    );
  });

  it("rejects rows with more than one column", () => {
    const mapper = new SingleColumnRowMapper(z.number());

    expect(() => mapper.mapRow({ first: "1", second: "2" }, 3)).toThrow(
      "Expected a single-column row at row number 3, but received 2 columns.",
    );
  });
});
