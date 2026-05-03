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

import "reflect-metadata";

import type {
  CompleteRequest,
  CompleteResult,
} from "@modelcontextprotocol/server";

import {
  McpServerExchange,
  McpTransportContext,
} from "../../../context/index.js";
import { MCP_COMPLETE_METADATA_KEY } from "../../../metadata.js";
import { McpComplete } from "../../../mcp-complete.js";
import type { McpCompleteMethodArguments } from "../../../mcp-complete.js";
import { McpCompleteMethodCallback } from "../mcp-complete-method-callback.js";

/**
 * Example demonstrating how to use the complete method callback with `McpComplete`
 * annotations.
 */
export class McpCompleteMethodCallbackExample {
  private constructor() {}

  static async main(): Promise<void> {
    const autocompleteProvider = new AsyncAutocompleteProvider();
    const promptCompletionHandlers = new Map<
      string,
      McpCompleteMethodCallback
    >();
    const uriCompletionHandlers = new Map<string, McpCompleteMethodCallback>();

    for (const propertyKey of Object.getOwnPropertyNames(
      AsyncAutocompleteProvider.prototype,
    )) {
      if (propertyKey === "constructor") {
        continue;
      }

      const completeAnnotation = Reflect.getMetadata(
        MCP_COMPLETE_METADATA_KEY,
        AsyncAutocompleteProvider.prototype,
        propertyKey,
      );

      if (completeAnnotation == null) {
        continue;
      }

      try {
        const callback = new McpCompleteMethodCallback({
          provider: autocompleteProvider,
          propertyKey,
          complete: completeAnnotation,
        });

        if (completeAnnotation.prompt.length > 0) {
          const promptName = completeAnnotation.prompt;
          promptCompletionHandlers.set(
            `${promptName}#${propertyKey}`,
            callback,
          );
          console.log(`Registered prompt completion handler: ${promptName}`);
          console.log(`  Method: ${propertyKey}`);
          console.log();
        } else if (completeAnnotation.uri.length > 0) {
          const uriPattern = completeAnnotation.uri;
          uriCompletionHandlers.set(`${uriPattern}#${propertyKey}`, callback);

          if (uriPattern.includes("{") && uriPattern.includes("}")) {
            console.log(`  URI Template: ${uriPattern}`);
            console.log("  URI Variables:", extractUriVariables(uriPattern));
          }

          console.log(`Registered URI completion handler: ${uriPattern}`);
          console.log(`  Method: ${propertyKey}`);
          console.log();
        }
      } catch (error) {
        console.error(
          `Failed to create callback for method ${propertyKey}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    if (promptCompletionHandlers.size > 0) {
      console.log("\nTesting prompt completion handlers:");

      await testPromptHandler(
        promptCompletionHandlers,
        "travel-planner#completeCityNameAsync",
        "l",
        "City name completion",
      );

      await testPromptHandler(
        promptCompletionHandlers,
        "travel-planner#completeCountryNameAsync",
        "a",
        "Country name completion",
      );

      await testPromptHandler(
        promptCompletionHandlers,
        "translator#completeLanguageNameAsync",
        "s",
        "Language name completion",
      );

      await testPromptHandler(
        promptCompletionHandlers,
        "simple-prompt#completeSimpleValueAsync",
        "test",
        "Simple value completion",
      );

      await testPromptHandler(
        promptCompletionHandlers,
        "direct-result#getDirectResult",
        "test",
        "Direct result completion",
      );
    }

    if (uriCompletionHandlers.size > 0) {
      console.log("\nTesting URI completion handlers:");

      await testUriHandler(
        uriCompletionHandlers,
        "weather-api://{city}#completeCityAsync",
        "s",
        "City completion for URI",
      );
    }
  }
}

class AsyncAutocompleteProvider {
  private readonly cityDatabase = new Map<string, string[]>();

  private readonly countryDatabase = new Map<string, string[]>();

  private readonly languageDatabase = new Map<string, string[]>();

  constructor() {
    this.cityDatabase.set("a", ["Amsterdam", "Athens", "Atlanta", "Austin"]);
    this.cityDatabase.set("b", ["Barcelona", "Berlin", "Boston", "Brussels"]);
    this.cityDatabase.set("c", ["Cairo", "Calgary", "Cape Town", "Chicago"]);
    this.cityDatabase.set("l", [
      "Lagos",
      "Lima",
      "Lisbon",
      "London",
      "Los Angeles",
    ]);
    this.cityDatabase.set("n", [
      "Nairobi",
      "Nashville",
      "New Delhi",
      "New York",
    ]);
    this.cityDatabase.set("p", ["Paris", "Perth", "Phoenix", "Prague"]);
    this.cityDatabase.set("s", [
      "San Francisco",
      "Santiago",
      "Seattle",
      "Seoul",
      "Shanghai",
      "Singapore",
      "Sydney",
    ]);
    this.cityDatabase.set("t", ["Taipei", "Tokyo", "Toronto"]);

    this.countryDatabase.set("a", [
      "Afghanistan",
      "Albania",
      "Algeria",
      "Argentina",
      "Australia",
      "Austria",
    ]);
    this.countryDatabase.set("b", ["Bahamas", "Belgium", "Brazil", "Bulgaria"]);
    this.countryDatabase.set("c", [
      "Canada",
      "Chile",
      "China",
      "Colombia",
      "Croatia",
    ]);
    this.countryDatabase.set("f", ["Finland", "France"]);
    this.countryDatabase.set("g", ["Germany", "Greece"]);
    this.countryDatabase.set("i", [
      "Iceland",
      "India",
      "Indonesia",
      "Ireland",
      "Italy",
    ]);
    this.countryDatabase.set("j", ["Japan"]);
    this.countryDatabase.set("u", [
      "Uganda",
      "Ukraine",
      "United Kingdom",
      "United States",
    ]);

    this.languageDatabase.set("e", ["English"]);
    this.languageDatabase.set("f", ["French"]);
    this.languageDatabase.set("g", ["German"]);
    this.languageDatabase.set("i", ["Italian"]);
    this.languageDatabase.set("j", ["Japanese"]);
    this.languageDatabase.set("m", ["Mandarin"]);
    this.languageDatabase.set("p", ["Portuguese"]);
    this.languageDatabase.set("r", ["Russian"]);
    this.languageDatabase.set("s", ["Spanish", "Swedish"]);
  }

  @McpComplete({ prompt: "travel-planner" })
  async completeCityNameAsync(
    args: McpCompleteMethodArguments,
  ): Promise<string[]> {
    const prefix = (args.value ?? "").toLowerCase();
    if (prefix.length === 0) {
      return ["Enter a city name"];
    }

    const firstLetter = prefix.slice(0, 1);
    const cities = this.cityDatabase.get(firstLetter) ?? [];
    return cities.filter((city) => city.toLowerCase().startsWith(prefix));
  }

  @McpComplete({ prompt: "travel-planner" })
  async completeCountryNameAsync(
    args: McpCompleteMethodArguments,
  ): Promise<CompleteResult> {
    const prefix = (args.value ?? "").toLowerCase();
    if (prefix.length === 0) {
      return {
        completion: {
          values: ["Enter a country name"],
          total: 1,
          hasMore: false,
        },
      };
    }

    const firstLetter = prefix.slice(0, 1);
    const countries = this.countryDatabase.get(firstLetter) ?? [];
    const matches = countries.filter((country) =>
      country.toLowerCase().startsWith(prefix),
    );

    return {
      completion: {
        values: matches,
        total: matches.length,
        hasMore: false,
      },
    };
  }

  @McpComplete({ prompt: "translator" })
  async completeLanguageNameAsync(
    args: McpCompleteMethodArguments,
  ): Promise<CompleteResult["completion"]> {
    void args.exchange;

    const prefix = (args.value ?? "").toLowerCase();
    if (prefix.length === 0) {
      return {
        values: ["Enter a language"],
        total: 1,
        hasMore: false,
      };
    }

    const firstLetter = prefix.slice(0, 1);
    const languages = this.languageDatabase.get(firstLetter) ?? [];
    const matches = languages.filter((language) =>
      language.toLowerCase().startsWith(prefix),
    );

    return {
      values: matches,
      total: matches.length,
      hasMore: false,
    };
  }

  @McpComplete({ prompt: "simple-prompt" })
  async completeSimpleValueAsync(
    args: McpCompleteMethodArguments,
  ): Promise<string> {
    return `Completed: ${args.value ?? ""}`;
  }

  @McpComplete({ uri: "weather-api://{city}" })
  async completeCityAsync(args: McpCompleteMethodArguments): Promise<string[]> {
    const prefix = (args.value ?? "").toLowerCase();
    if (prefix.length === 0) {
      return ["Enter a city name"];
    }

    const firstLetter = prefix.slice(0, 1);
    const cities = this.cityDatabase.get(firstLetter) ?? [];
    return cities.filter((city) => city.toLowerCase().startsWith(prefix));
  }

  @McpComplete({ prompt: "direct-result" })
  getDirectResult(args: McpCompleteMethodArguments): string[] {
    const prefix = (args.value ?? "").toLowerCase();
    if (prefix.length === 0) {
      return ["Enter a value"];
    }

    return [`Direct result for: ${prefix}`];
  }
}

async function testPromptHandler(
  handlers: Map<string, McpCompleteMethodCallback>,
  handlerKey: string,
  input: string,
  description: string,
): Promise<void> {
  const handler = handlers.get(handlerKey);

  if (handler == null) {
    console.log(`\nNo handler found for key: ${handlerKey}`);
    return;
  }

  console.log(`\nTesting ${description} with input: ${input}`);

  const exchange = createMockExchange();
  const promptName = handlerKey.split("#")[0] ?? "";
  const request = createPromptCompleteRequest(promptName, input);

  const result = await handler.apply(exchange, request);
  printCompletionResult(result);
}

async function testUriHandler(
  handlers: Map<string, McpCompleteMethodCallback>,
  handlerKey: string,
  input: string,
  description: string,
): Promise<void> {
  const handler = handlers.get(handlerKey);

  if (handler == null) {
    console.log(`\nNo handler found for key: ${handlerKey}`);
    return;
  }

  console.log(`\nTesting ${description} with input: ${input}`);

  const exchange = createMockExchange();
  const uriPattern = handlerKey.split("#")[0] ?? "";
  const request = createUriCompleteRequest(uriPattern, input);

  const result = await handler.apply(exchange, request);
  printCompletionResult(result);
}

function printCompletionResult(result: CompleteResult): void {
  console.log("Completion results:");

  if (result.completion.values.length === 0) {
    console.log("  No completions found");
    return;
  }

  for (const value of result.completion.values) {
    console.log(`  ${value}`);
  }

  console.log(`Total: ${result.completion.values.length} results`);
  if (result.completion.hasMore) {
    console.log("More results available");
  }
}

function createPromptCompleteRequest(
  promptName: string,
  input: string,
): CompleteRequest {
  return {
    params: {
      ref: {
        type: "ref/prompt",
        name: promptName,
      },
      argument: { value: input },
      _meta: { progressToken: "complete-token-1" },
    },
  } as unknown as CompleteRequest;
}

function createUriCompleteRequest(
  uriPattern: string,
  input: string,
): CompleteRequest {
  return {
    params: {
      ref: {
        type: "ref/resource",
        uri: uriPattern,
      },
      argument: { value: input },
      _meta: { progressToken: "complete-token-1" },
    },
  } as unknown as CompleteRequest;
}

function createMockExchange(): McpServerExchange {
  return Object.assign(Object.create(McpServerExchange.prototype), {
    transportContext: () => McpTransportContext.EMPTY,
  }) as McpServerExchange;
}

function extractUriVariables(uriTemplate: string): string[] {
  const matches = [...uriTemplate.matchAll(/\{([^/]+?)\}/g)];
  return matches.map((match) => match[1]);
}

void McpCompleteMethodCallbackExample;
