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

import {
  CHAT_CLIENT_BUILDER_TOKEN,
  CHAT_CLIENT_CUSTOMIZER_TOKEN,
  CHAT_MODEL_TOKEN,
  type ChatClientConfiguration,
  NoopObservationRegistry,
  OBSERVATION_REGISTRY_TOKEN,
  type ObservationRegistry,
} from "@nestjs-ai/commons";
import type { ChatModel } from "@nestjs-ai/model";
import { AdvisorObservationConvention } from "../advisor";
import { ChatClient } from "../chat-client";
import type { ChatClientCustomizer } from "../chat-client-customizer.interface";
import { ChatClientObservationConvention } from "../observation";
import { ChatClientBuilderConfigurer } from "./chat-client-builder-configurer";
import type {
  ChatClientBuilderProperties,
  ChatClientCustomizerDefinition,
} from "./chat-client-builder-properties";

/**
 * Creates a ChatClientConfiguration that wires ChatClientBuilderConfigurer and ChatClient.Builder.
 */
export function configureChatClient(
  properties: ChatClientBuilderProperties = {},
): ChatClientConfiguration {
  return {
    providers: [
      ...createCustomizerProviders(properties.customizer),
      ...createConfigurerProviders(),
      ...createChatClientBuilderProviders(),
    ],
  } as unknown as ChatClientConfiguration;
}

function createCustomizerProviders(
  customizer?: ChatClientCustomizerDefinition,
): ChatClientConfiguration["providers"] {
  if (customizer == null) {
    return [];
  }

  if (isCustomizerFactoryDefinition(customizer)) {
    return [
      {
        token: CHAT_CLIENT_CUSTOMIZER_TOKEN,
        useFactory: customizer.useFactory,
        inject: customizer.inject ?? [],
      },
    ];
  }

  return [
    {
      token: CHAT_CLIENT_CUSTOMIZER_TOKEN,
      useFactory: () => customizer,
      inject: [],
    },
  ];
}

function createConfigurerProviders(): ChatClientConfiguration["providers"] {
  return [
    {
      token: ChatClientBuilderConfigurer,
      useFactory: createChatClientBuilderConfigurer,
      inject: [{ token: CHAT_CLIENT_CUSTOMIZER_TOKEN, optional: true }],
    },
  ];
}

function createChatClientBuilderProviders(): ChatClientConfiguration["providers"] {
  return [
    {
      token: CHAT_CLIENT_BUILDER_TOKEN,
      useFactory: createChatClientBuilder,
      inject: [
        ChatClientBuilderConfigurer,
        CHAT_MODEL_TOKEN,
        { token: OBSERVATION_REGISTRY_TOKEN, optional: true },
        { token: ChatClientObservationConvention, optional: true },
        { token: AdvisorObservationConvention, optional: true },
      ],
      scope: "TRANSIENT",
    },
  ];
}

function createChatClientBuilderConfigurer(
  customizer?: ChatClientCustomizer | null,
): ChatClientBuilderConfigurer {
  const configurer = new ChatClientBuilderConfigurer();
  configurer.setChatClientCustomizers(customizer == null ? [] : [customizer]);
  return configurer;
}

function createChatClientBuilder(
  chatClientBuilderConfigurer: ChatClientBuilderConfigurer,
  chatModel: ChatModel,
  observationRegistry?: ObservationRegistry,
  chatClientObservationConvention?: ChatClientObservationConvention,
  advisorObservationConvention?: AdvisorObservationConvention,
): ChatClient.Builder {
  const builder = ChatClient.builder(
    chatModel,
    observationRegistry ?? NoopObservationRegistry.INSTANCE,
    chatClientObservationConvention ?? null,
    advisorObservationConvention ?? null,
  );
  return chatClientBuilderConfigurer.configure(builder);
}

function isCustomizerFactoryDefinition(
  definition: ChatClientCustomizerDefinition,
): definition is Exclude<ChatClientCustomizerDefinition, ChatClientCustomizer> {
  return typeof definition === "object" && definition !== null;
}
