/*
 * Copyright 2026-present the original author or authors.
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

import {
  JsonSchemaOutputConverter,
  Prompt,
  PromptTemplate,
} from "@nestjs-ai/model";
import { LoggerFactory, LogLevel } from "@nestjs-port/core";
import { ConsoleLoggerFactory } from "@nestjs-port/testing";
import { lastValueFrom, type Observable, tap } from "rxjs";
import { describe, expect, it } from "vitest";

import { OpenAiChatModel } from "../../open-ai-chat-model.js";
import { OpenAiChatOptions } from "../../open-ai-chat-options.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

describe.skipIf(!OPENAI_API_KEY)(
  "OpenAiChatModelTypeReferenceJsonSchemaOutputConverter IT",
  () => {
    LoggerFactory.bind(new ConsoleLoggerFactory(LogLevel.DEBUG));
    const logger = LoggerFactory.getLogger(
      "OpenAiChatModelTypeReferenceJsonSchemaOutputConverterIT",
    );

    const chatModel = new OpenAiChatModel({
      options: OpenAiChatOptions.builder()
        .apiKey(OPENAI_API_KEY ?? "")
        .build(),
    });

    it("type ref output converter records", async () => {
      const outputConverter = new JsonSchemaOutputConverter({
        schema: ActorsFilmsListSchema,
      });

      const format = outputConverter.format;
      const template = `
				Generate the filmography of 5 movies for Tom Hanks and Bill Murray.
				{format}
				`;
      const promptTemplate = PromptTemplate.builder()
        .template(template)
        .variables({ format })
        .build();
      const prompt = new Prompt(promptTemplate.createMessage());
      const generationResponse = await chatModel.call(prompt);
      if (generationResponse.result == null) {
        throw new Error("Expected chat generation to be present");
      }
      const generation = generationResponse.result;

      const actorsFilms = await outputConverter.convert(
        generation.output.text ?? "",
      );
      logger.info("%s", String(actorsFilms));
      expect(actorsFilms).toHaveLength(2);
      expect(actorsFilms[0]?.actor).toBe("Tom Hanks");
      expect(actorsFilms[0]?.movies).toHaveLength(5);
      expect(actorsFilms[1]?.actor).toBe("Bill Murray");
      expect(actorsFilms[1]?.movies).toHaveLength(5);
    });

    it("type ref stream output converter records", async () => {
      const outputConverter = new JsonSchemaOutputConverter({
        schema: ActorsFilmsListSchema,
      });

      const format = outputConverter.format;
      const template = `
				Generate the filmography of 5 movies for Tom Hanks and Bill Murray.
					{format}
					`;
      const promptTemplate = PromptTemplate.builder()
        .template(template)
        .variables({ format })
        .build();
      const prompt = new Prompt(promptTemplate.createMessage());

      const generationTextFromStream = await collectChatResponseText(
        chatModel.stream(prompt),
      );

      const actorsFilms = await outputConverter.convert(
        generationTextFromStream,
      );
      logger.info("%s", String(actorsFilms));
      expect(actorsFilms).toHaveLength(2);
      expect(actorsFilms[0]?.actor).toBe("Tom Hanks");
      expect(actorsFilms[0]?.movies).toHaveLength(5);
      expect(actorsFilms[1]?.actor).toBe("Bill Murray");
      expect(actorsFilms[1]?.movies).toHaveLength(5);
    });
  },
);

const ActorsFilmsListSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      actor: { type: "string" },
      movies: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["actor", "movies"],
    additionalProperties: false,
  },
  $schema: "https://json-schema.org/draft/2020-12/schema",
} as const;

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`Timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle != null) {
      clearTimeout(timeoutHandle);
    }
  }
}

async function collectChatResponseText(
  stream: Observable<{
    results: Array<{ output: { text: string | null } }>;
  }>,
): Promise<string> {
  let answer = "";
  await withTimeout(
    lastValueFrom(
      stream.pipe(
        tap((chatResponse) => {
          if (chatResponse.results.length > 0) {
            answer += chatResponse.results[0]?.output.text ?? "";
          }
        }),
      ),
    ),
    120_000,
  );
  return answer;
}
