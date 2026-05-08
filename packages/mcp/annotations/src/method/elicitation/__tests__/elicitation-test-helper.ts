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

import type { ElicitRequest } from "@modelcontextprotocol/client";

export class ElicitationTestHelper {
  private constructor() {}

  static createSampleRequest(): ElicitRequest;

  static createSampleRequest(prompt: string): ElicitRequest;

  static createSampleRequest(
    prompt: string,
    context: Record<string, unknown>,
  ): ElicitRequest;

  static createSampleRequest(
    prompt = "Please provide your input for the following task",
    context: Record<string, unknown> = {
      taskType: "userInput",
      required: true,
      description: "Enter your response",
    },
  ): ElicitRequest {
    return {
      method: "elicitation/create",
      params: {
        message: prompt,
        requestedSchema: {
          type: "object",
          properties: {},
        },
        _meta: context,
      },
    } as unknown as ElicitRequest;
  }
}
