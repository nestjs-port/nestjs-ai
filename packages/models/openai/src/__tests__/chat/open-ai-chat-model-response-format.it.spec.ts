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

import { JsonSchemaOutputConverter, Prompt } from "@nestjs-ai/model";
import type {
  ResponseFormatJSONObject,
  ResponseFormatJSONSchema,
} from "openai/resources/shared";
import { assert, describe, expect, it } from "vitest";
import { OpenAiChatModel } from "../../open-ai-chat-model.js";
import { OpenAiChatOptions } from "../../open-ai-chat-options.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const reasoningSchema = {
  type: "object",
  properties: {
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          explanation: { type: "string" },
          output: { type: "string" },
        },
        required: ["explanation", "output"],
        additionalProperties: false,
      },
    },
    final_answer: { type: "string" },
  },
  required: ["steps", "final_answer"],
  additionalProperties: false,
} as const;

describe.skipIf(!OPENAI_API_KEY)("OpenAiChatModelResponseFormatIT", () => {
  const chatModel = new OpenAiChatModel({
    options: OpenAiChatOptions.builder()
      .apiKey(OPENAI_API_KEY ?? "")
      .model(OpenAiChatOptions.DEFAULT_CHAT_MODEL)
      .build(),
  });

  function isValidJson(json: string | null): boolean {
    if (json == null) {
      return false;
    }
    try {
      JSON.parse(json);
    } catch {
      return false;
    }
    return true;
  }

  it("json object", async () => {
    const responseFormat: ResponseFormatJSONObject = {
      type: "json_object",
    };

    const prompt = new Prompt(
      "List 8 planets. Use JSON response",
      OpenAiChatOptions.builder().responseFormat(responseFormat).build(),
    );

    const response = await chatModel.call(prompt);

    assert.exists(response);

    const result = response.result;
    assert.exists(result);

    const content = result.output.text;

    expect(isValidJson(content)).toBe(true);
  });

  it("json schema", async () => {
    const responseFormat: ResponseFormatJSONSchema = {
      type: "json_schema",
      json_schema: {
        name: "json_schema",
        strict: true,
        schema: reasoningSchema,
      },
    };

    const prompt = new Prompt(
      "how can I solve 8x + 7 = -23",
      OpenAiChatOptions.builder()
        .model(OpenAiChatOptions.DEFAULT_CHAT_MODEL)
        .responseFormat(responseFormat)
        .build(),
    );

    const response = await chatModel.call(prompt);

    assert.exists(response);

    const result = response.result;
    assert.exists(result);

    const content = result.output.text;

    expect(isValidJson(content)).toBe(true);
  });

  it("json schema through individual setters", async () => {
    const prompt = new Prompt(
      "how can I solve 8x + 7 = -23",
      OpenAiChatOptions.builder()
        .model(OpenAiChatOptions.DEFAULT_CHAT_MODEL)
        .outputSchema(JSON.stringify(reasoningSchema, null, 2))
        .build(),
    );

    const response = await chatModel.call(prompt);

    assert.exists(response);

    const result = response.result;
    assert.exists(result);

    const content = result.output.text;

    expect(isValidJson(content)).toBe(true);
  });

  it("json schema bean converter", async () => {
    const outputConverter = new JsonSchemaOutputConverter({
      schema: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "object",
        properties: {
          steps: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    output: {
                      type: "string",
                    },
                    explanation: {
                      type: "string",
                    },
                  },
                  required: ["output", "explanation"],
                  additionalProperties: false,
                },
              },
            },
            required: ["items"],
            additionalProperties: false,
          },
          final_answer: {
            type: "string",
          },
        },
        required: ["steps", "final_answer"],
        additionalProperties: false,
      },
    });
    const expectedJsonSchema = JSON.stringify(
      {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "object",
        properties: {
          steps: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    output: {
                      type: "string",
                    },
                    explanation: {
                      type: "string",
                    },
                  },
                  required: ["output", "explanation"],
                  additionalProperties: false,
                },
              },
            },
            required: ["items"],
            additionalProperties: false,
          },
          final_answer: {
            type: "string",
          },
        },
        required: ["steps", "final_answer"],
        additionalProperties: false,
      },
      null,
      2,
    );
    const jsonSchema1 = outputConverter.jsonSchema;

    assert.exists(jsonSchema1);
    expect(jsonSchema1).toBe(expectedJsonSchema);

    const prompt = new Prompt(
      "how can I solve 8x + 7 = -23",
      OpenAiChatOptions.builder()
        .model(OpenAiChatOptions.DEFAULT_CHAT_MODEL)
        .outputSchema(jsonSchema1)
        .build(),
    );

    const response = await chatModel.call(prompt);

    assert.exists(response);

    const result = response.result;
    assert.exists(result);

    const content = result.output.text;

    expect(isValidJson(content)).toBe(true);

    // Check if the order is correct as specified in the schema. Steps should come
    // first before final answer.
    // expect(content.startsWith("{\"steps\":{\"items\":[")).toBe(true);

    const mathReasoning = outputConverter.convert(content || "");

    assert.exists(mathReasoning);
  });
});
