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
import { describe, expect, it } from "vitest";
import { ChatClientRequest } from "../../../chat-client-request";
import { AdvisorObservationContext } from "../advisor-observation-context";

describe("AdvisorObservationContext", () => {
  it("when mandatory options then return", () => {
    const observationContext = new AdvisorObservationContext(
      "AdvisorName",
      ChatClientRequest.builder().prompt(new Prompt("Hello")).build(),
      0,
    );

    expect(observationContext).toBeDefined();
  });

  it("missing advisor name", () => {
    expect(() => {
      new AdvisorObservationContext(
        "",
        ChatClientRequest.builder().prompt(new Prompt("Hello")).build(),
        0,
      );
    }).toThrow("advisorName cannot be null or empty");
  });

  it("missing chat client request", () => {
    expect(() => {
      new AdvisorObservationContext(
        "AdvisorName",
        null as unknown as ChatClientRequest,
        0,
      );
    }).toThrow("chatClientRequest cannot be null");
  });

  it("when builder with chat client request then return", () => {
    const observationContext = new AdvisorObservationContext(
      "AdvisorName",
      ChatClientRequest.builder().prompt(new Prompt("")).build(),
      0,
    );

    expect(observationContext).toBeDefined();
  });
});
