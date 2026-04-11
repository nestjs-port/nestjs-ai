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
import { resolve } from "node:path";
import {
  Media,
  MediaFormat,
  NoopObservationRegistry,
  type TemplateRenderer,
} from "@nestjs-ai/commons";
import {
  AssistantMessage,
  type ChatModel,
  type ChatOptions,
  ChatResponse,
  DefaultToolCallingChatOptions,
  FunctionToolCallback,
  Generation,
  ListOutputConverter,
  type Message,
  Prompt,
  SystemMessage,
  type ToolCallback,
  UserMessage,
} from "@nestjs-ai/model";
import { TestObservationRegistry } from "@nestjs-ai/testing";
import { defaultIfEmpty, lastValueFrom, type Observable, of } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import type { Advisor, BaseAdvisorChain } from "../advisor";
import { SimpleLoggerAdvisor } from "../advisor";
import type { ChatClient } from "../chat-client";
import { DefaultChatClient } from "../default-chat-client";
import { DefaultChatClientBuilder } from "../default-chat-client-builder";
import type { ChatClientObservationConvention } from "../observation";

class Person {
  name = "";
}

type InputType = {
  input: string;
};

const PersonSchema = z.object({
  name: z.string(),
});
const InputTypeSchema = z.object({
  input: z.string(),
});

function asRequestSpec(
  spec: ChatClient.ChatClientRequestSpec,
): DefaultChatClient.DefaultChatClientRequestSpec {
  return spec as unknown as DefaultChatClient.DefaultChatClientRequestSpec;
}

function requestData(spec: DefaultChatClient.DefaultChatClientRequestSpec) {
  return spec as unknown as {
    _optionsCustomizer: ChatOptions.Builder | null;
    _messages: Message[];
    _advisors: Advisor[];
    _toolNames: string[];
    _toolCallbacks: ToolCallback[];
    _toolContext: Record<string, unknown>;
    _systemText: string | null;
    _systemParams: Record<string, unknown>;
    _systemMetadata: Record<string, unknown>;
    _userText: string | null;
    _userParams: Record<string, unknown>;
    _userMetadata: Record<string, unknown>;
    _media: Media[];
    _templateRenderer: TemplateRenderer;
    _advisorParams: Record<string, unknown>;
  };
}

function createResponse(content: string | null): ChatResponse {
  return new ChatResponse({
    generations: [
      new Generation({
        assistantMessage: new AssistantMessage({ content }),
      }),
    ],
  });
}

function createChatModel(
  callImpl?: (prompt: Prompt) => Promise<ChatResponse | null>,
  streamImpl?: (prompt: Prompt) => Observable<ChatResponse>,
): ChatModel {
  let capturedPrompt!: Prompt;
  const model = {
    call: vi.fn(async (prompt: Prompt) => {
      capturedPrompt = prompt;
      if (callImpl) {
        return callImpl(prompt);
      }
      return createResponse("response");
    }),
    stream: vi.fn((prompt: Prompt) => {
      capturedPrompt = prompt;
      if (streamImpl) {
        return streamImpl(prompt);
      }
      return of(createResponse("response"));
    }),
    get defaultOptions() {
      return new DefaultToolCallingChatOptions();
    },
  } as unknown as ChatModel;

  (model as unknown as { __getPrompt: () => Prompt }).__getPrompt = () =>
    capturedPrompt;

  return model;
}

function getCapturedPrompt(chatModel: ChatModel): Prompt {
  return (chatModel as unknown as { __getPrompt: () => Prompt }).__getPrompt();
}

const userPromptResource = readFileSync(
  resolve(__dirname, "./user-prompt.txt"),
);
const systemPromptResource = readFileSync(
  resolve(__dirname, "./system-prompt.txt"),
);
const tabbyCatResource = readFileSync(resolve(__dirname, "./tabby-cat.png"));

