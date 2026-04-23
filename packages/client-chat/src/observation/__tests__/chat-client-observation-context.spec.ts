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

import { Prompt } from "@nestjs-ai/model";
import { assert, describe, expect, it } from "vitest";

import type { Advisor } from "../../advisor/index.js";
import { ChatClientAttributes } from "../../chat-client-attributes.js";
import { ChatClientRequest } from "../../chat-client-request.js";
import { ChatClientResponse } from "../../chat-client-response.js";
import { ChatClientObservationContext } from "../chat-client-observation-context.js";

function createAdvisor(name: string): Advisor {
  return {
    get order() {
      return 0;
    },
    get name() {
      return name;
    },
  };
}

describe("ChatClientObservationContext", () => {
  it("when mandatory request options then return", () => {
    const observationContext = ChatClientObservationContext.builder()
      .request(ChatClientRequest.builder().prompt(new Prompt("Hello")).build())
      .build();

    assert.exists(observationContext);
  });

  it("when null request then throw", () => {
    expect(() => {
      ChatClientObservationContext.builder()
        .request(null as unknown as ChatClientRequest)
        .build();
    }).toThrow("chatClientRequest cannot be null");
  });

  it("when null advisors then throw", () => {
    expect(() => {
      ChatClientObservationContext.builder()
        .request(
          ChatClientRequest.builder().prompt(new Prompt("Hello")).build(),
        )
        .advisors(null as unknown as Advisor[])
        .build();
    }).toThrow("advisors cannot be null");
  });

  it("when advisors contain null then throw", () => {
    expect(() => {
      ChatClientObservationContext.builder()
        .request(
          ChatClientRequest.builder().prompt(new Prompt("Hello")).build(),
        )
        .advisors([createAdvisor("first"), null as unknown as Advisor])
        .build();
    }).toThrow("advisors cannot contain null elements");
  });

  it("when format provided then sets output format in request context", () => {
    const observationContext = ChatClientObservationContext.builder()
      .request(ChatClientRequest.builder().prompt(new Prompt("Hello")).build())
      .format("json_schema")
      .build();

    expect(
      observationContext.request.context.get(
        ChatClientAttributes.OUTPUT_FORMAT.key,
      ),
    ).toBe("json_schema");
    expect(observationContext.format).toBe("json_schema");
  });

  it("when set response then returns same response", () => {
    const observationContext = ChatClientObservationContext.builder()
      .request(ChatClientRequest.builder().prompt(new Prompt("Hello")).build())
      .build();
    const response = ChatClientResponse.builder().build();

    observationContext.setResponse(response);

    expect(observationContext.response).toBe(response);
  });
});
