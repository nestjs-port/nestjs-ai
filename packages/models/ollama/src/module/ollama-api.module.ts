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
  type DynamicModule,
  type FactoryProvider,
  type InjectionToken,
  Module,
  type ModuleMetadata,
  type Provider,
} from "@nestjs/common";

import { OllamaApi } from "../api/ollama-api.js";
import type { OllamaConnectionProperties } from "./ollama-connection-properties.js";

export const OLLAMA_API_MODEL_MODULE_OPTIONS_TOKEN = Symbol.for(
  "OLLAMA_API_MODEL_MODULE_OPTIONS_TOKEN",
);

export interface OllamaApiModelModuleAsyncOptions {
  imports?: ModuleMetadata["imports"];
  inject?: InjectionToken[];
  useFactory: (
    ...args: never[]
  ) => Promise<OllamaConnectionProperties> | OllamaConnectionProperties;
  global?: boolean;
}

@Module({})
export class OllamaApiModule {
  static forFeature(
    properties?: OllamaConnectionProperties,
    options?: {
      imports?: ModuleMetadata["imports"];
      global?: boolean;
    },
  ): DynamicModule {
    return OllamaApiModule.forFeatureAsync({
      imports: options?.imports,
      useFactory: () => properties ?? {},
      global: options?.global,
    });
  }

  static forFeatureAsync(
    options: OllamaApiModelModuleAsyncOptions,
  ): DynamicModule {
    const providers = createProviders();

    return {
      module: OllamaApiModule,
      providers: [
        {
          provide: OLLAMA_API_MODEL_MODULE_OPTIONS_TOKEN,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        ...providers,
      ],
      exports: providers.map(
        (provider) => (provider as FactoryProvider).provide,
      ),
      imports: options.imports ?? [],
      global: options.global ?? false,
    };
  }
}

function createProviders(): Provider[] {
  return [
    {
      provide: OllamaApi,
      useFactory: (properties: OllamaConnectionProperties) =>
        new OllamaApi({ baseUrl: properties.baseUrl }),
      inject: [OLLAMA_API_MODEL_MODULE_OPTIONS_TOKEN],
    },
  ];
}