describe("DefaultChatClient", () => {
  describe("Constructor", () => {
    it("when chat client request is null then throw", () => {
      expect(
        () =>
          new DefaultChatClient(
            null as unknown as DefaultChatClient.DefaultChatClientRequestSpec,
          ),
      ).toThrow("defaultChatClientRequest cannot be null");
    });
  });

  describe("ChatClient", () => {
    it("when prompt then return", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      expect(chatClient.prompt()).toBeDefined();
    });

    it("when prompt content is empty then throw", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      expect(() => chatClient.prompt("")).toThrow(
        "content cannot be null or empty",
      );
    });

    it("when prompt content then return", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      const spec = asRequestSpec(chatClient.prompt("my question"));
      const data = requestData(spec);
      expect(data._messages).toHaveLength(1);
      expect(data._messages[0]?.text).toBe("my question");
    });

    it("when prompt with messages then return", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      const prompt = new Prompt([
        new SystemMessage({ content: "instructions" }),
        new UserMessage({ content: "my question" }),
      ]);
      const spec = asRequestSpec(chatClient.prompt(prompt));
      const data = requestData(spec);
      expect(data._messages).toHaveLength(2);
      expect(data._messages[0]?.text).toBe("instructions");
      expect(data._messages[1]?.text).toBe("my question");
      expect(data._optionsCustomizer).toBeNull();
    });

    it("when prompt with options then return", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      const chatOptions = new DefaultToolCallingChatOptions();
      const prompt = new Prompt([], chatOptions);
      const spec = asRequestSpec(chatClient.prompt(prompt));
      const data = requestData(spec);
      expect(data._messages).toHaveLength(0);
      expect(data._optionsCustomizer).toBeNull();
    });

    it("test mutate", () => {
      const media = new Media({
        mimeType: MediaFormat.IMAGE_PNG,
        data: tabbyCatResource,
      });
      const toolCallback = {
        get toolDefinition() {
          return { name: "tool", description: "", inputSchema: "{}" };
        },
        call: () => "",
      } as unknown as ToolCallback;
      const advisor = new SimpleLoggerAdvisor();
      const templateRenderer = {
        render: (v: string) => v,
      } as unknown as TemplateRenderer;
      const chatOptions = new DefaultToolCallingChatOptions();
      const copyChatOptions = new DefaultToolCallingChatOptions();
      const chatOptionsSpy = vi
        .spyOn(chatOptions, "copy")
        .mockReturnValue(copyChatOptions as unknown as ChatOptions);
      const toolContext = new Map<string, unknown>([["k", "v"]]);
      const userMessage1 = new UserMessage({ content: "u1" });
      const userMessage2 = new UserMessage({ content: "u2" });

      const builder = new DefaultChatClientBuilder(createChatModel());
      builder.addMessages([userMessage1, userMessage2]);
      const original = builder
        .defaultAdvisors(advisor)
        .defaultOptions(chatOptions.mutate())
        .defaultUser((u) =>
          u
            .text("original user {userParams}")
            .param("userParams", "user value2")
            .media(media)
            .metadata("userMetadata", "user data3"),
        )
        .defaultSystem((s) =>
          s
            .text("original system {sysParams}")
            .param("sysParams", "system value1"),
        )
        .defaultTemplateRenderer(templateRenderer)
        .defaultToolNames("toolName1", "toolName2")
        .defaultToolCallbacks(toolCallback)
        .defaultToolContext(toolContext)
        .build();

      const originalSpec = asRequestSpec(original.prompt());
      const mutated = original.mutate().build();
      const mutatedSpec = asRequestSpec(mutated.prompt());
      const data = requestData(mutatedSpec);
      const builtOptions = data._optionsCustomizer?.build() as
        | DefaultToolCallingChatOptions
        | undefined;

      expect(mutatedSpec).not.toBe(originalSpec);
      expect(data._messages).toHaveLength(2);
      expect(data._advisors).toHaveLength(1);
      expect(builtOptions?.toolCallbacks).toEqual(
        copyChatOptions.toolCallbacks,
      );
      expect(builtOptions?.toolNames).toEqual(copyChatOptions.toolNames);
      expect(builtOptions?.toolContext).toEqual(copyChatOptions.toolContext);
      expect(data._userText).toBe("original user {userParams}");
      expect(data._userParams.userParams).toBe("user value2");
      expect(data._userMetadata.userMetadata).toBe("user data3");
      expect(data._media).toHaveLength(1);
      expect(data._systemText).toBe("original system {sysParams}");
      expect(data._systemParams.sysParams).toBe("system value1");
      expect(data._templateRenderer).toBe(templateRenderer);
      expect(data._toolNames).toEqual(["toolName1", "toolName2"]);
      expect(data._toolCallbacks).toEqual([toolCallback]);
      expect(data._toolContext.k).toBe("v");

      chatOptionsSpy.mockRestore();
    });

    it("when mutate chat client request", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      const spec = asRequestSpec(chatClient.prompt().user("my question"));

      const newChatClientBuilder = spec.mutate();
      newChatClientBuilder.defaultUser("another question");
      const newSpec = asRequestSpec(newChatClientBuilder.build().prompt());

      expect(requestData(spec)._userText).toBe("my question");
      expect(requestData(newSpec)._userText).toBe("another question");
    });
  });

  describe("DefaultPromptUserSpec", () => {
    it("build prompt user spec", () => {
      const spec = new DefaultChatClient.DefaultPromptUserSpec();
      expect(spec).toBeDefined();
      expect(spec.mediaValue).toBeDefined();
      expect(spec.paramsValue).toBeDefined();
      expect(spec.metadataValue).toBeDefined();
      expect(spec.textValue).toBeNull();
    });

    it("when user media is null then throw", () => {
      const spec = new DefaultChatClient.DefaultPromptUserSpec();
      expect(() => spec.media(null as unknown as Media)).toThrow(
        "media cannot contain null elements",
      );
    });

    it("when user media contains null elements then throw", () => {
      const spec = new DefaultChatClient.DefaultPromptUserSpec();
      expect(() =>
        spec.media(null as unknown as Media, null as unknown as Media),
      ).toThrow("media cannot contain null elements");
    });

    it("when user media then return", () => {
      const spec = new DefaultChatClient.DefaultPromptUserSpec();
      const mediaUri = "http://example.com/image.png";
      spec.media(
        new Media({ mimeType: MediaFormat.IMAGE_PNG, data: mediaUri }),
      );
      expect(spec.mediaValue).toHaveLength(1);
      expect(spec.mediaValue[0]?.mimeType).toBe(MediaFormat.IMAGE_PNG);
      expect(spec.mediaValue[0]?.data).toBe(mediaUri);
    });

    it("when user media mime type is null with url then throw", () => {
      const spec = new DefaultChatClient.DefaultPromptUserSpec();
      const mediaUrl = new URL("http://example.com/image.png");
      expect(() =>
        spec.media(null as unknown as MediaFormat, mediaUrl),
      ).toThrow("media cannot contain null elements");
    });

    it("when user media url is null then throw", () => {
      const spec = new DefaultChatClient.DefaultPromptUserSpec();
      expect(() =>
        spec.media(MediaFormat.IMAGE_PNG, null as unknown as URL),
      ).toThrow("resource cannot be null");
    });

    it("when user media mime type and url then return", () => {
      const spec = new DefaultChatClient.DefaultPromptUserSpec();
      const mediaUrl = new URL("http://example.com/image.png");
      spec.media(MediaFormat.IMAGE_PNG, mediaUrl);
      expect(spec.mediaValue).toHaveLength(1);
      expect(spec.mediaValue[0]?.mimeType).toBe(MediaFormat.IMAGE_PNG);
      expect(spec.mediaValue[0]?.data).toBe(mediaUrl);
    });

    it("when user media mime type is null with resource then throw", () => {
      const spec = new DefaultChatClient.DefaultPromptUserSpec();
      expect(() =>
        spec.media(null as unknown as MediaFormat, tabbyCatResource),
      ).toThrow("media cannot contain null elements");
    });

    it("when user media resource is null then throw", () => {
      const spec = new DefaultChatClient.DefaultPromptUserSpec();
      expect(() =>
        spec.media(MediaFormat.IMAGE_PNG, null as unknown as Buffer),
      ).toThrow("resource cannot be null");
    });

    it("when user media mime type and resource then return", () => {
      const spec = new DefaultChatClient.DefaultPromptUserSpec();
      spec.media(MediaFormat.IMAGE_PNG, tabbyCatResource);
      expect(spec.mediaValue).toHaveLength(1);
      expect(spec.mediaValue[0]?.mimeType).toBe(MediaFormat.IMAGE_PNG);
      expect(spec.mediaValue[0]?.data).toBe(tabbyCatResource);
    });

    it("when user text string is null then throw", () => {
      const spec = new DefaultChatClient.DefaultPromptUserSpec();
      expect(() => spec.text(null as unknown as string)).toThrow(
        "text cannot be null",
      );
    });

    it("when user text string is empty then throw", () => {
      const spec = new DefaultChatClient.DefaultPromptUserSpec();
      expect(() => spec.text("")).toThrow("text cannot be null or empty");
    });

    it("when user text string then return", () => {
      const spec = new DefaultChatClient.DefaultPromptUserSpec();
      spec.text("my question");
      expect(spec.textValue).toBe("my question");
    });

    it("when user text resource is null with charset then throw", () => {
      const spec = new DefaultChatClient.DefaultPromptUserSpec();
      expect(() => spec.text(null as unknown as Buffer, "utf-8")).toThrow(
        "text cannot be null",
      );
    });

    it("when user text charset is null with resource then throw", () => {
      const spec = new DefaultChatClient.DefaultPromptUserSpec();
      expect(() =>
        spec.text(userPromptResource, null as unknown as BufferEncoding),
      ).toThrow("charset cannot be null");
    });

    it("when user text resource and charset then return", () => {
      const spec = new DefaultChatClient.DefaultPromptUserSpec();
      spec.text(userPromptResource, "utf-8");
      expect(spec.textValue).toBe("my question");
    });

    it("when user text resource is null then throw", () => {
      const spec = new DefaultChatClient.DefaultPromptUserSpec();
      expect(() => spec.text(null as unknown as Buffer)).toThrow(
        "text cannot be null",
      );
    });

    it("when user text resource then return", () => {
      const spec = new DefaultChatClient.DefaultPromptUserSpec();
      spec.text(userPromptResource);
      expect(spec.textValue).toBe("my question");
    });

    it("when user param key is null then throw", () => {
      const spec = new DefaultChatClient.DefaultPromptUserSpec();
      expect(() => spec.param(null as unknown as string, "value")).toThrow(
        "key cannot be null or empty",
      );
    });

    it("when user param key is empty then throw", () => {
      const spec = new DefaultChatClient.DefaultPromptUserSpec();
      expect(() => spec.param("", "value")).toThrow(
        "key cannot be null or empty",
      );
    });

    it("when user param value is null then throw", () => {
      const spec = new DefaultChatClient.DefaultPromptUserSpec();
      expect(() => spec.param("key", null)).toThrow("value cannot be null");
    });

    it("when user param key value then return", () => {
      const spec = new DefaultChatClient.DefaultPromptUserSpec();
      spec.param("key", "value");
      expect(spec.paramsValue.get("key")).toBe("value");
    });

    it("when user params is null then throw", () => {
      const spec = new DefaultChatClient.DefaultPromptUserSpec();
      expect(() =>
        spec.params(null as unknown as Map<string, unknown>),
      ).toThrow("params cannot be null");
    });

    it("when user params key is null then throw", () => {
      const spec = new DefaultChatClient.DefaultPromptUserSpec();
      const params = new Map<string, unknown>();
      params.set(null as unknown as string, "value");
      expect(() => spec.params(params)).toThrow(
        "param keys cannot contain null elements",
      );
    });

    it("when user params value is null then throw", () => {
      const spec = new DefaultChatClient.DefaultPromptUserSpec();
      const params = new Map<string, unknown>([["key", null]]);
      expect(() => spec.params(params)).toThrow(
        "param values cannot contain null elements",
      );
    });

    it("when user params then return", () => {
      const spec = new DefaultChatClient.DefaultPromptUserSpec();
      spec.params(new Map<string, unknown>([["key", "value"]]));
      expect(spec.paramsValue.get("key")).toBe("value");
    });

    it("when user metadata key is null then throw", () => {
      const spec = new DefaultChatClient.DefaultPromptUserSpec();
      expect(() => spec.metadata(null as unknown as string, "value")).toThrow(
        "metadata cannot be null",
      );
    });

    it("when user metadata key is empty then throw", () => {
      const spec = new DefaultChatClient.DefaultPromptUserSpec();
      expect(() => spec.metadata("", "value")).toThrow(
        "metadata key cannot be null or empty",
      );
    });

    it("when user metadata value is null then throw", () => {
      const spec = new DefaultChatClient.DefaultPromptUserSpec();
      expect(() => spec.metadata("key", null)).toThrow(
        "metadata value cannot be null",
      );
    });

    it("when user metadata key value then return", () => {
      const spec = new DefaultChatClient.DefaultPromptUserSpec();
      spec.metadata("key", "value");
      expect(spec.metadataValue.get("key")).toBe("value");
    });

    it("when user metadata is null then throw", () => {
      const spec = new DefaultChatClient.DefaultPromptUserSpec();
      expect(() =>
        spec.metadata(null as unknown as Map<string, unknown>),
      ).toThrow("metadata cannot be null");
    });

    it("when user metadata map key is null then throw", () => {
      const spec = new DefaultChatClient.DefaultPromptUserSpec();
      const metadata = new Map<string, unknown>();
      metadata.set(null as unknown as string, "value");
      expect(() => spec.metadata(metadata)).toThrow(
        "metadata keys cannot contain null elements",
      );
    });

    it("when user metadata map value is null then throw", () => {
      const spec = new DefaultChatClient.DefaultPromptUserSpec();
      const metadata = new Map<string, unknown>([["key", null]]);
      expect(() => spec.metadata(metadata)).toThrow(
        "metadata values cannot contain null elements",
      );
    });

    it("when user metadata then return", () => {
      const spec = new DefaultChatClient.DefaultPromptUserSpec();
      spec.metadata(new Map<string, unknown>([["key", "value"]]));
      expect(spec.metadataValue.get("key")).toBe("value");
    });
  });

  describe("DefaultPromptSystemSpec", () => {
    it("build prompt system spec", () => {
      const spec = new DefaultChatClient.DefaultPromptSystemSpec();
      expect(spec).toBeDefined();
      expect(spec.paramsValue).toBeDefined();
      expect(spec.metadataValue).toBeDefined();
      expect(spec.textValue).toBeNull();
    });

    it("when system text string is null then throw", () => {
      const spec = new DefaultChatClient.DefaultPromptSystemSpec();
      expect(() => spec.text(null as unknown as string)).toThrow(
        "text cannot be null",
      );
    });

    it("when system text string is empty then throw", () => {
      const spec = new DefaultChatClient.DefaultPromptSystemSpec();
      expect(() => spec.text("")).toThrow("text cannot be null or empty");
    });

    it("when system text string then return", () => {
      const spec = new DefaultChatClient.DefaultPromptSystemSpec();
      spec.text("instructions");
      expect(spec.textValue).toBe("instructions");
    });

    it("when system text resource is null with charset then throw", () => {
      const spec = new DefaultChatClient.DefaultPromptSystemSpec();
      expect(() => spec.text(null as unknown as Buffer, "utf-8")).toThrow(
        "text cannot be null",
      );
    });

    it("when system text charset is null with resource then throw", () => {
      const spec = new DefaultChatClient.DefaultPromptSystemSpec();
      expect(() =>
        spec.text(systemPromptResource, null as unknown as BufferEncoding),
      ).toThrow("charset cannot be null");
    });

    it("when system text resource and charset then return", () => {
      const spec = new DefaultChatClient.DefaultPromptSystemSpec();
      spec.text(systemPromptResource, "utf-8");
      expect(spec.textValue).toBe("instructions");
    });

    it("when system text resource is null then throw", () => {
      const spec = new DefaultChatClient.DefaultPromptSystemSpec();
      expect(() => spec.text(null as unknown as Buffer)).toThrow(
        "text cannot be null",
      );
    });

    it("when system text resource then return", () => {
      const spec = new DefaultChatClient.DefaultPromptSystemSpec();
      spec.text(systemPromptResource);
      expect(spec.textValue).toBe("instructions");
    });

    it("when system param key is null then throw", () => {
      const spec = new DefaultChatClient.DefaultPromptSystemSpec();
      expect(() => spec.param(null as unknown as string, "value")).toThrow(
        "key cannot be null or empty",
      );
    });

    it("when system param key is empty then throw", () => {
      const spec = new DefaultChatClient.DefaultPromptSystemSpec();
      expect(() => spec.param("", "value")).toThrow(
        "key cannot be null or empty",
      );
    });

    it("when system param value is null then throw", () => {
      const spec = new DefaultChatClient.DefaultPromptSystemSpec();
      expect(() => spec.param("key", null)).toThrow("value cannot be null");
    });

    it("when system param key value then return", () => {
      const spec = new DefaultChatClient.DefaultPromptSystemSpec();
      spec.param("key", "value");
      expect(spec.paramsValue.get("key")).toBe("value");
    });

    it("when system params is null then throw", () => {
      const spec = new DefaultChatClient.DefaultPromptSystemSpec();
      expect(() =>
        spec.params(null as unknown as Map<string, unknown>),
      ).toThrow("params cannot be null");
    });

    it("when system params key is null then throw", () => {
      const spec = new DefaultChatClient.DefaultPromptSystemSpec();
      const params = new Map<string, unknown>();
      params.set(null as unknown as string, "value");
      expect(() => spec.params(params)).toThrow(
        "param keys cannot contain null elements",
      );
    });

    it("when system params value is null then throw", () => {
      const spec = new DefaultChatClient.DefaultPromptSystemSpec();
      const params = new Map<string, unknown>([["key", null]]);
      expect(() => spec.params(params)).toThrow(
        "param values cannot contain null elements",
      );
    });

    it("when system params then return", () => {
      const spec = new DefaultChatClient.DefaultPromptSystemSpec();
      spec.params(new Map<string, unknown>([["key", "value"]]));
      expect(spec.paramsValue.get("key")).toBe("value");
    });

    it("when system metadata key is null then throw", () => {
      const spec = new DefaultChatClient.DefaultPromptSystemSpec();
      expect(() => spec.metadata(null as unknown as string, "value")).toThrow(
        "metadata cannot be null",
      );
    });

    it("when system metadata key is empty then throw", () => {
      const spec = new DefaultChatClient.DefaultPromptSystemSpec();
      expect(() => spec.metadata("", "value")).toThrow(
        "metadata key cannot be null or empty",
      );
    });

    it("when system metadata value is null then throw", () => {
      const spec = new DefaultChatClient.DefaultPromptSystemSpec();
      expect(() => spec.metadata("key", null)).toThrow(
        "metadata value cannot be null",
      );
    });

    it("when system metadata key value then return", () => {
      const spec = new DefaultChatClient.DefaultPromptSystemSpec();
      spec.metadata("key", "value");
      expect(spec.metadataValue.get("key")).toBe("value");
    });

    it("when system metadata is null then throw", () => {
      const spec = new DefaultChatClient.DefaultPromptSystemSpec();
      expect(() =>
        spec.metadata(null as unknown as Map<string, unknown>),
      ).toThrow("metadata cannot be null");
    });

    it("when system metadata map key is null then throw", () => {
      const spec = new DefaultChatClient.DefaultPromptSystemSpec();
      const metadata = new Map<string, unknown>();
      metadata.set(null as unknown as string, "value");
      expect(() => spec.metadata(metadata)).toThrow(
        "metadata keys cannot contain null elements",
      );
    });

    it("when system metadata map value is null then throw", () => {
      const spec = new DefaultChatClient.DefaultPromptSystemSpec();
      const metadata = new Map<string, unknown>([["key", null]]);
      expect(() => spec.metadata(metadata)).toThrow(
        "metadata values cannot contain null elements",
      );
    });

    it("when system metadata then return", () => {
      const spec = new DefaultChatClient.DefaultPromptSystemSpec();
      spec.metadata(new Map<string, unknown>([["key", "value"]]));
      expect(spec.metadataValue.get("key")).toBe("value");
    });
  });

  describe("DefaultAdvisorSpec", () => {
    it("build advisor spec", () => {
      const spec = new DefaultChatClient.DefaultAdvisorSpec();
      expect(spec).toBeDefined();
      expect(spec.advisorsValue).toBeDefined();
      expect(spec.paramsValue).toBeDefined();
    });

    it("when advisor param key value then return", () => {
      const spec = new DefaultChatClient.DefaultAdvisorSpec();
      spec.param("key", "value");
      expect(spec.paramsValue.get("key")).toBe("value");
    });

    it("when advisor param key is null then throw", () => {
      const spec = new DefaultChatClient.DefaultAdvisorSpec();
      expect(() => spec.param(null as unknown as string, "value")).toThrow(
        "key cannot be null or empty",
      );
    });

    it("when advisor param key is empty then throw", () => {
      const spec = new DefaultChatClient.DefaultAdvisorSpec();
      expect(() => spec.param("", "value")).toThrow(
        "key cannot be null or empty",
      );
    });

    it("when advisor param value is null then throw", () => {
      const spec = new DefaultChatClient.DefaultAdvisorSpec();
      expect(() => spec.param("key", null)).toThrow("value cannot be null");
    });

    it("when advisor params is null then throw", () => {
      const spec = new DefaultChatClient.DefaultAdvisorSpec();
      expect(() =>
        spec.params(null as unknown as Map<string, unknown>),
      ).toThrow("params cannot be null");
    });

    it("when advisor key is null then throw", () => {
      const spec = new DefaultChatClient.DefaultAdvisorSpec();
      const params = new Map<string, unknown>();
      params.set(null as unknown as string, "value");
      expect(() => spec.params(params)).toThrow(
        "param keys cannot contain null elements",
      );
    });

    it("when advisor params value is null then throw", () => {
      const spec = new DefaultChatClient.DefaultAdvisorSpec();
      const params = new Map<string, unknown>([["key", null]]);
      expect(() => spec.params(params)).toThrow(
        "param values cannot contain null elements",
      );
    });

    it("when advisor params then return", () => {
      const spec = new DefaultChatClient.DefaultAdvisorSpec();
      spec.params(new Map<string, unknown>([["key", "value"]]));
      expect(spec.paramsValue.get("key")).toBe("value");
    });

    it("when advisors is null then throw", () => {
      const spec = new DefaultChatClient.DefaultAdvisorSpec();
      expect(() => spec.advisors(null as unknown as Advisor)).toThrow(
        "advisors cannot contain null elements",
      );
    });

    it("when advisors contains null elements then throw", () => {
      const spec = new DefaultChatClient.DefaultAdvisorSpec();
      expect(() =>
        spec.advisors(null as unknown as Advisor, null as unknown as Advisor),
      ).toThrow("advisors cannot contain null elements");
    });

    it("when advisor list is null then throw", () => {
      const spec = new DefaultChatClient.DefaultAdvisorSpec();
      expect(() => spec.advisors(null as unknown as Advisor[])).toThrow(
        "advisors cannot contain null elements",
      );
    });

    it("when advisor list contains null elements then throw", () => {
      const spec = new DefaultChatClient.DefaultAdvisorSpec();
      expect(() =>
        spec.advisors([null as unknown as Advisor, null as unknown as Advisor]),
      ).toThrow("advisors cannot contain null elements");
    });

    it("when advisor list then return", () => {
      const spec = new DefaultChatClient.DefaultAdvisorSpec();
      const advisor = new SimpleLoggerAdvisor();
      spec.advisors([advisor]);
      expect(spec.advisorsValue).toHaveLength(1);
      expect(spec.advisorsValue[0]).toBe(advisor);
    });

    it("when advisors then return", () => {
      const spec = new DefaultChatClient.DefaultAdvisorSpec();
      const advisor = new SimpleLoggerAdvisor();
      spec.advisors(advisor);
      expect(spec.advisorsValue).toHaveLength(1);
      expect(spec.advisorsValue[0]).toBe(advisor);
    });
  });

  describe("DefaultCallResponseSpec", () => {
    it("build call response spec", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      const spec = asRequestSpec(chatClient.prompt("question")).call();
      expect(spec).toBeDefined();
    });

    it("build call response spec with null request", () => {
      expect(
        () =>
          new DefaultChatClient.DefaultCallResponseSpec(
            null as never,
            {} as BaseAdvisorChain,
            NoopObservationRegistry.INSTANCE,
            {} as ChatClientObservationConvention,
          ),
      ).toThrow("chatClientRequest cannot be null");
    });

    it("build call response spec with null advisor chain", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      const responseSpec = asRequestSpec(
        chatClient.prompt("question"),
      ).call() as unknown as {
        _request: unknown;
      };
      expect(
        () =>
          new DefaultChatClient.DefaultCallResponseSpec(
            responseSpec._request as never,
            null as never,
            NoopObservationRegistry.INSTANCE,
            {} as ChatClientObservationConvention,
          ),
      ).toThrow("advisorChain cannot be null");
    });

    it("build call response spec with null observation registry", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      const responseSpec = asRequestSpec(
        chatClient.prompt("question"),
      ).call() as unknown as {
        _request: unknown;
      };
      expect(
        () =>
          new DefaultChatClient.DefaultCallResponseSpec(
            responseSpec._request as never,
            {} as BaseAdvisorChain,
            null as never,
            {} as ChatClientObservationConvention,
          ),
      ).toThrow("observationRegistry cannot be null");
    });

    it("build call response spec with null observation convention", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      const responseSpec = asRequestSpec(
        chatClient.prompt("question"),
      ).call() as unknown as {
        _request: unknown;
      };
      expect(
        () =>
          new DefaultChatClient.DefaultCallResponseSpec(
            responseSpec._request as never,
            {} as BaseAdvisorChain,
            NoopObservationRegistry.INSTANCE,
            null as never,
          ),
      ).toThrow("observationConvention cannot be null");
    });

    it("when simple prompt then chat client response", async () => {
      const chatModel = createChatModel();
      const chatClient = new DefaultChatClientBuilder(chatModel).build();
      const spec = asRequestSpec(chatClient.prompt("my question")).call();

      const chatClientResponse = await spec.chatClientResponse();
      expect(chatClientResponse).toBeDefined();
      expect(chatClientResponse.chatResponse?.result?.output.text).toBe(
        "response",
      );

      const actualPrompt = getCapturedPrompt(chatModel);
      expect(actualPrompt?.instructions).toHaveLength(1);
      expect(actualPrompt?.instructions[0]?.text).toBe("my question");
    });

    it("when simple prompt then set request and response on observation context", async () => {
      const chatModel = createChatModel();
      const observationRegistry = TestObservationRegistry.create();
      const chatClient = new DefaultChatClientBuilder(
        chatModel,
        observationRegistry,
        null,
        null,
      ).build();
      const spec = asRequestSpec(chatClient.prompt("my question")).call();
      const chatClientResponse = await spec.chatClientResponse();

      expect(chatClientResponse.chatResponse?.result?.output.text).toBe(
        "response",
      );
      expect(observationRegistry.contexts.length).toBeGreaterThan(0);
    });

    it("when simple prompt then chat response", async () => {
      const chatModel = createChatModel();
      const chatClient = new DefaultChatClientBuilder(chatModel).build();
      const spec = asRequestSpec(chatClient.prompt("my question")).call();
      const chatResponse = await spec.chatResponse();
      expect(chatResponse?.result?.output.text).toBe("response");
    });

    it("when full prompt then chat response", async () => {
      const chatModel = createChatModel();
      const chatClient = new DefaultChatClientBuilder(chatModel).build();
      const prompt = new Prompt([
        new SystemMessage({ content: "instructions" }),
        new UserMessage({ content: "my question" }),
      ]);
      const spec = asRequestSpec(chatClient.prompt(prompt)).call();
      await spec.chatResponse();

      const actualPrompt = getCapturedPrompt(chatModel);
      expect(actualPrompt?.instructions).toHaveLength(2);
      expect(actualPrompt?.instructions[0]?.text).toBe("instructions");
      expect(actualPrompt?.instructions[1]?.text).toBe("my question");
    });

    it("when prompt and user text then chat response", async () => {
      const chatModel = createChatModel();
      const chatClient = new DefaultChatClientBuilder(chatModel).build();
      const prompt = new Prompt([
        new SystemMessage({ content: "instructions" }),
        new UserMessage({ content: "my question" }),
      ]);
      await asRequestSpec(chatClient.prompt(prompt).user("another question"))
        .call()
        .chatResponse();

      const actualPrompt = getCapturedPrompt(chatModel);
      expect(actualPrompt?.instructions).toHaveLength(3);
      expect(actualPrompt?.instructions[2]?.text).toBe("another question");
    });

    it("when user text and messages then chat response", async () => {
      const chatModel = createChatModel();
      const chatClient = new DefaultChatClientBuilder(chatModel).build();
      const messages: Message[] = [
        new SystemMessage({ content: "instructions" }),
        new UserMessage({ content: "my question" }),
      ];
      await asRequestSpec(
        chatClient.prompt().user("another question").messages(messages),
      )
        .call()
        .chatResponse();

      const actualPrompt = getCapturedPrompt(chatModel);
      expect(actualPrompt?.instructions).toHaveLength(3);
      expect(actualPrompt?.instructions[2]?.text).toBe("another question");
    });

    it("when chat response is null", async () => {
      const chatModel = createChatModel(async () => null);
      const chatClient = new DefaultChatClientBuilder(chatModel).build();
      const chatResponse = await asRequestSpec(chatClient.prompt("my question"))
        .call()
        .chatResponse();
      expect(chatResponse).toBeNull();
    });

    it("when chat response content is null", async () => {
      const chatModel = createChatModel(async () => createResponse(null));
      const chatClient = new DefaultChatClientBuilder(chatModel).build();
      const content = await asRequestSpec(chatClient.prompt("my question"))
        .call()
        .content();
      expect(content).toBeNull();
    });

    it("when response entity with converter is null", async () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      await expect(
        asRequestSpec(chatClient.prompt("my question"))
          .call()
          .responseEntity(null as unknown as ListOutputConverter),
      ).rejects.toThrow("Schema cannot be null");
    });

    it("when response entity with converter and chat response content null", async () => {
      const chatModel = createChatModel(async () => createResponse(null));
      const chatClient = new DefaultChatClientBuilder(chatModel).build();
      const responseEntity = await asRequestSpec(
        chatClient.prompt("my question"),
      )
        .call()
        .responseEntity(new ListOutputConverter());
      expect(responseEntity.response).not.toBeNull();
      expect(responseEntity.entity).toBeNull();
    });

    it("when response entity with converter", async () => {
      const chatModel = createChatModel(async () =>
        createResponse("James Bond, Ethan Hunt, Jason Bourne"),
      );
      const chatClient = new DefaultChatClientBuilder(chatModel).build();
      const responseEntity = await asRequestSpec(
        chatClient.prompt("my question"),
      )
        .call()
        .responseEntity(new ListOutputConverter());
      expect(responseEntity.response).not.toBeNull();
      expect(responseEntity.entity).toHaveLength(3);
    });

    it("when response entity with type is null", async () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      await expect(
        asRequestSpec(chatClient.prompt("my question"))
          .call()
          .responseEntity(null as unknown as z.ZodObject<z.ZodRawShape>),
      ).rejects.toThrow("Schema cannot be null");
    });

    it("when response entity with type", async () => {
      const chatModel = createChatModel(async () =>
        createResponse('{ "name": "James Bond" }'),
      );
      const chatClient = new DefaultChatClientBuilder(chatModel).build();
      const responseEntity = await asRequestSpec(
        chatClient.prompt("my question"),
      )
        .call()
        .responseEntity(PersonSchema, Person);
      expect(responseEntity.response).not.toBeNull();
      expect(responseEntity.entity).not.toBeNull();
      expect(responseEntity.entity?.name).toBe("James Bond");
    });

    it("when entity with converter is null", async () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      await expect(
        asRequestSpec(chatClient.prompt("my question"))
          .call()
          .entity(null as unknown as ListOutputConverter),
      ).rejects.toThrow("Schema cannot be null");
    });

    it("when entity with converter and chat response content null", async () => {
      const chatModel = createChatModel(async () => createResponse(null));
      const chatClient = new DefaultChatClientBuilder(chatModel).build();
      const entity = await asRequestSpec(chatClient.prompt("my question"))
        .call()
        .entity(new ListOutputConverter());
      expect(entity).toBeNull();
    });

    it("when entity with converter", async () => {
      const chatModel = createChatModel(async () =>
        createResponse("James Bond, Ethan Hunt, Jason Bourne"),
      );
      const chatClient = new DefaultChatClientBuilder(chatModel).build();
      const entity = await asRequestSpec(chatClient.prompt("my question"))
        .call()
        .entity(new ListOutputConverter());
      expect(entity).toHaveLength(3);
    });

    it("when entity with type is null", async () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      await expect(
        asRequestSpec(chatClient.prompt("my question"))
          .call()
          .entity(null as unknown as z.ZodObject<z.ZodRawShape>),
      ).rejects.toThrow("Schema cannot be null");
    });

    it("when entity with type and chat response content null", async () => {
      const chatModel = createChatModel(async () => createResponse(null));
      const chatClient = new DefaultChatClientBuilder(chatModel).build();
      const entity = await asRequestSpec(chatClient.prompt("my question"))
        .call()
        .entity(PersonSchema);
      expect(entity).toBeNull();
    });

    it("when entity with type", async () => {
      const chatModel = createChatModel(async () =>
        createResponse('{ "name": "James Bond" }'),
      );
      const chatClient = new DefaultChatClientBuilder(chatModel).build();
      const entity = await asRequestSpec(chatClient.prompt("my question"))
        .call()
        .entity(PersonSchema, Person);
      expect(entity).not.toBeNull();
      expect((entity as Person).name).toBe("James Bond");
    });

    it("when entity schema type is invalid then fails at compile time", () => {
      const entity =
        (() => {}) as unknown as ChatClient.CallResponseSpec["entity"];

      // @ts-expect-error schema must be a JSON Schema object, not a raw JSON array
      entity([]);

      // @ts-expect-error non-JSON zod schema is not supported
      entity(z.string());

      // @ts-expect-error zod array items must be JSON object schemas
      entity(z.array(z.string()));

      entity({
        // @ts-expect-error invalid JSON Schema type literal
        type: "not-a-valid-json-schema-type",
      });

      // @ts-expect-error invalid JSON Schema required keyword
      entity({
        type: "object",
        required: "name",
      });

      expect(true).toBe(true);
    });
  });

  describe("DefaultStreamResponseSpec", () => {
    it("build stream response spec", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      const spec = asRequestSpec(chatClient.prompt("question")).stream();
      expect(spec).toBeDefined();
    });

    it("build stream response spec with null request", () => {
      expect(
        () =>
          new DefaultChatClient.DefaultStreamResponseSpec(
            null as never,
            {} as BaseAdvisorChain,
            NoopObservationRegistry.INSTANCE,
            {} as ChatClientObservationConvention,
          ),
      ).toThrow("chatClientRequest cannot be null");
    });

    it("build stream response spec with null advisor chain", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      const responseSpec = asRequestSpec(
        chatClient.prompt("question"),
      ).stream() as unknown as {
        _request: unknown;
      };
      expect(
        () =>
          new DefaultChatClient.DefaultStreamResponseSpec(
            responseSpec._request as never,
            null as never,
            NoopObservationRegistry.INSTANCE,
            {} as ChatClientObservationConvention,
          ),
      ).toThrow("advisorChain cannot be null");
    });

    it("build stream response spec with null observation registry", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      const responseSpec = asRequestSpec(
        chatClient.prompt("question"),
      ).stream() as unknown as {
        _request: unknown;
      };
      expect(
        () =>
          new DefaultChatClient.DefaultStreamResponseSpec(
            responseSpec._request as never,
            {} as BaseAdvisorChain,
            null as never,
            {} as ChatClientObservationConvention,
          ),
      ).toThrow("observationRegistry cannot be null");
    });

    it("build stream response spec with null observation convention", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      const responseSpec = asRequestSpec(
        chatClient.prompt("question"),
      ).stream() as unknown as {
        _request: unknown;
      };
      expect(
        () =>
          new DefaultChatClient.DefaultStreamResponseSpec(
            responseSpec._request as never,
            {} as BaseAdvisorChain,
            NoopObservationRegistry.INSTANCE,
            null as never,
          ),
      ).toThrow("observationConvention cannot be null");
    });

    it("when simple prompt then flux chat client response", async () => {
      const chatModel = createChatModel(undefined, () =>
        of(createResponse("response")),
      );
      const chatClient = new DefaultChatClientBuilder(chatModel).build();
      const response = await lastValueFrom(
        asRequestSpec(chatClient.prompt("my question"))
          .stream()
          .chatClientResponse(),
      );

      expect(response.chatResponse?.result?.output.text).toBe("response");
      const prompt = getCapturedPrompt(chatModel);
      expect(prompt?.instructions).toHaveLength(1);
      expect(prompt?.instructions[0]?.text).toBe("my question");
    });

    it("when simple prompt then set flux response on observation context", async () => {
      const chatModel = createChatModel(undefined, () =>
        of(createResponse("response")),
      );
      const observationRegistry = TestObservationRegistry.create();
      const chatClient = new DefaultChatClientBuilder(
        chatModel,
        observationRegistry,
        null,
        null,
      ).build();
      await lastValueFrom(
        asRequestSpec(chatClient.prompt("my question"))
          .stream()
          .chatClientResponse(),
      );
      expect(observationRegistry.contexts.length).toBeGreaterThan(0);
    });

    it("when simple prompt then flux chat response", async () => {
      const chatModel = createChatModel(undefined, () =>
        of(createResponse("response")),
      );
      const chatClient = new DefaultChatClientBuilder(chatModel).build();
      const response = await lastValueFrom(
        asRequestSpec(chatClient.prompt("my question")).stream().chatResponse(),
      );
      expect(response.result?.output.text).toBe("response");
    });

    it("when full prompt then flux chat response", async () => {
      const chatModel = createChatModel(undefined, () =>
        of(createResponse("response")),
      );
      const chatClient = new DefaultChatClientBuilder(chatModel).build();
      const prompt = new Prompt([
        new SystemMessage({ content: "instructions" }),
        new UserMessage({ content: "my question" }),
      ]);
      await lastValueFrom(
        asRequestSpec(chatClient.prompt(prompt)).stream().chatResponse(),
      );
      const actualPrompt = getCapturedPrompt(chatModel);
      expect(actualPrompt?.instructions).toHaveLength(2);
    });

    it("when prompt and user text then flux chat response", async () => {
      const chatModel = createChatModel(undefined, () =>
        of(createResponse("response")),
      );
      const chatClient = new DefaultChatClientBuilder(chatModel).build();
      const prompt = new Prompt([
        new SystemMessage({ content: "instructions" }),
        new UserMessage({ content: "my question" }),
      ]);
      await lastValueFrom(
        asRequestSpec(chatClient.prompt(prompt).user("another question"))
          .stream()
          .chatResponse(),
      );
      const actualPrompt = getCapturedPrompt(chatModel);
      expect(actualPrompt?.instructions).toHaveLength(3);
    });

    it("when user text and messages then flux chat response", async () => {
      const chatModel = createChatModel(undefined, () =>
        of(createResponse("response")),
      );
      const chatClient = new DefaultChatClientBuilder(chatModel).build();
      const messages: Message[] = [
        new SystemMessage({ content: "instructions" }),
        new UserMessage({ content: "my question" }),
      ];
      await lastValueFrom(
        asRequestSpec(
          chatClient.prompt().user("another question").messages(messages),
        )
          .stream()
          .chatResponse(),
      );
      const actualPrompt = getCapturedPrompt(chatModel);
      expect(actualPrompt?.instructions).toHaveLength(3);
    });

    it("when chat response content is null then return flux", async () => {
      const chatModel = createChatModel(undefined, () =>
        of(createResponse(null)),
      );
      const chatClient = new DefaultChatClientBuilder(chatModel).build();
      const content = await lastValueFrom(
        asRequestSpec(chatClient.prompt("my question"))
          .stream()
          .content()
          .pipe(defaultIfEmpty(null)),
      );
      expect(content).toBeNull();
    });
  });

  describe("DefaultChatClientRequestSpec", () => {
    it("build chat client request spec", () => {
      const chatModel = createChatModel();
      const spec = new DefaultChatClient.DefaultChatClientRequestSpec(
        chatModel,
        null,
        {},
        {},
        null,
        {},
        {},
        [],
        [],
        [],
        [],
        [],
        null,
        [],
        {},
        NoopObservationRegistry.INSTANCE,
        null,
        {},
        null,
        null,
      );
      expect(spec).toBeDefined();
    });

    it("when chat model is null then throw", () => {
      expect(
        () =>
          new DefaultChatClient.DefaultChatClientRequestSpec(
            null as never,
            null,
            {},
            {},
            null,
            {},
            {},
            [],
            [],
            [],
            [],
            [],
            null,
            [],
            {},
            NoopObservationRegistry.INSTANCE,
            null,
            {},
            null,
            null,
          ),
      ).toThrow("chatModel cannot be null");
    });

    it("when observation registry is null then throw", () => {
      expect(
        () =>
          new DefaultChatClient.DefaultChatClientRequestSpec(
            createChatModel(),
            null,
            {},
            {},
            null,
            {},
            {},
            [],
            [],
            [],
            [],
            [],
            null,
            [],
            {},
            null as never,
            null,
            {},
            null,
            null,
          ),
      ).toThrow("observationRegistry cannot be null");
    });

    it("when advisor consumer then return", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      const loggerAdvisor = new SimpleLoggerAdvisor();
      const spec = asRequestSpec(
        chatClient
          .prompt()
          .advisors((advisor) =>
            advisor.advisors(loggerAdvisor).param("topic", "AI"),
          ),
      );
      const data = requestData(spec);
      expect(data._advisors).toContain(loggerAdvisor);
      expect(data._advisorParams.topic).toBe("AI");
    });

    it("when advisor consumer is null then throw", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      expect(() =>
        chatClient.prompt().advisors(null as unknown as () => void),
      ).toThrow("advisors cannot contain null elements");
    });

    it("when request advisors with null elements then throw", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      expect(() =>
        chatClient.prompt().advisors(null as unknown as Advisor),
      ).toThrow("advisors cannot contain null elements");
    });

    it("when request advisor list is null then throw", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      expect(() =>
        chatClient.prompt().advisors(null as unknown as Advisor[]),
      ).toThrow("advisors cannot contain null elements");
    });

    it("when request advisor list with null elements then throw", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      expect(() =>
        chatClient
          .prompt()
          .advisors([null as unknown as Advisor, null as unknown as Advisor]),
      ).toThrow("advisors cannot contain null elements");
    });

    it("when request advisor list then return", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      const advisor = new SimpleLoggerAdvisor();
      const spec = asRequestSpec(chatClient.prompt().advisors([advisor]));
      expect(requestData(spec)._advisors).toContain(advisor);
    });

    it("when request advisors then return", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      const advisor = new SimpleLoggerAdvisor();
      const spec = asRequestSpec(chatClient.prompt().advisors(advisor));
      expect(requestData(spec)._advisors).toContain(advisor);
    });

    it("when messages with null elements then throw", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      expect(() =>
        chatClient.prompt().messages(null as unknown as Message),
      ).toThrow("messages cannot contain null elements");
    });

    it("when messages then return", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      const message = new UserMessage({ content: "question" });
      const spec = asRequestSpec(chatClient.prompt().messages(message));
      expect(requestData(spec)._messages).toContain(message);
    });

    it("when message list is null then throw", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      expect(() =>
        chatClient.prompt().messages(null as unknown as Message[]),
      ).toThrow("messages cannot contain null elements");
    });

    it("when message list with null elements then throw", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      expect(() =>
        chatClient
          .prompt()
          .messages([null as unknown as Message, null as unknown as Message]),
      ).toThrow("messages cannot contain null elements");
    });

    it("when message list then return", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      const message = new UserMessage({ content: "question" });
      const spec = asRequestSpec(chatClient.prompt().messages([message]));
      expect(requestData(spec)._messages).toContain(message);
    });

    it("when options is null then throw", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      expect(() =>
        chatClient.prompt().options(null as unknown as ChatOptions.Builder),
      ).toThrow("customizer cannot be null");
    });

    it("when options then return", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      const options = new DefaultToolCallingChatOptions();
      const spec = asRequestSpec(chatClient.prompt().options(options.mutate()));
      const builtOptions = requestData(spec)._optionsCustomizer?.build() as
        | DefaultToolCallingChatOptions
        | undefined;
      expect(builtOptions?.toolCallbacks).toEqual(options.toolCallbacks);
      expect(builtOptions?.toolNames).toEqual(options.toolNames);
      expect(builtOptions?.toolContext).toEqual(options.toolContext);
    });

    it("when tool names element is null then throw", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      expect(() =>
        chatClient.prompt().toolNames("myTool", null as unknown as string),
      ).toThrow("toolNames cannot contain null elements");
    });

    it("when tool names then return", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      const spec = asRequestSpec(chatClient.prompt().toolNames("myTool"));
      expect(requestData(spec)._toolNames).toContain("myTool");
    });

    it("when tool callbacks element is null then throw", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      const callback = {
        get toolDefinition() {
          return { name: "x", description: "", inputSchema: "{}" };
        },
        call: () => "",
      } as unknown as ToolCallback;
      expect(() =>
        chatClient
          .prompt()
          .toolCallbacks(callback, null as unknown as ToolCallback),
      ).toThrow("toolCallbacks cannot contain null elements");
    });

    it("when tool callbacks then return", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      const callback = {
        get toolDefinition() {
          return { name: "x", description: "", inputSchema: "{}" };
        },
        call: () => "",
      } as unknown as ToolCallback;
      const spec = asRequestSpec(chatClient.prompt().toolCallbacks(callback));
      expect(requestData(spec)._toolCallbacks).toContain(callback);
    });

    it("when function name is null then throw", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      expect(() =>
        chatClient.prompt().toolCallbacks(
          FunctionToolCallback.builder(
            null as unknown as string,
            (_input: InputType) => "hello",
          )
            .description("description")
            .inputType(InputTypeSchema)
            .build(),
        ),
      ).toThrow("name cannot be null or empty");
    });

    it("when function name is empty then throw", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      expect(() =>
        chatClient.prompt().toolCallbacks(
          FunctionToolCallback.builder("", (_input: InputType) => "hello")
            .description("description")
            .inputType(InputTypeSchema)
            .build(),
        ),
      ).toThrow("name cannot be null or empty");
    });

    it("when function then return", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      const spec = asRequestSpec(
        chatClient.prompt().toolCallbacks(
          FunctionToolCallback.builder("name", (_input: InputType) => "hello")
            .inputType(InputTypeSchema)
            .description("description")
            .build(),
        ),
      );
      expect(
        requestData(spec)._toolCallbacks.some(
          (callback) => callback.toolDefinition.name === "name",
        ),
      ).toBe(true);
    });

    it("when bi function name is null then throw", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      expect(() =>
        chatClient.prompt().toolCallbacks(
          FunctionToolCallback.builder(
            null as unknown as string,
            (_input: InputType, _ctx) => "hello",
          )
            .description("description")
            .inputType(InputTypeSchema)
            .build(),
        ),
      ).toThrow("name cannot be null or empty");
    });

    it("when bi function name is empty then throw", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      expect(() =>
        chatClient.prompt().toolCallbacks(
          FunctionToolCallback.builder("", (_input: InputType, _ctx) => "hello")
            .description("description")
            .inputType(InputTypeSchema)
            .build(),
        ),
      ).toThrow("name cannot be null or empty");
    });

    it("when bi function then return", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      const spec = asRequestSpec(
        chatClient.prompt().toolCallbacks(
          FunctionToolCallback.builder(
            "name",
            (_input: InputType, _ctx) => "hello",
          )
            .description("description")
            .inputType(InputTypeSchema)
            .build(),
        ),
      );
      expect(
        requestData(spec)._toolCallbacks.some(
          (callback) => callback.toolDefinition.name === "name",
        ),
      ).toBe(true);
    });

    it("when tool context is null then throw", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      expect(() =>
        chatClient
          .prompt()
          .toolContext(null as unknown as Map<string, unknown>),
      ).toThrow("toolContext cannot be null");
    });

    it("when tool context key is null then throw", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      const toolContext = new Map<string, unknown>();
      toolContext.set(null as unknown as string, "value");
      expect(() => chatClient.prompt().toolContext(toolContext)).toThrow(
        "toolContext keys cannot contain null elements",
      );
    });

    it("when tool context value is null then throw", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      const toolContext = new Map<string, unknown>([["key", null]]);
      expect(() => chatClient.prompt().toolContext(toolContext)).toThrow(
        "toolContext values cannot contain null elements",
      );
    });

    it("when tool context then return", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      const spec = asRequestSpec(
        chatClient.prompt().toolContext(new Map([["key", "value"]])),
      );
      expect(requestData(spec)._toolContext.key).toBe("value");
    });

    it("when system text is null then throw", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      expect(() =>
        chatClient.prompt().system(null as unknown as string),
      ).toThrow("text cannot be null");
    });

    it("when system text is empty then throw", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      expect(() => chatClient.prompt().system("")).toThrow(
        "text cannot be null or empty",
      );
    });

    it("when system resource is null with charset then throw", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      expect(() =>
        chatClient.prompt().system(null as unknown as Buffer, "utf-8"),
      ).toThrow("text cannot be null");
    });

    it("when system charset is null with resource then throw", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      expect(() =>
        chatClient
          .prompt()
          .system(systemPromptResource, null as unknown as BufferEncoding),
      ).toThrow("charset cannot be null");
    });

    it("when system resource and charset then return", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      const spec = asRequestSpec(
        chatClient.prompt().system(systemPromptResource, "utf-8"),
      );
      expect(requestData(spec)._systemText).toBe("instructions");
    });

    it("when system resource is null then throw", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      expect(() =>
        chatClient.prompt().system(null as unknown as Buffer),
      ).toThrow("text cannot be null");
    });

    it("when system resource then return", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      const spec = asRequestSpec(
        chatClient.prompt().system(systemPromptResource),
      );
      expect(requestData(spec)._systemText).toBe("instructions");
    });

    it("when system text then return", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      const spec = asRequestSpec(
        chatClient.prompt().system((system) => system.text("instructions")),
      );
      expect(requestData(spec)._systemText).toBe("instructions");
    });

    it("when system consumer then return", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      const spec = asRequestSpec(
        chatClient
          .prompt()
          .system((system) =>
            system
              .text("my instruction about {topic}")
              .param("topic", "AI")
              .metadata("msgId", "uuid-xxx"),
          ),
      );
      const data = requestData(spec);
      expect(data._systemText).toBe("my instruction about {topic}");
      expect(data._systemParams.topic).toBe("AI");
      expect(data._systemMetadata.msgId).toBe("uuid-xxx");
    });

    it("when system consumer is null then throw", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      expect(() =>
        chatClient.prompt().system(null as unknown as () => void),
      ).toThrow("text cannot be null");
    });

    it("when system consumer with existing system text then return", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      const spec = asRequestSpec(
        chatClient
          .prompt()
          .system("my instruction")
          .system((system) =>
            system
              .text("my instruction about {topic}")
              .param("topic", "AI")
              .metadata("msgId", "uuid-xxx"),
          ),
      );
      const data = requestData(spec);
      expect(data._systemText).toBe("my instruction about {topic}");
      expect(data._systemParams.topic).toBe("AI");
      expect(data._systemMetadata.msgId).toBe("uuid-xxx");
    });

    it("when system consumer without system text then return", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      const spec = asRequestSpec(
        chatClient
          .prompt()
          .system("my instruction about {topic}")
          .system((system) =>
            system.param("topic", "AI").metadata("msgId", "uuid-xxx"),
          ),
      );
      const data = requestData(spec);
      expect(data._systemText).toBe("my instruction about {topic}");
      expect(data._systemParams.topic).toBe("AI");
      expect(data._systemMetadata.msgId).toBe("uuid-xxx");
    });

    it("when user text is null then throw", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      expect(() => chatClient.prompt().user(null as unknown as string)).toThrow(
        "text cannot be null",
      );
    });

    it("when user text is empty then throw", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      expect(() => chatClient.prompt().user("")).toThrow(
        "text cannot be null or empty",
      );
    });

    it("when user resource is null with charset then throw", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      expect(() =>
        chatClient.prompt().user(null as unknown as Buffer, "utf-8"),
      ).toThrow("text cannot be null");
    });

    it("when user charset is null with resource then throw", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      expect(() =>
        chatClient
          .prompt()
          .user(userPromptResource, null as unknown as BufferEncoding),
      ).toThrow("charset cannot be null");
    });

    it("when user resource and charset then return", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      const spec = asRequestSpec(
        chatClient.prompt().user(userPromptResource, "utf-8"),
      );
      expect(requestData(spec)._userText).toBe("my question");
    });

    it("when user resource is null then throw", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      expect(() => chatClient.prompt().user(null as unknown as Buffer)).toThrow(
        "text cannot be null",
      );
    });

    it("when user resource then return", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      const spec = asRequestSpec(chatClient.prompt().user(userPromptResource));
      expect(requestData(spec)._userText).toBe("my question");
    });

    it("when user text then return", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      const spec = asRequestSpec(
        chatClient.prompt().user((user) => user.text("my question")),
      );
      expect(requestData(spec)._userText).toBe("my question");
    });

    it("when user consumer then return", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      const spec = asRequestSpec(
        chatClient
          .prompt()
          .user((user) =>
            user
              .text("my question about {topic}")
              .param("topic", "AI")
              .metadata("msgId", "uuid-xxx")
              .media(MediaFormat.IMAGE_PNG, tabbyCatResource),
          ),
      );
      const data = requestData(spec);
      expect(data._userText).toBe("my question about {topic}");
      expect(data._userParams.topic).toBe("AI");
      expect(data._media).toHaveLength(1);
      expect(data._userMetadata.msgId).toBe("uuid-xxx");
    });

    it("when user consumer is null then throw", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      expect(() =>
        chatClient.prompt().user(null as unknown as () => void),
      ).toThrow("text cannot be null");
    });

    it("when user consumer with existing user text then return", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      const spec = asRequestSpec(
        chatClient
          .prompt()
          .user("my question")
          .user((user) =>
            user
              .text("my question about {topic}")
              .param("topic", "AI")
              .metadata("msgId", "uuid-xxx")
              .media(MediaFormat.IMAGE_PNG, tabbyCatResource),
          ),
      );
      const data = requestData(spec);
      expect(data._userText).toBe("my question about {topic}");
      expect(data._userParams.topic).toBe("AI");
      expect(data._media).toHaveLength(1);
      expect(data._userMetadata.msgId).toBe("uuid-xxx");
    });

    it("when user consumer without user text then return", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      const spec = asRequestSpec(
        chatClient
          .prompt()
          .user("my question about {topic}")
          .user((user) =>
            user
              .param("topic", "AI")
              .metadata("msgId", "uuid-xxx")
              .media(MediaFormat.IMAGE_PNG, tabbyCatResource),
          ),
      );
      const data = requestData(spec);
      expect(data._userText).toBe("my question about {topic}");
      expect(data._userParams.topic).toBe("AI");
      expect(data._media).toHaveLength(1);
      expect(data._userMetadata.msgId).toBe("uuid-xxx");
    });

    it("when default chat client builder with observation registry then return", () => {
      const chatModel = createChatModel();
      const observationRegistry = NoopObservationRegistry.INSTANCE;
      const observationConvention = {} as ChatClientObservationConvention;
      const advisorObservationConvention = {} as never;
      const builder = new DefaultChatClientBuilder(
        chatModel,
        observationRegistry,
        observationConvention,
        advisorObservationConvention,
      );
      expect(builder).toBeDefined();
    });

    it("when prompt with system user and options then return", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      const options = new DefaultToolCallingChatOptions();
      const spec = asRequestSpec(
        chatClient
          .prompt()
          .system("instructions")
          .user("question")
          .options(options.mutate()),
      );
      const data = requestData(spec);
      const builtOptions = data._optionsCustomizer?.build() as
        | DefaultToolCallingChatOptions
        | undefined;
      expect(data._systemText).toBe("instructions");
      expect(data._userText).toBe("question");
      expect(builtOptions?.toolCallbacks).toEqual(options.toolCallbacks);
      expect(builtOptions?.toolNames).toEqual(options.toolNames);
      expect(builtOptions?.toolContext).toEqual(options.toolContext);
    });

    it("when tool names with empty array then return", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      const spec = asRequestSpec(chatClient.prompt().toolNames());
      expect(requestData(spec)._toolNames).toHaveLength(0);
    });

    it("when user params with empty map then return", () => {
      const spec = new DefaultChatClient.DefaultPromptUserSpec();
      spec.params(new Map());
      expect(spec.paramsValue.size).toBe(0);
    });

    it("when system params with empty map then return", () => {
      const spec = new DefaultChatClient.DefaultPromptSystemSpec();
      spec.params(new Map());
      expect(spec.paramsValue.size).toBe(0);
    });

    it("when advisor spec with multiple params then all stored", () => {
      const spec = new DefaultChatClient.DefaultAdvisorSpec();
      spec
        .param("param1", "value1")
        .param("param2", "value2")
        .param("param3", "value3");
      expect(spec.paramsValue.get("param1")).toBe("value1");
      expect(spec.paramsValue.get("param2")).toBe("value2");
      expect(spec.paramsValue.get("param3")).toBe("value3");
    });

    it("when messages with empty list then return", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      const spec = asRequestSpec(chatClient.prompt().messages([]));
      // Messages should not be modified from original state
      expect(requestData(spec)._messages).toBeDefined();
    });

    it("when mutate builder then returns same type", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      expect(chatClient.mutate()).toBeInstanceOf(DefaultChatClientBuilder);
    });

    it("when system consumer with null param value then throw", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      expect(() =>
        chatClient.prompt().system((system) => system.param("key", null)),
      ).toThrow("value cannot be null");
    });

    it("when user consumer with null param value then throw", () => {
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      expect(() =>
        chatClient.prompt().user((user) => user.param("key", null)),
      ).toThrow("value cannot be null");
    });

    it("when tool callback provider then not eagerly evaluated", () => {
      let providerCalls = 0;
      const provider: ChatClient.ToolCallbackProvider = {
        get toolCallbacks() {
          providerCalls += 1;
          return [];
        },
      };
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();
      chatClient.prompt().user("test").toolCallbacks(provider);

      // Verify that getToolCallbacks() was NOT called during configuration
      expect(providerCalls).toBe(0);
    });

    it("when tool callback provider then lazily evaluated on call", async () => {
      let providerCalls = 0;
      const provider: ChatClient.ToolCallbackProvider = {
        get toolCallbacks() {
          providerCalls += 1;
          return [];
        },
      };
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();

      // Verify not called yet
      expect(providerCalls).toBe(0);

      // Execute the call
      await chatClient
        .prompt()
        .user("test")
        .toolCallbacks(provider)
        .call()
        .content();

      // Verify getToolCallbacks() WAS called during execution
      expect(providerCalls).toBe(1);
    });

    it("when tool callback provider then lazily evaluated on stream", async () => {
      let providerCalls = 0;
      const provider: ChatClient.ToolCallbackProvider = {
        get toolCallbacks() {
          providerCalls += 1;
          return [];
        },
      };
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();

      // Verify not called yet
      expect(providerCalls).toBe(0);

      // Execute the stream
      await lastValueFrom(
        chatClient
          .prompt()
          .user("test")
          .toolCallbacks(provider)
          .stream()
          .content()
          .pipe(defaultIfEmpty("")),
      );

      // Verify getToolCallbacks() WAS called during execution
      expect(providerCalls).toBe(1);
    });

    it("when multiple tool callback providers then all lazily evaluated", async () => {
      let provider1Calls = 0;
      let provider2Calls = 0;
      const provider1: ChatClient.ToolCallbackProvider = {
        get toolCallbacks() {
          provider1Calls += 1;
          return [];
        },
      };
      const provider2: ChatClient.ToolCallbackProvider = {
        get toolCallbacks() {
          provider2Calls += 1;
          return [];
        },
      };
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();

      // Verify not called yet
      expect(provider1Calls).toBe(0);
      expect(provider2Calls).toBe(0);

      // Execute the call
      await chatClient
        .prompt()
        .user("test")
        .toolCallbacks(provider1, provider2)
        .call()
        .content();

      // Verify both getToolCallbacks() were called during execution
      expect(provider1Calls).toBe(1);
      expect(provider2Calls).toBe(1);
    });

    it("when tool callbacks and providers then both used", async () => {
      let providerCalls = 0;
      const provider: ChatClient.ToolCallbackProvider = {
        get toolCallbacks() {
          providerCalls += 1;
          return [];
        },
      };
      const chatClient = new DefaultChatClientBuilder(
        createChatModel(),
      ).build();

      // Verify provider not called yet
      expect(providerCalls).toBe(0);

      // Execute the call
      await chatClient
        .prompt()
        .user("test")
        .toolCallbacks(provider)
        .call()
        .content();

      // Verify provider was called during execution
      expect(providerCalls).toBe(1);
    });
  });
});
