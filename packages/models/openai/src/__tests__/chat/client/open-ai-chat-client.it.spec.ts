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
import { resolve } from "node:path";
import {
  ChatClient,
  AdvisorParams,
  SimpleLoggerAdvisor,
} from "@nestjs-ai/client-chat";
import { MediaFormat, type TemplateRenderer } from "@nestjs-ai/commons";
import {
  BeanOutputConverter,
  FunctionToolCallback,
  ListOutputConverter,
} from "@nestjs-ai/model";
import { LoggerFactory } from "@nestjs-port/core";
import { lastValueFrom, type Observable, tap, toArray } from "rxjs";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { OpenAiChatModel } from "../../../open-ai-chat-model";
import { OpenAiChatOptions } from "../../../open-ai-chat-options";
import {
  MockWeatherService,
  type MockWeatherRequest,
  MockWeatherRequestInputType,
} from "../mock-weather-service";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

describe.skipIf(!OPENAI_API_KEY)("OpenAiChatClientIT", () => {
  const logger = LoggerFactory.getLogger("OpenAiChatClientIT");
  const systemTextResource = readFileSync(
    resolve(__dirname, "../system-message.st"),
  );
  const chatModel = new OpenAiChatModel({
    options: OpenAiChatOptions.builder()
      .apiKey(OPENAI_API_KEY ?? "")
      .build(),
  });

  it("call", async () => {
    // @formatter:off
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
    // @formatter:on

    logger.info("%o", response);
    expect(response).not.toBeNull();
    if (response == null) {
      throw new Error("Expected chat response to be present");
    }
    expect(response.results).toHaveLength(1);
    expect(response.results[0]?.output.text).toContain("Blackbeard");
  });

  it("list output converter string", async () => {
    const outputConverter = new ListOutputConverter();

    // @formatter:off
    const collection = await ChatClient.create(chatModel)
      .prompt()
      .user((u) =>
        u.text("List five {subject}").param("subject", "ice cream flavors"),
      )
      .call()
      .entity(outputConverter);
    // @formatter:on

    logger.info("%s", String(collection));
    expect(collection).not.toBeNull();
    if (collection == null) {
      throw new Error("Expected collection to be present");
    }
    expect(collection).toHaveLength(5);
  });

  it("list output converter bean", async () => {
    // @formatter:off
    const actorsFilms = await ChatClient.create(chatModel)
      .prompt()
      .user(
        "Generate the filmography of 5 movies for Tom Hanks and Bill Murray.",
      )
      .call()
      .entity(z.array(ActorsFilmsSchema), ActorsFilms);
    // @formatter:on

    logger.info("%s", String(actorsFilms));
    expect(actorsFilms).not.toBeNull();
    if (actorsFilms == null) {
      throw new Error("Expected actors films to be present");
    }
    expect(actorsFilms).toHaveLength(2);
  });

  it("custom output converter", async () => {
    const toStringListConverter = new ListOutputConverter();

    // @formatter:off
    const flavors = await ChatClient.create(chatModel)
      .prompt()
      .user((u) =>
        u.text("List five {subject}").param("subject", "ice cream flavors"),
      )
      .call()
      .entity(toStringListConverter);
    // @formatter:on

    logger.info("ice cream flavors%s", String(flavors));
    expect(flavors).not.toBeNull();
    if (flavors == null) {
      throw new Error("Expected flavors to be present");
    }
    expect(flavors).toHaveLength(5);
    expect(flavors).toContain("Vanilla");
  });

  it("bean output converter", async () => {
    // @formatter:off
    const actorsFilms = await ChatClient.create(chatModel)
      .prompt()
      .user("Generate the filmography for a random actor.")
      .call()
      .entity(ActorsFilmsSchema, ActorsFilms);
    // @formatter:on

    logger.info("%s", String(actorsFilms));
    expect(actorsFilms).not.toBeNull();
    if (actorsFilms == null) {
      throw new Error("Expected actors films to be present");
    }
    expect(actorsFilms.actor).not.toBe("");
  });

  it("bean output converter native structured output", async () => {
    // @formatter:off
    const actorsFilms = await ChatClient.create(chatModel)
      .prompt()
      .advisors(AdvisorParams.ENABLE_NATIVE_STRUCTURED_OUTPUT)
      .user("Generate the filmography for a random actor.")
      .call()
      .entity(ActorsFilmsSchema, ActorsFilms);
    // @formatter:on

    logger.info("%s", String(actorsFilms));
    expect(actorsFilms).not.toBeNull();
    if (actorsFilms == null) {
      throw new Error("Expected actors films to be present");
    }
    expect(actorsFilms.actor).not.toBe("");
  });

  it("bean output converter records", async () => {
    // @formatter:off
    const actorsFilms = await ChatClient.create(chatModel)
      .prompt()
      .user("Generate the filmography of 5 movies for Tom Hanks.")
      .call()
      .entity(ActorsFilmsSchema, ActorsFilms);
    // @formatter:on

    logger.info("%s", String(actorsFilms));
    expect(actorsFilms).not.toBeNull();
    if (actorsFilms == null) {
      throw new Error("Expected actors films to be present");
    }
    expect(actorsFilms.actor).toBe("Tom Hanks");
    expect(actorsFilms.movies).toHaveLength(5);
  });

  it("bean output converter records native structured output", async () => {
    // @formatter:off
    const actorsFilms = await ChatClient.create(chatModel)
      .prompt()
      .advisors(AdvisorParams.ENABLE_NATIVE_STRUCTURED_OUTPUT)
      .user("Generate the filmography of 5 movies for Tom Hanks.")
      .call()
      .entity(ActorsFilmsSchema, ActorsFilms);
    // @formatter:on

    logger.info("%s", String(actorsFilms));
    expect(actorsFilms).not.toBeNull();
    if (actorsFilms == null) {
      throw new Error("Expected actors films to be present");
    }
    expect(actorsFilms.actor).toBe("Tom Hanks");
    expect(actorsFilms.movies).toHaveLength(5);
  });

  it("bean stream output converter records", async () => {
    const outputConverter = new BeanOutputConverter({
      schema: ActorsFilmsSchema,
      outputType: ActorsFilms,
    });

    // @formatter:off
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
    // @formatter:on

    // Add debugging to understand what text we're trying to parse
    logger.debug("Aggregated streaming text: %s", generationTextFromStream);

    // Ensure we have valid JSON before attempting conversion
    if (generationTextFromStream.trim().length === 0) {
      throw new Error(
        "Empty aggregated text from streaming response - this indicates a problem with streaming aggregation",
      );
    }

    const actorsFilms = outputConverter.convert(generationTextFromStream);

    logger.info("%s", String(actorsFilms));
    expect(actorsFilms.actor).toBe("Tom Hanks");
    expect(actorsFilms.movies).toHaveLength(5);
  });

  it("function call test", async () => {
    const weatherService = new MockWeatherService();

    // @formatter:off
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
    // @formatter:on

    logger.info("Response: %s", response);

    expect(response).not.toBeNull();
    if (response == null) {
      throw new Error("Expected response to be present");
    }
    expect(response).toContain("30");
    expect(response).toContain("10");
    expect(response).toContain("15");
  });

  it("default function call test", async () => {
    const weatherService = new MockWeatherService();

    // @formatter:off
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
    // @formatter:on

    logger.info("Response: %s", response);

    expect(response).not.toBeNull();
    if (response == null) {
      throw new Error("Expected response to be present");
    }
    expect(response).toContain("30");
    expect(response).toContain("10");
    expect(response).toContain("15");
  });

  it("stream function call test", async () => {
    const weatherService = new MockWeatherService();

    // @formatter:off
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
    // @formatter:on

    const content = await collectContentText(response);
    logger.info("Response: %s", content);

    expect(content).toContain("30");
    expect(content).toContain("10");
    expect(content).toContain("15");
  });

  it.each(["gpt-4o"])("multi modality embedded image", async (modelName) => {
    const imageResource = readFileSync(resolve(__dirname, "../test.png"));

    // @formatter:off
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
    // @formatter:on

    logger.info("%s", response);
    expect(response).not.toBeNull();
    if (response == null) {
      throw new Error("Expected response to be present");
    }
    expect(response).toContain("bananas");
  });

  it.each(["gpt-4o"])("multi modality image url", async (modelName) => {
    const url = new URL(
      "https://docs.spring.io/spring-ai/reference/_images/multimodal.test.png",
    );

    // @formatter:off
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
    // @formatter:on

    logger.info("%s", response);
    expect(response).not.toBeNull();
    if (response == null) {
      throw new Error("Expected response to be present");
    }
    expect(response).toContain("bananas");
  });

  it("streaming multi modality image url", async () => {
    const url = new URL(
      "https://docs.spring.io/spring-ai/reference/_images/multimodal.test.png",
    );

    // @formatter:off
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
    // @formatter:on

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

    expect(response).not.toBeNull();
    if (response == null) {
      throw new Error("Expected response to be present");
    }
    expect(response.result).not.toBeNull();
    if (response.result == null) {
      throw new Error("Expected response result to be present");
    }
    const audio = response.result.output.media[0]?.dataAsByteArray;
    expect(audio).not.toBeUndefined();
    if (audio == null) {
      throw new Error("Expected audio data to be present");
    }
    expect(audio.length).toBeGreaterThan(0);
    logger.info("Response: %o", response);
  });

  it("custom template renderer with call", async () => {
    const outputConverter = new BeanOutputConverter({
      schema: ActorsFilmsSchema,
      outputType: ActorsFilms,
    });

    // @formatter:off
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
    // @formatter:on

    expect(result).not.toBeNull();
    if (result == null) {
      throw new Error("Expected result to be present");
    }
    const actorsFilms = outputConverter.convert(result);

    logger.info("%s", String(actorsFilms));
    expect(actorsFilms.actor).toBe("Tom Hanks");
    expect(actorsFilms.movies).toHaveLength(5);
  });

  it("custom template renderer with call and advisor", async () => {
    const outputConverter = new BeanOutputConverter({
      schema: ActorsFilmsSchema,
      outputType: ActorsFilms,
    });

    // @formatter:off
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
    // @formatter:on

    expect(result).not.toBeNull();
    if (result == null) {
      throw new Error("Expected result to be present");
    }
    const actorsFilms = outputConverter.convert(result);

    logger.info("%s", String(actorsFilms));
    expect(actorsFilms.actor).toBe("Tom Hanks");
    expect(actorsFilms.movies).toHaveLength(5);
  });

  it("custom template renderer with stream", async () => {
    const outputConverter = new BeanOutputConverter({
      schema: ActorsFilmsSchema,
      outputType: ActorsFilms,
    });

    // @formatter:off
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
    // @formatter:on

    const actorsFilms = outputConverter.convert(generationTextFromStream);

    logger.info("%s", String(actorsFilms));
    expect(actorsFilms.actor).toBe("Tom Hanks");
    expect(actorsFilms.movies).toHaveLength(5);
  });

  it("custom template renderer with stream and advisor", async () => {
    const outputConverter = new BeanOutputConverter({
      schema: ActorsFilmsSchema,
      outputType: ActorsFilms,
    });

    // @formatter:off
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
    // @formatter:on

    const actorsFilms = outputConverter.convert(generationTextFromStream);

    logger.info("%s", String(actorsFilms));
    expect(actorsFilms.actor).toBe("Tom Hanks");
    expect(actorsFilms.movies).toHaveLength(5);
  });
});

class ActorsFilms {
  actor = "";

  movies: string[] = [];

  toString(): string {
    return `ActorsFilms{actor='${this.actor}', movies=${JSON.stringify(this.movies)}}`;
  }
}

const ActorsFilmsSchema = z.object({
  actor: z.string(),
  movies: z.array(z.string()),
});

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
