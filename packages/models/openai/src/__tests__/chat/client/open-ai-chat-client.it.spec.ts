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

import { readFileSync } from "node:fs";
import { EOL } from "node:os";
import {
  AdvisorParams,
  ChatClient,
  SimpleLoggerAdvisor,
} from "@nestjs-ai/client-chat";
import { MediaFormat, type TemplateRenderer } from "@nestjs-ai/commons";
import {
  FunctionToolCallback,
  ListOutputConverter,
  JsonSchemaOutputConverter,
} from "@nestjs-ai/model";
import { LoggerFactory, LogLevel } from "@nestjs-port/core";
import { lastValueFrom, type Observable, tap, toArray } from "rxjs";
import { assert, describe, expect, it } from "vitest";
import { z } from "zod";

import { OpenAiChatModel } from "../../../open-ai-chat-model.js";
import { OpenAiChatOptions } from "../../../open-ai-chat-options.js";
import {
  type MockWeatherRequest,
  MockWeatherRequestInputType,
  MockWeatherService,
} from "../mock-weather-service.js";
import { ConsoleLoggerFactory } from "@nestjs-port/testing";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

describe.skipIf(!OPENAI_API_KEY)("OpenAiChatClientIT", () => {
  LoggerFactory.bind(new ConsoleLoggerFactory(LogLevel.DEBUG));
  const logger = LoggerFactory.getLogger("OpenAiChatClientIT");
  const systemTextResource = readFileSync(
    new URL("../system-message.st", import.meta.url),
  );
  const chatModel = new OpenAiChatModel({
    options: OpenAiChatOptions.builder()
      .apiKey(OPENAI_API_KEY ?? "")
      .build(),
  });

  it("call", async () => {
    const response = await ChatClient.create(chatModel)
      .prompt()
      .advisors(new SimpleLoggerAdvisor())
      .system((s) =>
        s
          .text(systemTextResource)
          .param("name", "Bob")
          .param("voice", "pirate"),
      )
      .user(
        "Tell me about 3 famous pirates from the Golden Age of Piracy and what they did",
      )
      .call()
      .chatResponse();

    logger.info("%o", response);
    assert.exists(response);
    expect(response.results).toHaveLength(1);
    expect(response.results[0]?.output.text).toContain("Blackbeard");
  });

  it("list output converter string", async () => {
    const outputConverter = new ListOutputConverter();

    const collection = await ChatClient.create(chatModel)
      .prompt()
      .user((u) =>
        u.text("List five {subject}").param("subject", "ice cream flavors"),
      )
      .call()
      .entity(outputConverter);

    logger.info("%s", String(collection));
    assert.exists(collection);
    expect(collection).toHaveLength(5);
  });

  it("list output converter bean", async () => {
    const actorsFilms = await ChatClient.create(chatModel)
      .prompt()
      .user(
        "Generate the filmography of 5 movies for Tom Hanks and Bill Murray.",
      )
      .call()
      .entity(z.array(ActorsFilmsSchema.transform(toActorsFilms)));

    logger.info("%s", String(actorsFilms));
    assert.exists(actorsFilms);
    expect(actorsFilms).toHaveLength(2);
  });

  it("custom output converter", async () => {
    const toStringListConverter = new ListOutputConverter();

    const flavors = await ChatClient.create(chatModel)
      .prompt()
      .user((u) =>
        u.text("List five {subject}").param("subject", "ice cream flavors"),
      )
      .call()
      .entity(toStringListConverter);

    logger.info("ice cream flavors%s", String(flavors));
    assert.exists(flavors);
    expect(flavors).toHaveLength(5);
    expect(flavors).toContain("Vanilla");
  });

  it("bean output converter", async () => {
    const actorsFilms = await ChatClient.create(chatModel)
      .prompt()
      .user("Generate the filmography for a random actor.")
      .call()
      .entity(ActorsFilmsSchema.transform(toActorsFilms));

    logger.info("%s", String(actorsFilms));
    assert.exists(actorsFilms);
    expect(actorsFilms.actor).not.toBe("");
  });

  it("bean output converter native structured output", async () => {
    const actorsFilms = await ChatClient.create(chatModel)
      .prompt()
      .advisors(AdvisorParams.ENABLE_NATIVE_STRUCTURED_OUTPUT)
      .user("Generate the filmography for a random actor.")
      .call()
      .entity(ActorsFilmsSchema.transform(toActorsFilms));

    logger.info("%s", String(actorsFilms));
    assert.exists(actorsFilms);
    expect(actorsFilms.actor).not.toBe("");
  });

  it("bean output converter records", async () => {
    const actorsFilms = await ChatClient.create(chatModel)
      .prompt()
      .user("Generate the filmography of 5 movies for Tom Hanks.")
      .call()
      .entity(ActorsFilmsSchema.transform(toActorsFilms));

    logger.info("%s", String(actorsFilms));
    assert.exists(actorsFilms);
    expect(actorsFilms.actor).toBe("Tom Hanks");
    expect(actorsFilms.movies).toHaveLength(5);
  });

  it("bean output converter records native structured output", async () => {
    const actorsFilms = await ChatClient.create(chatModel)
      .prompt()
      .advisors(AdvisorParams.ENABLE_NATIVE_STRUCTURED_OUTPUT)
      .user("Generate the filmography of 5 movies for Tom Hanks.")
      .call()
      .entity(ActorsFilmsSchema.transform(toActorsFilms));

    logger.info("%s", String(actorsFilms));
    assert.exists(actorsFilms);
    expect(actorsFilms.actor).toBe("Tom Hanks");
    expect(actorsFilms.movies).toHaveLength(5);
  });

  it("bean stream output converter records", async () => {
    const outputConverter = new JsonSchemaOutputConverter({
      schema: ActorsFilmsJsonSchema,
    });

    const chatResponse = ChatClient.create(chatModel)
      .prompt()
      .options(
        OpenAiChatOptions.builder().streamOptions({ include_usage: true }),
      )
      .advisors(new SimpleLoggerAdvisor())
      .user((u) =>
        u
          .text(
            `Generate the filmography of 5 movies for Tom Hanks. ${EOL}{format}`,
          )
          .param("format", outputConverter.format),
      )
      .stream()
      .chatResponse();

    const chatResponses = await lastValueFrom(chatResponse.pipe(toArray()));

    const generationTextFromStream = chatResponses
      .filter((cr) => cr.result != null)
      .map((cr) => cr.result?.output.text)
      .filter((text): text is string => text != null && text.trim().length > 0)
      .join("");

    // Add debugging to understand what text we're trying to parse
    logger.debug("Aggregated streaming text: %s", generationTextFromStream);

    // Ensure we have valid JSON before attempting conversion
    if (generationTextFromStream.trim().length === 0) {
      throw new Error(
        "Empty aggregated text from streaming response - this indicates a problem with streaming aggregation",
      );
    }

    const actorsFilms = await outputConverter.convert(generationTextFromStream);

    logger.info("%s", String(actorsFilms));
    expect(actorsFilms.actor).toBe("Tom Hanks");
    expect(actorsFilms.movies).toHaveLength(5);
  });

  it("function call test", async () => {
    const weatherService = new MockWeatherService();

    const response = await ChatClient.create(chatModel)
      .prompt()
      .user((u) =>
        u.text(
          "What's the weather like in San Francisco, Tokyo, and Paris in Celsius?",
        ),
      )
      .toolCallbacks(
        FunctionToolCallback.builder(
          "getCurrentWeather",
          (request: MockWeatherRequest) => weatherService.apply(request),
        )
          .description("Get the weather in location")
          .inputType(MockWeatherRequestInputType)
          .build(),
      )
      .call()
      .content();

    logger.info("Response: %s", response);

    assert.exists(response);
    expect(response).toContain("30");
    expect(response).toContain("10");
    expect(response).toContain("15");
  });

  it("default function call test", async () => {
    const weatherService = new MockWeatherService();

    const response = await ChatClient.builder(chatModel)
      .defaultToolCallbacks(
        FunctionToolCallback.builder(
          "getCurrentWeather",
          (request: MockWeatherRequest) => weatherService.apply(request),
        )
          .description("Get the weather in location")
          .inputType(MockWeatherRequestInputType)
          .build(),
      )
      .defaultUser((u) =>
        u.text(
          "What's the weather like in San Francisco, Tokyo, and Paris in Celsius?",
        ),
      )
      .build()
      .prompt()
      .call()
      .content();

    logger.info("Response: %s", response);

    assert.exists(response);
    expect(response).toContain("30");
    expect(response).toContain("10");
    expect(response).toContain("15");
  });

  it("stream function call test", async () => {
    const weatherService = new MockWeatherService();

    const response = ChatClient.create(chatModel)
      .prompt()
      .user(
        "What's the weather like in San Francisco, Tokyo, and Paris in Celsius?",
      )
      .toolCallbacks(
        FunctionToolCallback.builder(
          "getCurrentWeather",
          (request: MockWeatherRequest) => weatherService.apply(request),
        )
          .description("Get the weather in location")
          .inputType(MockWeatherRequestInputType)
          .build(),
      )
      .stream()
      .content();

    const content = await collectContentText(response);
    logger.info("Response: %s", content);

    expect(content).toContain("30");
    expect(content).toContain("10");
    expect(content).toContain("15");
  });

  it.each(["gpt-4o"])("multi modality embedded image", async (modelName) => {
    const imageResource = readFileSync(new URL("../test.png", import.meta.url));

    const response = await ChatClient.create(chatModel)
      .prompt()
      .options(OpenAiChatOptions.builder().model(modelName))
      .user((u) =>
        u
          .text("Explain what do you see on this picture?")
          .media(MediaFormat.IMAGE_PNG, imageResource),
      )
      .call()
      .content();

    logger.info("%s", response);
    assert.exists(response);
    expect(response).toContain("bananas");
  });

  it.each(["gpt-4o"])("multi modality image url", async (modelName) => {
    const url = new URL(
      "https://docs.spring.io/spring-ai/reference/_images/multimodal.test.png",
    );

    const response = await ChatClient.create(chatModel)
      .prompt()
      // TODO consider adding model(...) method to ChatClient as a shortcut to
      .options(OpenAiChatOptions.builder().model(modelName))
      .user((u) =>
        u
          .text("Explain what do you see on this picture?")
          .media(MediaFormat.IMAGE_PNG, url),
      )
      .call()
      .content();

    logger.info("%s", response);
    assert.exists(response);
    expect(response).toContain("bananas");
  });

  it("streaming multi modality image url", async () => {
    const url = new URL(
      "https://docs.spring.io/spring-ai/reference/_images/multimodal.test.png",
    );

    const response = ChatClient.create(chatModel)
      .prompt()
      .options(OpenAiChatOptions.builder().model("gpt-5-mini"))
      .user((u) =>
        u
          .text("Explain what do you see on this picture?")
          .media(MediaFormat.IMAGE_PNG, url),
      )
      .stream()
      .content();

    const content = await collectContentText(response);

    logger.info("Response: %s", content);
    expect(content).toContain("bananas");
  });

  it("multi modality audio response", async () => {
    const response = await ChatClient.create(chatModel)
      .prompt("Tell me joke about Spring Framework")
      .options(
        OpenAiChatOptions.builder()
          .model("gpt-4o-audio-preview")
          .outputAudio({ voice: "alloy", format: "wav" })
          .outputModalities(["text", "audio"]),
      )
      .call()
      .chatResponse();

    assert.exists(response);
    assert.exists(response.result);
    const audio = response.result.output.media[0]?.dataAsByteArray;
    expect(audio).not.toBeUndefined();
    if (audio == null) {
      throw new Error("Expected audio data to be present");
    }
    expect(audio.length).toBeGreaterThan(0);
    logger.info("Response: %o", response);
  });

  it("custom template renderer with call", async () => {
    const outputConverter = new JsonSchemaOutputConverter({
      schema: ActorsFilmsJsonSchema,
    });

    const result = await ChatClient.create(chatModel)
      .prompt()
      .user((u) =>
        u
          .text(
            `Generate the filmography of 5 movies for Tom Hanks. ${EOL}<format>`,
          )
          .param("format", outputConverter.format),
      )
      .templateRenderer(new AngleBracketTemplateRenderer())
      .call()
      .content();

    assert.exists(result);
    const actorsFilms = await outputConverter.convert(result);

    logger.info("%s", String(actorsFilms));
    expect(actorsFilms.actor).toBe("Tom Hanks");
    expect(actorsFilms.movies).toHaveLength(5);
  });

  it("custom template renderer with call and advisor", async () => {
    const outputConverter = new JsonSchemaOutputConverter({
      schema: ActorsFilmsJsonSchema,
    });

    const result = await ChatClient.create(chatModel)
      .prompt()
      .advisors(new SimpleLoggerAdvisor())
      .user((u) =>
        u
          .text(
            `Generate the filmography of 5 movies for Tom Hanks. ${EOL}<format>`,
          )
          .param("format", outputConverter.format),
      )
      .templateRenderer(new AngleBracketTemplateRenderer())
      .call()
      .content();

    assert.exists(result);
    const actorsFilms = await outputConverter.convert(result);

    logger.info("%s", String(actorsFilms));
    expect(actorsFilms.actor).toBe("Tom Hanks");
    expect(actorsFilms.movies).toHaveLength(5);
  });

  it("custom template renderer with stream", async () => {
    const outputConverter = new JsonSchemaOutputConverter({
      schema: ActorsFilmsJsonSchema,
    });

    const chatResponse = ChatClient.create(chatModel)
      .prompt()
      .options(
        OpenAiChatOptions.builder().streamOptions({ include_usage: true }),
      )
      .user((u) =>
        u
          .text(
            `Generate the filmography of 5 movies for Tom Hanks. ${EOL}<format>`,
          )
          .param("format", outputConverter.format),
      )
      .templateRenderer(new AngleBracketTemplateRenderer())
      .stream()
      .chatResponse();

    const chatResponses = await lastValueFrom(chatResponse.pipe(toArray()));

    const generationTextFromStream = chatResponses
      .filter((cr) => cr.result != null)
      .map((cr) => cr.result?.output.text ?? "")
      .join("");

    const actorsFilms = await outputConverter.convert(generationTextFromStream);

    logger.info("%s", String(actorsFilms));
    expect(actorsFilms.actor).toBe("Tom Hanks");
    expect(actorsFilms.movies).toHaveLength(5);
  });

  it("custom template renderer with stream and advisor", async () => {
    const outputConverter = new JsonSchemaOutputConverter({
      schema: ActorsFilmsJsonSchema,
    });

    const chatResponse = ChatClient.create(chatModel)
      .prompt()
      .options(
        OpenAiChatOptions.builder().streamOptions({ include_usage: true }),
      )
      .advisors(new SimpleLoggerAdvisor())
      .user((u) =>
        u
          .text(
            `Generate the filmography of 5 movies for Tom Hanks. ${EOL}<format>`,
          )
          .param("format", outputConverter.format),
      )
      .templateRenderer(new AngleBracketTemplateRenderer())
      .stream()
      .chatResponse();

    const chatResponses = await lastValueFrom(chatResponse.pipe(toArray()));

    const generationTextFromStream = chatResponses
      .filter((cr) => cr.result != null)
      .map((cr) => cr.result?.output.text ?? "")
      .join("");

    const actorsFilms = await outputConverter.convert(generationTextFromStream);

    logger.info("%s", String(actorsFilms));
    expect(actorsFilms.actor).toBe("Tom Hanks");
    expect(actorsFilms.movies).toHaveLength(5);
  });
});

class ActorsFilms {
  actor = "";

  movies: string[] = [];
}

const ActorsFilmsSchema = z.object({
  actor: z.string(),
  movies: z.array(z.string()),
});

const ActorsFilmsJsonSchema = {
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
  $schema: "https://json-schema.org/draft/2020-12/schema",
} as const;

function toActorsFilms(value: {
  actor: string;
  movies: string[];
}): ActorsFilms {
  return Object.assign(new ActorsFilms(), value);
}

class AngleBracketTemplateRenderer implements TemplateRenderer {
  apply(template: string, variables: Record<string, unknown | null>): string {
    return template.replace(/<([^<>]+)>/g, (_match, key: string) =>
      String(variables[key] ?? ""),
    );
  }
}

async function collectContentText(stream: Observable<string>): Promise<string> {
  let answer = "";
  await withTimeout(
    lastValueFrom(
      stream.pipe(
        tap((chunk) => {
          answer += chunk;
        }),
      ),
    ),
    120_000,
  );
  return answer;
}

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
