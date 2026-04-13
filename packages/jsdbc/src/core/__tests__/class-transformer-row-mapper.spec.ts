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

import { Expose, Transform } from "class-transformer";
import { describe, expect, it } from "vitest";

import { ClassTransformerRowMapper } from "../class-transformer-row-mapper";

class ConversationRow {
  @Expose({ name: "conversation_id" })
  @Transform(({ value }) => Number(value))
  conversationId!: number;

  @Expose({ name: "display_name" })
  displayName!: string;
}

describe("ClassTransformerRowMapper", () => {
  it("maps rows to class instances using class-transformer decorators", () => {
    const mapper = new ClassTransformerRowMapper(ConversationRow, {
      excludeExtraneousValues: true,
    });

    const result = mapper.mapRow(
      {
        conversation_id: "7",
        display_name: "Ada",
        ignored: "value",
      },
      0,
    );

    expect(result).toBeInstanceOf(ConversationRow);
    expect(result).toEqual({
      conversationId: 7,
      displayName: "Ada",
    });
  });
});
