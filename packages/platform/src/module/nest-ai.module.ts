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

import type { DynamicModule, InjectionToken, Provider } from "@nestjs/common";
import { Module } from "@nestjs/common";
import {
  FetchHttpClient,
  HTTP_CLIENT_TOKEN,
  LoggerFactory,
  ObservationFilters,
  ObservationHandlers,
  PROVIDER_INSTANCE_EXPLORER_TOKEN,
} from "@nestjs-ai/commons";
import { NestLoggerFactory } from "../logging";
import { NestProviderInstanceExplorer } from "../provider";
import type {
  NestAiRootModuleAsyncFactoryOptions,
  NestAiRootModuleAsyncOptions,
  NestAiRootModuleOptions,
} from "./nest-ai-module.options";

export const NEST_AI_ROOT_MODULE_OPTIONS = Symbol(
  "NEST_AI_ROOT_MODULE_OPTIONS",
);

@Module({})
export class NestAiModule {
  static forRoot(options: NestAiRootModuleOptions = {}): DynamicModule {
    LoggerFactory.bind(new NestLoggerFactory());

    return {
      module: NestAiModule,
      providers: NestAiModule.createRootProviders(options),
      exports: NestAiModule.getRootExports(),
      global: options.global ?? true,
    };
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
        ...NestAiModule.createAsyncRootProviders(),
      ],
      exports: NestAiModule.getRootExports(),
      global: options.global ?? true,
    };
  }

  private static createRootProviders(
    options: Pick<NestAiRootModuleOptions, "httpClient">,
  ): Provider[] {
    return [
      {
        provide: HTTP_CLIENT_TOKEN,
        useValue: options.httpClient ?? new FetchHttpClient(),
      },
      {
        provide: ObservationHandlers,
        useValue: new ObservationHandlers(),
      },
      {
        provide: ObservationFilters,
        useValue: new ObservationFilters(),
      },
      {
        provide: PROVIDER_INSTANCE_EXPLORER_TOKEN,
        useClass: NestProviderInstanceExplorer,
      },
    ];
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
        provide: ObservationHandlers,
        useValue: new ObservationHandlers(),
      },
      {
        provide: ObservationFilters,
        useValue: new ObservationFilters(),
      },
      {
        provide: PROVIDER_INSTANCE_EXPLORER_TOKEN,
        useClass: NestProviderInstanceExplorer,
      },
    ];
  }

  private static getRootExports(): InjectionToken[] {
    return [
      HTTP_CLIENT_TOKEN,
      ObservationHandlers,
      ObservationFilters,
      PROVIDER_INSTANCE_EXPLORER_TOKEN,
    ];
  }
}
