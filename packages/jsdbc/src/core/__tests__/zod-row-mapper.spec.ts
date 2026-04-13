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

import { ZodRowMapper } from "../zod-row-mapper";

describe("ZodRowMapper", () => {
  it("maps single-column scalar rows", () => {
    const mapper = new ZodRowMapper(z.number());

    expect(mapper.mapRow({ CONVERSATION_ID: "1" }, 0)).toBe(1);
  });

  it("converts primitive scalar values when needed", () => {
    expect(new ZodRowMapper(z.string()).mapRow({ value: 123 }, 0)).toBe("123");
    expect(new ZodRowMapper(z.boolean()).mapRow({ value: "true" }, 0)).toBe(
      true,
    );
    expect(
      new ZodRowMapper(z.date()).mapRow(
        { value: "2026-04-13T00:00:00.000Z" },
        0,
      ),
    ).toEqual(new Date("2026-04-13T00:00:00.000Z"));
    expect(new ZodRowMapper(z.bigint()).mapRow({ value: "42" }, 0)).toBe(42n);
  });

  it("rejects rows with more than one column for scalar schemas", () => {
    const mapper = new ZodRowMapper(z.number());

    expect(() => mapper.mapRow({ first: "1", second: "2" }, 3)).toThrow(
      "Expected a single-column row at row number 3, but received 2 columns.",
    );
  });

  it("maps normalized column names to schema keys", () => {
    const mapper = new ZodRowMapper(
      z.object({
        conversationId: z.coerce.number(),
        displayName: z.string(),
      }),
    );

    expect(
      mapper.mapRow({ CONVERSATION_ID: "1", DISPLAY_NAME: "Grace" }, 0),
    ).toEqual({
      conversationId: 1,
      displayName: "Grace",
    });
  });

  it("keeps unmatched keys out of the mapped output", () => {
    const mapper = new ZodRowMapper(
      z.object({
        conversationId: z.coerce.number(),
      }),
    );

    expect(
      mapper.mapRow(
        {
          CONVERSATION_ID: "1",
          IGNORED_COLUMN: "value",
        },
        0,
      ),
    ).toEqual({
      conversationId: 1,
    });
  });

  it("throws when the mapped row does not satisfy the schema", () => {
    const mapper = new ZodRowMapper(
      z.object({
        conversationId: z.number(),
      }),
    );

    expect(() =>
      mapper.mapRow({ CONVERSATION_ID: "not-a-number" }, 0),
    ).toThrow();
  });
});
