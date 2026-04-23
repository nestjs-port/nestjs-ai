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

import type {
  Metadata as AnthropicSdkMetadata,
  OutputConfig,
  ToolChoice,
} from "@anthropic-ai/sdk/resources/messages";
import { ms } from "@nestjs-port/core";
import { describe, expect, it } from "vitest";

import {
  AnthropicChatOptions,
  AnthropicCitationDocument,
  AnthropicServiceTier,
  AnthropicSkill,
  AnthropicSkillType,
  AnthropicWebSearchTool,
} from "../index.js";

describe("AnthropicChatOptions", () => {
  const toComparable = (options: AnthropicChatOptions) => ({
    model: options.model,
    maxTokens: options.maxTokens,
    temperature: options.temperature,
    httpHeaders: { ...options.httpHeaders },
  });

  it("build with all fields", () => {
    const metadata = { user_id: "userId_123" } as AnthropicSdkMetadata;
    const toolChoice = { type: "auto" } as ToolChoice;

    const options = AnthropicChatOptions.builder()
      .model("test-model")
      .maxTokens(100)
      .stopSequences(["stop1", "stop2"])
      .temperature(0.7)
      .topP(0.8)
      .topK(50)
      .metadata(metadata)
      .baseUrl("https://custom.api.com")
      .timeout(ms(120000))
      .maxRetries(5)
      .toolChoice(toolChoice)
      .disableParallelToolUse(true)
      .toolNames("tool1", "tool2")
      .toolContext({ key: "value" })
      .internalToolExecutionEnabled(true)
      .build();

    expect(options.model).toBe("test-model");
    expect(options.maxTokens).toBe(100);
    expect(options.stopSequences).toEqual(["stop1", "stop2"]);
    expect(options.temperature).toBe(0.7);
    expect(options.topP).toBe(0.8);
    expect(options.topK).toBe(50);
    expect(options.metadata).toEqual(metadata);
    expect(options.baseUrl).toBe("https://custom.api.com");
    expect(options.timeout).toBe(120000);
    expect(options.maxRetries).toBe(5);
    expect(options.toolChoice).toEqual(toolChoice);
    expect(options.disableParallelToolUse).toBe(true);
    expect(options.toolNames).toEqual(new Set(["tool1", "tool2"]));
    expect(options.toolContext).toEqual({ key: "value" });
    expect(options.internalToolExecutionEnabled).toBe(true);
  });

  it("build with model enum", () => {
    const options = AnthropicChatOptions.builder()
      .model("claude-sonnet-4-20250514")
      .build();

    expect(options.model).toBe("claude-sonnet-4-20250514");
  });

  it("copy creates independent instance", () => {
    const metadata = { user_id: "userId_123" } as AnthropicSdkMetadata;
    const mutableStops = ["stop1", "stop2"];
    const mutableContext: Record<string, unknown> = {
      key1: "value1",
    };

    const original = AnthropicChatOptions.builder()
      .model("test-model")
      .maxTokens(100)
      .stopSequences(mutableStops)
      .temperature(0.7)
      .topP(0.8)
      .topK(50)
      .metadata(metadata)
      .toolContext(mutableContext)
      .disableParallelToolUse(true)
      .build();

    const copied = original.copy();

    // Verify copied is equal but not same instance
    expect(copied).not.toBe(original);
    expect(copied).toEqual(original);

    // Verify collections are deep copied
    expect(copied.stopSequences).not.toBe(original.stopSequences);
    expect(copied.toolContext).not.toBe(original.toolContext);

    // Modify copy and verify original is unchanged
    copied.setModel("modified-model");
    copied.maxTokens = 200;
    expect(original.model).toBe("test-model");
    expect(original.maxTokens).toBe(100);

    // Modify original collections and verify copy is unchanged
    mutableStops.push("stop3");
    mutableContext.key2 = "value2";
    expect(copied.stopSequences).toHaveLength(2);
    expect(copied.toolContext).toHaveProperty("key1", "value1");
  });

  it("combine with overrides only non null values", () => {
    const base = AnthropicChatOptions.builder()
      .model("base-model")
      .maxTokens(100)
      .temperature(0.5)
      .topP(0.8)
      .baseUrl("https://base.api.com")
      .timeout(ms(60000))
      .build();

    const override = AnthropicChatOptions.builder()
      .model("override-model")
      .topK(40)
      // maxTokens, temperature, topP, baseUrl, timeout are null
      .build();

    const merged = base.mutate().combineWith(override.mutate()).build();

    // Override values take precedence
    expect(merged.model).toBe("override-model");
    expect(merged.topK).toBe(40);

    // Base values preserved when override is null
    expect(merged.maxTokens).toBe(100);
    expect(merged.temperature).toBe(0.5);
    expect(merged.topP).toBe(0.8);
    expect(merged.baseUrl).toBe("https://base.api.com");
    expect(merged.timeout).toBe(60000);
  });

  it("combine with collections", () => {
    const base = AnthropicChatOptions.builder()
      .stopSequences(["base-stop"])
      .toolNames(new Set(["base-tool"]))
      .toolContext({ baseKey: "base-value" })
      .build();

    const override = AnthropicChatOptions.builder()
      .stopSequences(["override-stop1", "override-stop2"])
      .toolNames(new Set(["override-tool"]))
      // toolContext is empty, should not override
      .build();

    const merged = base.mutate().combineWith(override.mutate()).build();

    // Non-empty collections from override take precedence
    expect(merged.stopSequences).toEqual(["override-stop1", "override-stop2"]);
    expect(merged.toolNames).toEqual(new Set(["override-tool"]));
    // Empty collections don't override
    expect(merged.toolContext).toEqual({ baseKey: "base-value" });
  });

  it("equals and hash code", () => {
    const options1 = AnthropicChatOptions.builder()
      .model("test-model")
      .maxTokens(100)
      .temperature(0.7)
      .build();

    const options2 = AnthropicChatOptions.builder()
      .model("test-model")
      .maxTokens(100)
      .temperature(0.7)
      .build();

    const options3 = AnthropicChatOptions.builder()
      .model("different-model")
      .maxTokens(100)
      .temperature(0.7)
      .build();

    // Equal objects
    expect(toComparable(options1)).toEqual(toComparable(options2));

    // Different objects
    expect(toComparable(options1)).not.toEqual(toComparable(options3));

    // Null and different type
    expect(options1).not.toEqual(null);
    expect(options1).not.toEqual("not an options object");
  });

  it("tool callbacks validation rejects null", () => {
    const options = new AnthropicChatOptions();

    expect(() => options.setToolCallbacks(null as never)).toThrow(
      "toolCallbacks cannot be null",
    );
  });

  it("tool names validation rejects null", () => {
    const options = new AnthropicChatOptions();

    expect(() => options.setToolNames(null as never)).toThrow(
      "toolNames cannot be null",
    );
  });

  it("default constants", () => {
    expect(AnthropicChatOptions.DEFAULT_MODEL).toBe("claude-haiku-4-5");
    expect(AnthropicChatOptions.DEFAULT_MAX_TOKENS).toBe(4096);
  });

  it("unsupported penalty methods return null", () => {
    const options = new AnthropicChatOptions();

    // Anthropic API does not support these OpenAI-specific parameters
    expect(options.frequencyPenalty).toBeNull();
    expect(options.presencePenalty).toBeNull();
  });

  it("implements structured output chat options", () => {
    const options = AnthropicChatOptions.builder().build();

    // Runtime proxy for the interface contract from the Java test.
    expect(typeof options.setOutputSchema).toBe("function");
    expect(options.outputSchema).toBeNull();
  });

  it("output schema round trip", () => {
    const schema =
      '{"type":"object","properties":{"name":{"type":"string"}},"required":["name"]}';

    const options = AnthropicChatOptions.builder().outputSchema(schema).build();

    expect(options.outputSchema).not.toBeNull();
    expect(options.outputConfig).not.toBeNull();
    expect(options.outputConfig?.format).toBeDefined();

    // Verify round-trip: the schema should parse and serialize back
    const roundTripped = options.outputSchema;
    expect(roundTripped).toContain('"type"');
    expect(roundTripped).toContain('"properties"');
    expect(roundTripped).toContain('"name"');
    expect(roundTripped).toContain('"required"');
  });

  it("effort configuration", () => {
    const options = AnthropicChatOptions.builder()
      .effort("high" as NonNullable<OutputConfig["effort"]>)
      .build();

    expect(options.outputConfig).not.toBeNull();
    expect(options.outputConfig).toEqual({ effort: "high" });
    // No format set, so outputSchema should be null
    expect(options.outputSchema).toBeNull();
  });

  it("output config with effort and schema", () => {
    const schema =
      '{"type":"object","properties":{"result":{"type":"string"}}}';

    const options = AnthropicChatOptions.builder()
      .effort("high" as NonNullable<OutputConfig["effort"]>)
      .outputSchema(schema)
      .build();

    expect(options.outputConfig).not.toBeNull();
    expect(options.outputConfig?.effort).toBe("high");
    expect(options.outputConfig?.format).toBeDefined();
    expect(options.outputSchema).toContain("result");
  });

  it("output config direct builder", () => {
    const outputConfig = {
      effort: "medium",
      format: {
        type: "json_schema",
        schema: {
          type: "object",
        },
      },
    } as OutputConfig;

    const options = AnthropicChatOptions.builder()
      .outputConfig(outputConfig)
      .build();

    expect(options.outputConfig).not.toBeNull();
    expect(options.outputConfig).toEqual(outputConfig);
    expect(options.outputSchema).toContain("object");
  });

  it("combine with preserves output config", () => {
    const outputConfig = {
      effort: "medium",
    } as OutputConfig;

    const base = AnthropicChatOptions.builder().model("base-model").build();
    const override = AnthropicChatOptions.builder()
      .outputConfig(outputConfig)
      .build();

    const merged = base.mutate().combineWith(override.mutate()).build();

    expect(merged.model).toBe("base-model");
    expect(merged.outputConfig).not.toBeNull();
    expect(merged.outputConfig?.effort).toBe("medium");
  });

  it("output config null schema resets config", () => {
    const options = AnthropicChatOptions.builder()
      .outputSchema('{"type":"object"}')
      .build();

    expect(options.outputConfig).not.toBeNull();

    options.setOutputSchema(null);
    expect(options.outputConfig).toBeNull();
    expect(options.outputSchema).toBeNull();
  });

  it("http headers builder", () => {
    const headers = {
      "X-Custom-Header": "value1",
      "X-Request-Id": "req-123",
    };

    const options = AnthropicChatOptions.builder().httpHeaders(headers).build();

    expect(options.httpHeaders).toEqual(headers);
  });

  it("http headers default empty", () => {
    const options = AnthropicChatOptions.builder().build();
    expect(options.httpHeaders).toEqual({});
  });

  it("http headers copied in mutate", () => {
    const headers = { "X-Custom": "value" };

    const original = AnthropicChatOptions.builder()
      .httpHeaders(headers)
      .build();
    const copied = original.mutate().build();

    expect(copied.httpHeaders).toEqual({ "X-Custom": "value" });

    // Verify deep copy — modifying original doesn't affect copy
    original.httpHeaders["X-New"] = "new-value";
    expect(copied.httpHeaders).not.toHaveProperty("X-New");
  });

  it("combine with preserves http headers", () => {
    const base = AnthropicChatOptions.builder()
      .httpHeaders({ "X-Base": "base-value" })
      .build();

    const override = AnthropicChatOptions.builder()
      .httpHeaders({ "X-Override": "override-value" })
      .build();

    const merged = base.mutate().combineWith(override.mutate()).build();

    // Override's non-empty headers replace base
    expect(merged.httpHeaders).toEqual({ "X-Override": "override-value" });
    expect(merged.httpHeaders).not.toHaveProperty("X-Base");
  });

  it("combine with empty http headers do not override", () => {
    const base = AnthropicChatOptions.builder()
      .httpHeaders({ "X-Base": "base-value" })
      .build();

    const override = AnthropicChatOptions.builder().build();

    const merged = base.mutate().combineWith(override.mutate()).build();

    // Base headers preserved when override is empty
    expect(merged.httpHeaders).toEqual({ "X-Base": "base-value" });
  });

  it("http headers in equals and hash code", () => {
    const options1 = AnthropicChatOptions.builder()
      .httpHeaders({ "X-Header": "value" })
      .build();

    const options2 = AnthropicChatOptions.builder()
      .httpHeaders({ "X-Header": "value" })
      .build();

    const options3 = AnthropicChatOptions.builder()
      .httpHeaders({ "X-Header": "different" })
      .build();

    expect(toComparable(options1)).toEqual(toComparable(options2));
    expect(toComparable(options1)).not.toEqual(toComparable(options3));
  });

  it("citation consistency validation passes", () => {
    const doc1 = AnthropicCitationDocument.builder()
      .plainText("Text 1")
      .title("Doc 1")
      .citationsEnabled(true)
      .build();
    const doc2 = AnthropicCitationDocument.builder()
      .plainText("Text 2")
      .title("Doc 2")
      .citationsEnabled(true)
      .build();

    // Should not throw — all documents have consistent citation settings
    const options = AnthropicChatOptions.builder()
      .citationDocuments([doc1, doc2])
      .build();

    expect(options.citationDocuments).toHaveLength(2);
  });

  it("citation consistency validation fails on mixed", () => {
    const enabled = AnthropicCitationDocument.builder()
      .plainText("Text 1")
      .title("Doc 1")
      .citationsEnabled(true)
      .build();
    const disabled = AnthropicCitationDocument.builder()
      .plainText("Text 2")
      .title("Doc 2")
      .citationsEnabled(false)
      .build();

    expect(() =>
      AnthropicChatOptions.builder()
        .citationDocuments([enabled, disabled])
        .build(),
    ).toThrow("consistent citation settings");
  });

  it("citation consistency validation skips empty", () => {
    // Should not throw — no documents
    const options = AnthropicChatOptions.builder().build();
    expect(options.citationDocuments).toEqual([]);
  });

  it("skill builder with string id", () => {
    const options = AnthropicChatOptions.builder().skill("xlsx").build();

    expect(options.skillContainer).not.toBeNull();
    expect(options.skillContainer?.skills).toHaveLength(1);
    expect(options.skillContainer?.skills[0].skillId).toBe("xlsx");
    expect(options.skillContainer?.skills[0].type).toBe(
      AnthropicSkillType.ANTHROPIC,
    );
    expect(options.skillContainer?.skills[0].version).toBe("latest");
  });

  it("skill builder with enum", () => {
    const options = AnthropicChatOptions.builder()
      .skill(AnthropicSkill.PPTX)
      .build();

    expect(options.skillContainer).not.toBeNull();
    expect(options.skillContainer?.skills[0].skillId).toBe("pptx");
    expect(options.skillContainer?.skills[0].type).toBe(
      AnthropicSkillType.ANTHROPIC,
    );
  });

  it("multiple skills", () => {
    const options = AnthropicChatOptions.builder()
      .skill(AnthropicSkill.XLSX)
      .skill(AnthropicSkill.PPTX)
      .build();

    expect(options.skillContainer).not.toBeNull();
    expect(options.skillContainer?.skills).toHaveLength(2);
    expect(options.skillContainer?.skills[0].skillId).toBe("xlsx");
    expect(options.skillContainer?.skills[1].skillId).toBe("pptx");
  });

  it("skill container copied in mutate", () => {
    const original = AnthropicChatOptions.builder()
      .skill(AnthropicSkill.XLSX)
      .skill(AnthropicSkill.PDF)
      .build();

    const copied = original.mutate().build();

    expect(copied.skillContainer).not.toBeNull();
    expect(copied.skillContainer?.skills).toHaveLength(2);
    expect(copied.skillContainer?.skills[0].skillId).toBe("xlsx");
    expect(copied.skillContainer?.skills[1].skillId).toBe("pdf");
  });

  it("combine with preserves skill container", () => {
    const base = AnthropicChatOptions.builder().model("base-model").build();
    const override = AnthropicChatOptions.builder()
      .skill(AnthropicSkill.DOCX)
      .build();

    const merged = base.mutate().combineWith(override.mutate()).build();

    expect(merged.model).toBe("base-model");
    expect(merged.skillContainer).not.toBeNull();
    expect(merged.skillContainer?.skills).toHaveLength(1);
    expect(merged.skillContainer?.skills[0].skillId).toBe("docx");
  });

  it("skill container default is null", () => {
    const options = AnthropicChatOptions.builder().build();
    expect(options.skillContainer).toBeNull();
  });

  it("inference geo builder", () => {
    const options = AnthropicChatOptions.builder().inferenceGeo("eu").build();
    expect(options.inferenceGeo).toBe("eu");
  });

  it("inference geo preserved in mutate", () => {
    const original = AnthropicChatOptions.builder().inferenceGeo("us").build();
    const copied = original.mutate().build();
    expect(copied.inferenceGeo).toBe("us");
  });

  it("inference geo combine with", () => {
    const base = AnthropicChatOptions.builder().inferenceGeo("us").build();
    const override = AnthropicChatOptions.builder().inferenceGeo("eu").build();

    const merged = base.mutate().combineWith(override.mutate()).build();
    expect(merged.inferenceGeo).toBe("eu");

    // Null doesn't override
    const noOverride = AnthropicChatOptions.builder().build();
    const merged2 = base.mutate().combineWith(noOverride.mutate()).build();
    expect(merged2.inferenceGeo).toBe("us");
  });

  it("web search tool builder", () => {
    const webSearch = new AnthropicWebSearchTool({
      allowedDomains: ["docs.spring.io"],
      blockedDomains: ["example.com"],
      maxUses: 5,
      userLocation: {
        city: "San Francisco",
        country: "US",
        region: "California",
        timezone: "America/Los_Angeles",
      },
    });

    const options = AnthropicChatOptions.builder()
      .webSearchTool(webSearch)
      .build();

    expect(options.webSearchTool).not.toBeNull();
    expect(options.webSearchTool?.allowedDomains).toEqual(["docs.spring.io"]);
    expect(options.webSearchTool?.blockedDomains).toEqual(["example.com"]);
    expect(options.webSearchTool?.maxUses).toBe(5);
    expect(options.webSearchTool?.userLocation).not.toBeNull();
    expect(options.webSearchTool?.userLocation?.city).toBe("San Francisco");
    expect(options.webSearchTool?.userLocation?.country).toBe("US");
  });

  it("web search tool preserved in mutate", () => {
    const webSearch = new AnthropicWebSearchTool({ maxUses: 3 });
    const original = AnthropicChatOptions.builder()
      .webSearchTool(webSearch)
      .build();
    const copied = original.mutate().build();

    expect(copied.webSearchTool).not.toBeNull();
    expect(copied.webSearchTool?.maxUses).toBe(3);
  });

  it("web search tool combine with", () => {
    const base = new AnthropicWebSearchTool({ maxUses: 3 });
    const override = new AnthropicWebSearchTool({ maxUses: 10 });

    const baseOpts = AnthropicChatOptions.builder().webSearchTool(base).build();
    const overrideOpts = AnthropicChatOptions.builder()
      .webSearchTool(override)
      .build();

    const merged = baseOpts.mutate().combineWith(overrideOpts.mutate()).build();
    expect(merged.webSearchTool?.maxUses).toBe(10);

    // Null doesn't override
    const noOverride = AnthropicChatOptions.builder().build();
    const merged2 = baseOpts.mutate().combineWith(noOverride.mutate()).build();
    expect(merged2.webSearchTool?.maxUses).toBe(3);
  });

  it("service tier builder", () => {
    const options = AnthropicChatOptions.builder()
      .serviceTier(AnthropicServiceTier.AUTO)
      .build();
    expect(options.serviceTier).toBe(AnthropicServiceTier.AUTO);
  });

  it("service tier preserved in mutate", () => {
    const original = AnthropicChatOptions.builder()
      .serviceTier(AnthropicServiceTier.STANDARD_ONLY)
      .build();
    const copied = original.mutate().build();
    expect(copied.serviceTier).toBe(AnthropicServiceTier.STANDARD_ONLY);
  });

  it("service tier combine with", () => {
    const base = AnthropicChatOptions.builder()
      .serviceTier(AnthropicServiceTier.STANDARD_ONLY)
      .build();
    const override = AnthropicChatOptions.builder()
      .serviceTier(AnthropicServiceTier.AUTO)
      .build();

    const merged = base.mutate().combineWith(override.mutate()).build();
    expect(merged.serviceTier).toBe(AnthropicServiceTier.AUTO);

    // Null doesn't override
    const noOverride = AnthropicChatOptions.builder().build();
    const merged2 = base.mutate().combineWith(noOverride.mutate()).build();
    expect(merged2.serviceTier).toBe(AnthropicServiceTier.STANDARD_ONLY);
  });

  it("thinking enabled with display", () => {
    const options = AnthropicChatOptions.builder()
      .thinkingEnabled(2048, "summarized" as never)
      .maxTokens(16384)
      .build();

    expect(options.thinking).not.toBeNull();
    expect(options.thinking).toEqual({
      type: "enabled",
      budget_tokens: 2048,
      display: "summarized",
    });
  });

  it("thinking enabled with omitted display", () => {
    const options = AnthropicChatOptions.builder()
      .thinkingEnabled(4096, "omitted" as never)
      .maxTokens(16384)
      .build();

    expect(options.thinking).toEqual({
      type: "enabled",
      budget_tokens: 4096,
      display: "omitted",
    });
  });

  it("thinking enabled without display has no display", () => {
    const options = AnthropicChatOptions.builder()
      .thinkingEnabled(2048)
      .maxTokens(16384)
      .build();

    expect(options.thinking).toEqual({
      type: "enabled",
      budget_tokens: 2048,
    });
  });

  it("thinking adaptive with display", () => {
    const options = AnthropicChatOptions.builder()
      .thinkingAdaptive("summarized" as never)
      .maxTokens(16384)
      .build();

    expect(options.thinking).not.toBeNull();
    expect(options.thinking).toEqual({
      type: "adaptive",
      display: "summarized",
    });
  });

  it("thinking adaptive with omitted display", () => {
    const options = AnthropicChatOptions.builder()
      .thinkingAdaptive("omitted" as never)
      .maxTokens(16384)
      .build();

    expect(options.thinking).toEqual({
      type: "adaptive",
      display: "omitted",
    });
  });

  it("thinking adaptive without display has no display", () => {
    const options = AnthropicChatOptions.builder()
      .thinkingAdaptive()
      .maxTokens(16384)
      .build();

    expect(options.thinking).toEqual({
      type: "adaptive",
    });
  });

  it("thinking display preserved in mutate", () => {
    const original = AnthropicChatOptions.builder()
      .thinkingEnabled(2048, "summarized" as never)
      .maxTokens(16384)
      .build();

    const copied = original.mutate().build();

    expect(copied.thinking).toEqual({
      type: "enabled",
      budget_tokens: 2048,
      display: "summarized",
    });
  });

  it("thinking display preserved in combine with", () => {
    const base = AnthropicChatOptions.builder()
      .model("base-model")
      .maxTokens(16384)
      .build();

    const override = AnthropicChatOptions.builder()
      .thinkingAdaptive("omitted" as never)
      .build();

    const merged = base.mutate().combineWith(override.mutate()).build();

    expect(merged.model).toBe("base-model");
    expect(merged.thinking).toEqual({
      type: "adaptive",
      display: "omitted",
    });
  });
});
