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

import type {
  DynamicModule,
  InjectionToken,
  ModuleMetadata,
  Provider,
} from "@nestjs/common";
import { Module, Scope } from "@nestjs/common";
import {
  CHAT_CLIENT_BUILDER_TOKEN,
  CHAT_CLIENT_CUSTOMIZER_TOKEN,
  CHAT_MODEL_TOKEN,
  NoopObservationRegistry,
  type ObservationRegistry,
} from "@nestjs-ai/commons";
import type { ChatModel } from "@nestjs-ai/model";
import { OBSERVATION_REGISTRY_TOKEN } from "@nestjs-port/core";
import { AdvisorObservationConvention } from "../advisor";
import { ChatClient } from "../chat-client";
import type { ChatClientCustomizer } from "../chat-client-customizer.interface";
import { ChatClientObservationConvention } from "../observation";
import { ChatClientBuilderConfigurer } from "./chat-client-builder-configurer";
import type {
  ChatClientCustomizerDefinition,
  ChatClientCustomizerFactoryDefinition,
} from "./chat-client-builder-properties";

export interface ChatClientModuleAsyncOptions {
  imports?: ModuleMetadata["imports"];
  inject?: InjectionToken[];
  useFactory: (
    ...args: never[]
  ) =>
    | Promise<ChatClientCustomizerDefinition | undefined>
    | ChatClientCustomizerDefinition
    | undefined;
  global?: boolean;
}

export interface ChatClientModuleOptions {
  customizer?: ChatClientCustomizerDefinition;
  imports?: ModuleMetadata["imports"];
  global?: boolean;
}

@Module({})
export class ChatClientModule {
  static forFeature(options: ChatClientModuleOptions = {}): DynamicModule {
    return ChatClientModule.forFeatureAsync({
      imports: options.imports,
      useFactory: () => options.customizer,
      global: options.global,
    });
  }

  static forFeatureAsync(options: ChatClientModuleAsyncOptions): DynamicModule {
    const providers = createProviders();

    return {
      module: ChatClientModule,
      imports: options.imports ?? [],
      providers: [
        {
          provide: CHAT_CLIENT_CUSTOMIZER_TOKEN,
          useFactory: async (...args: never[]) => {
            const result = await options.useFactory(...args);
            return resolveCustomizer(result);
          },
          inject: options.inject ?? [],
        },
        ...providers,
      ],
      exports: [CHAT_CLIENT_BUILDER_TOKEN],
      global: options.global ?? false,
    };
  }
}

function createProviders(): Provider[] {
  return [
    {
      provide: ChatClientBuilderConfigurer,
      useFactory: (customizerInstance?: ChatClientCustomizer | null) => {
        const configurer = new ChatClientBuilderConfigurer();
        configurer.setChatClientCustomizers(
          customizerInstance == null ? [] : [customizerInstance],
        );
        return configurer;
      },
      inject: [{ token: CHAT_CLIENT_CUSTOMIZER_TOKEN, optional: true }],
    },
    {
      provide: CHAT_CLIENT_BUILDER_TOKEN,
      useFactory: (
        configurer: ChatClientBuilderConfigurer,
        chatModel: ChatModel,
        observationRegistry?: ObservationRegistry,
        chatClientObservationConvention?: ChatClientObservationConvention,
        advisorObservationConvention?: AdvisorObservationConvention,
      ) =>
        configurer.configure(
          ChatClient.builder(
            chatModel,
            observationRegistry ?? NoopObservationRegistry.INSTANCE,
            chatClientObservationConvention ?? null,
            advisorObservationConvention ?? null,
          ),
        ),
      inject: [
        ChatClientBuilderConfigurer,
        CHAT_MODEL_TOKEN,
        { token: OBSERVATION_REGISTRY_TOKEN, optional: true },
        { token: ChatClientObservationConvention, optional: true },
        { token: AdvisorObservationConvention, optional: true },
      ],
      scope: Scope.TRANSIENT,
    },
  ];
}

function resolveCustomizer(
  definition?: ChatClientCustomizerDefinition,
): ChatClientCustomizer | undefined {
  if (definition == null) {
    return undefined;
  }
  if (isCustomizerFactoryDefinition(definition)) {
    return definition.useFactory();
  }
  return definition;
}

function isCustomizerFactoryDefinition(
  definition: ChatClientCustomizerDefinition,
): definition is ChatClientCustomizerFactoryDefinition {
  return typeof definition === "object" && definition !== null;
}
