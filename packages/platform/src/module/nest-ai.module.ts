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
  type InjectionToken,
  Module,
  type Provider,
} from "@nestjs/common";
import {
  HTTP_CLIENT_TOKEN,
  PROVIDER_INSTANCE_EXPLORER_TOKEN,
} from "@nestjs-ai/commons";
import { FetchHttpClient, LoggerFactory } from "@nestjs-port/core";
import { NestLoggerFactory } from "../logging/index.js";
import { NestProviderInstanceExplorer } from "../provider/index.js";
import { NestAiTemplateRendererInitializer } from "./nest-ai-template-renderer.initializer.js";
import type {
  NestAiRootModuleAsyncFactoryOptions,
  NestAiRootModuleAsyncOptions,
  NestAiRootModuleOptions,
} from "./nest-ai-module.options.js";

export const NEST_AI_ROOT_MODULE_OPTIONS = Symbol(
  "NEST_AI_ROOT_MODULE_OPTIONS",
);

@Module({})
export class NestAiModule {
  static forRoot(options: NestAiRootModuleOptions = {}): DynamicModule {
    return NestAiModule.forRootAsync({
      imports: options.imports,
      useFactory: () => ({
        httpClient: options.httpClient,
      }),
      global: options.global,
    });
  }

  static forRootAsync(options: NestAiRootModuleAsyncOptions): DynamicModule {
    LoggerFactory.bind(new NestLoggerFactory());

    return {
      module: NestAiModule,
      imports: options.imports ?? [],
      providers: [
        {
          provide: NEST_AI_ROOT_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        NestAiTemplateRendererInitializer,
        ...NestAiModule.createAsyncRootProviders(),
      ],
      exports: NestAiModule.getRootExports(),
      global: options.global ?? true,
    };
  }

  private static createAsyncRootProviders(): Provider[] {
    return [
      {
        provide: HTTP_CLIENT_TOKEN,
        useFactory: (options: NestAiRootModuleAsyncFactoryOptions): unknown =>
          options.httpClient ?? new FetchHttpClient(),
        inject: [NEST_AI_ROOT_MODULE_OPTIONS],
      },
      {
        provide: PROVIDER_INSTANCE_EXPLORER_TOKEN,
        useClass: NestProviderInstanceExplorer,
      },
    ];
  }

  private static getRootExports(): InjectionToken[] {
    return [HTTP_CLIENT_TOKEN, PROVIDER_INSTANCE_EXPLORER_TOKEN];
  }
}
