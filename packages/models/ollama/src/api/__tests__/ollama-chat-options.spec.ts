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

import { describe, expect, it } from "vitest";

import { OllamaChatOptions } from "../ollama-chat-options.js";

describe("OllamaChatOptions", () => {
  const countryJsonSchemaText = readFileSync(
    new URL("./country-json-schema.json", import.meta.url),
    "utf8",
  );
  const normalizedCountryJsonSchemaText = JSON.stringify(
    JSON.parse(countryJsonSchemaText),
  );

  it("builder should return new instances", () => {
    const builder = OllamaChatOptions.builder();
    const options1 = builder.build();
    const options2 = builder.build();

    expect(options1.constructor).toBe(OllamaChatOptions);
    expect(options2.constructor).toBe(OllamaChatOptions);
    expect(options1).toEqual(options2);
    expect(options1).not.toBe(options2);
  });

  it("test mutate behavior", () => {
    const builder = OllamaChatOptions.builder();
    const options1 = builder.build();
    const builder2 = options1.mutate();
    const options2 = builder2.build();
    const builder3 = options1.mutate();

    // mutate returns the correct type of builder
    expect(builder2.constructor).toBe(builder.constructor);
    expect(builder2).not.toBe(builder);

    expect(options1).not.toBe(options2);
    expect(options1).toEqual(options2);
    expect(options1.constructor).toBe(options2.constructor);

    // mutate returns a new builder each time
    expect(builder2).not.toBe(builder3);
  });

  it("test basic options", () => {
    const options = OllamaChatOptions.builder()
      .temperature(3.14)
      .topK(30)
      .stop(["a", "b", "c"])
      .build();

    const optionsMap = options.toMap();
    expect(optionsMap).toHaveProperty("temperature", 3.14);
    expect(optionsMap).toHaveProperty("top_k", 30);
    expect(optionsMap).toHaveProperty("stop", ["a", "b", "c"]);
  });

  it("test all numeric options", () => {
    const options = OllamaChatOptions.builder()
      .numCtx(2048)
      .numBatch(512)
      .numGPU(1)
      .mainGPU(0)
      .numThread(8)
      .numKeep(5)
      .seed(42)
      .numPredict(100)
      .topK(40)
      .topP(0.9)
      .tfsZ(1.0)
      .typicalP(1.0)
      .repeatLastN(64)
      .temperature(0.7)
      .repeatPenalty(1.1)
      .presencePenalty(0.0)
      .frequencyPenalty(0.0)
      .mirostat(2)
      .mirostatTau(5.0)
      .mirostatEta(0.1)
      .build();

    const optionsMap = options.toMap();
    expect(optionsMap).toHaveProperty("num_ctx", 2048);
    expect(optionsMap).toHaveProperty("num_batch", 512);
    expect(optionsMap).toHaveProperty("num_gpu", 1);
    expect(optionsMap).toHaveProperty("main_gpu", 0);
    expect(optionsMap).toHaveProperty("num_thread", 8);
    expect(optionsMap).toHaveProperty("num_keep", 5);
    expect(optionsMap).toHaveProperty("seed", 42);
    expect(optionsMap).toHaveProperty("num_predict", 100);
    expect(optionsMap).toHaveProperty("top_k", 40);
    expect(optionsMap).toHaveProperty("top_p", 0.9);
    expect(optionsMap).toHaveProperty("tfs_z", 1.0);
    expect(optionsMap).toHaveProperty("typical_p", 1.0);
    expect(optionsMap).toHaveProperty("repeat_last_n", 64);
    expect(optionsMap).toHaveProperty("temperature", 0.7);
    expect(optionsMap).toHaveProperty("repeat_penalty", 1.1);
    expect(optionsMap).toHaveProperty("presence_penalty", 0.0);
    expect(optionsMap).toHaveProperty("frequency_penalty", 0.0);
    expect(optionsMap).toHaveProperty("mirostat", 2);
    expect(optionsMap).toHaveProperty("mirostat_tau", 5.0);
    expect(optionsMap).toHaveProperty("mirostat_eta", 0.1);
  });

  it("test boolean options", () => {
    const options = OllamaChatOptions.builder()
      .truncate(true)
      .useNUMA(true)
      .lowVRAM(false)
      .f16KV(true)
      .logitsAll(false)
      .vocabOnly(false)
      .useMMap(true)
      .useMLock(false)
      .penalizeNewline(true)
      .build();

    const optionsMap = options.toMap();
    expect(optionsMap).toHaveProperty("truncate", true);
    expect(optionsMap).toHaveProperty("numa", true);
    expect(optionsMap).toHaveProperty("low_vram", false);
    expect(optionsMap).toHaveProperty("f16_kv", true);
    expect(optionsMap).toHaveProperty("logits_all", false);
    expect(optionsMap).toHaveProperty("vocab_only", false);
    expect(optionsMap).toHaveProperty("use_mmap", true);
    expect(optionsMap).toHaveProperty("use_mlock", false);
    expect(optionsMap).toHaveProperty("penalize_newline", true);
  });

  it("test model and format", () => {
    const options = OllamaChatOptions.builder()
      .model("llama2")
      .format("json")
      .build();

    const optionsMap = options.toMap();
    expect(optionsMap).toHaveProperty("model", "llama2");
    expect(optionsMap).toHaveProperty("format", "json");
  });

  it("test output schema option with json schema object as string", () => {
    const options = OllamaChatOptions.builder()
      .outputSchema(countryJsonSchemaText)
      .build();

    expect(options.outputSchema).toBe(normalizedCountryJsonSchemaText);
  });

  it("test output schema option with json as string", () => {
    expect(() => OllamaChatOptions.builder().outputSchema("json")).toThrow(
      SyntaxError,
    );
  });

  it("test function and tool options", () => {
    const options = OllamaChatOptions.builder()
      .toolNames("function1")
      .toolNames("function2")
      .toolNames("function3")
      .toolContext({
        key1: "value1",
        key2: "value2",
      })
      .build();

    // Function-related fields are not included in the map due to @JsonIgnore
    const optionsMap = options.toMap();
    expect(optionsMap).not.toHaveProperty("functions");
    expect(optionsMap).not.toHaveProperty("tool_context");

    // But they are accessible through getters
    expect(options.toolNames).toEqual(
      new Set(["function1", "function2", "function3"]),
    );
    expect(options.toolContext).toEqual({
      key1: "value1",
      key2: "value2",
    });
  });

  it("test function options with mutable set", () => {
    const functionSet = new Set<string>();
    functionSet.add("function1");
    functionSet.add("function2");

    const options = OllamaChatOptions.builder()
      .toolNames(functionSet)
      .toolNames("function3")
      .build();

    expect(options.toolNames).toEqual(
      new Set(["function1", "function2", "function3"]),
    );
  });

  it("test from options", () => {
    const originalOptions = OllamaChatOptions.builder()
      .model("llama2")
      .temperature(0.7)
      .topK(40)
      .toolNames(new Set(["function1"]))
      .build();

    const copiedOptions = OllamaChatOptions.fromOptions(originalOptions);

    // Test the copied options directly rather than through toMap()
    expect(copiedOptions.model).toBe("llama2");
    expect(copiedOptions.temperature).toBe(0.7);
    expect(copiedOptions.topK).toBe(40);
    expect(copiedOptions.toolNames).toEqual(new Set(["function1"]));
  });

  it("test function options not in map", () => {
    const options = OllamaChatOptions.builder()
      .model("llama2")
      .toolNames(new Set(["function1"]))
      .build();

    const optionsMap = options.toMap();

    // Verify function-related fields are not included in the map due to @JsonIgnore
    expect(optionsMap).toHaveProperty("model", "llama2");
    expect(optionsMap).not.toHaveProperty("functions");
    expect(optionsMap).not.toHaveProperty("toolCallbacks");
    expect(optionsMap).not.toHaveProperty("proxyToolCalls");
    expect(optionsMap).not.toHaveProperty("toolContext");

    // But verify they are still accessible through getters
    expect(options.toolNames).toEqual(new Set(["function1"]));
  });

  it("test deprecated methods", () => {
    const options = OllamaChatOptions.builder()
      .model("llama2")
      .temperature(0.7)
      .topK(40)
      .toolNames("function1")
      .build();

    const optionsMap = options.toMap();
    expect(optionsMap).toHaveProperty("model", "llama2");
    expect(optionsMap).toHaveProperty("temperature", 0.7);
    expect(optionsMap).toHaveProperty("top_k", 40);

    // Function is not in map but accessible via getter
    expect(options.toolNames).toEqual(new Set(["function1"]));
  });

  it("test empty options", () => {
    const options = OllamaChatOptions.builder().build();

    const optionsMap = options.toMap();
    expect(optionsMap).toEqual({});

    // Verify all getters return null/empty
    expect(options.model).toBeNull();
    expect(options.temperature).toBeNull();
    expect(options.topK).toBeNull();
    expect(options.toolNames).toEqual(new Set());
    expect(options.toolContext).toEqual({});
  });

  it("test null values not included in map", () => {
    const options = OllamaChatOptions.builder()
      .model("llama2")
      .temperature(null)
      .topK(null)
      .stop(null)
      .build();

    const optionsMap = options.toMap();
    expect(optionsMap).toHaveProperty("model", "llama2");
    expect(optionsMap).not.toHaveProperty("temperature");
    expect(optionsMap).not.toHaveProperty("top_k");
    expect(optionsMap).not.toHaveProperty("stop");
  });

  it("test zero values included in map", () => {
    const options = OllamaChatOptions.builder()
      .temperature(0.0)
      .topK(0)
      .mainGPU(0)
      .numGPU(0)
      .seed(0)
      .build();

    const optionsMap = options.toMap();
    expect(optionsMap).toHaveProperty("temperature", 0.0);
    expect(optionsMap).toHaveProperty("top_k", 0);
    expect(optionsMap).toHaveProperty("main_gpu", 0);
    expect(optionsMap).toHaveProperty("num_gpu", 0);
    expect(optionsMap).toHaveProperty("seed", 0);
  });

  /**
   * Demonstrates the difference between simple "json" format and JSON Schema format.
   *
   * Simple "json" format: Tells Ollama to return any valid JSON structure. JSON Schema
   * format: Tells Ollama to return JSON matching a specific schema.
   */
  it("test simple json format vs json schema", () => {
    const simpleJsonOptions = OllamaChatOptions.builder()
      .format("json")
      .build();

    const simpleJsonMap = simpleJsonOptions.toMap();
    expect(simpleJsonMap).toHaveProperty("format", "json");
    expect(simpleJsonOptions.outputSchema).toBe("json");

    const schemaOptions = OllamaChatOptions.builder()
      .outputSchema(countryJsonSchemaText)
      .build();

    const schemaMap = schemaOptions.toMap();
    expect(schemaMap).toHaveProperty("format");

    // Verify the schema contains expected structure
    const formatSchema = schemaMap["format"] as Record<string, unknown>;
    expect(formatSchema["type"]).toBe("object");
    expect(formatSchema).toHaveProperty("properties");
    expect(formatSchema).toHaveProperty("required");

    const formatOnlyOptions = OllamaChatOptions.builder()
      .format("json")
      .build();
    expect(formatOnlyOptions.outputSchema).toBe("json");

    const schemaRoundTrip = OllamaChatOptions.builder()
      .outputSchema(countryJsonSchemaText)
      .build();
    expect(schemaRoundTrip.outputSchema).toBe(normalizedCountryJsonSchemaText);
  });

  /**
   * Tests that setFormat("json") and getFormat() work correctly for simple JSON format.
   */
  it("test simple json format direct access", () => {
    const options = OllamaChatOptions.builder().format("json").build();

    expect(options.outputSchema).toBe("json");

    const optionsMap = options.toMap();
    expect(optionsMap).toHaveProperty("format", "json");

    // Verify it serializes correctly
    expect(options.outputSchema).toBe("json");
  });

  /**
   * Tests getOutputSchema() properly handles all format types: null, String, and Map.
   */
  it("test get output schema handles all format types", () => {
    const nullFormatOptions = OllamaChatOptions.builder().build();
    expect(() => nullFormatOptions.outputSchema).toThrow(
      "format must not be null",
    );

    const stringFormatOptions = OllamaChatOptions.builder()
      .format("json")
      .build();
    expect(stringFormatOptions.outputSchema).toBe("json");
    expect(stringFormatOptions.outputSchema).not.toContain('"');

    const schemaFormatOptions = OllamaChatOptions.builder()
      .outputSchema(countryJsonSchemaText)
      .build();
    const retrievedSchema = schemaFormatOptions.outputSchema;

    // Should be valid JSON
    expect(retrievedSchema).not.toBeNull();
    expect(retrievedSchema).toContain('"type"');
    expect(retrievedSchema).toContain('"properties"');
    expect(retrievedSchema).toContain('"required"');

    expect(retrievedSchema).toBe(normalizedCountryJsonSchemaText);
  });

  /**
   * Tests that setOutputSchema() properly handles JSON Schema strings.
   */
  it("test set output schema with valid json schema", () => {
    const options = OllamaChatOptions.builder()
      .outputSchema(countryJsonSchemaText)
      .build();

    // Format should be a Map, not a String
    expect(options.format).toEqual(JSON.parse(countryJsonSchemaText));

    // toMap() should contain the parsed schema
    const optionsMap = options.toMap();
    expect(optionsMap).toHaveProperty("format");
    expect(optionsMap["format"]).toEqual(JSON.parse(countryJsonSchemaText));

    // getOutputSchema() should return the original JSON string (ignoring whitespace)
    expect(options.outputSchema).toBe(normalizedCountryJsonSchemaText);
  });
});
