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
import { Module, Scope } from "@nestjs/common";
import {
  FetchHttpClient,
  HTTP_CLIENT_TOKEN,
  LoggerFactory,
  ObservationHandlers,
  PROVIDER_INSTANCE_EXPLORER_TOKEN,
} from "@nestjs-ai/commons";
import { NestLoggerFactory } from "../logging";
import { NestProviderInstanceExplorer } from "../provider";
import type {
  NestAiFeatureAsyncProviderDescriptor,
  NestAiFeatureModuleAsyncOptions,
  NestAiFeatureModuleOptions,
  NestAiRootModuleAsyncFactoryOptions,
  NestAiRootModuleAsyncOptions,
  NestAiRootModuleOptions,
} from "./nest-ai-module.options";

export const NEST_AI_ROOT_MODULE_OPTIONS = Symbol(
  "NEST_AI_ROOT_MODULE_OPTIONS",
);
export const NEST_AI_FEATURE_MODULE_OPTIONS = Symbol(
  "NEST_AI_FEATURE_MODULE_OPTIONS",
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

  static forFeature(...features: NestAiFeatureModuleOptions[]): DynamicModule {
    const providers: Provider[] = [];
    const exports: InjectionToken[] = [];

    for (const feature of features) {
      NestAiModule.registerConfigurationProviders(providers, exports, feature);
    }

    return {
      module: NestAiModule,
      providers,
      exports,
    };
  }

  static forFeatureAsync(
    options: NestAiFeatureModuleAsyncOptions,
  ): DynamicModule {
    return {
      module: NestAiModule,
      imports: options.imports ?? [],
      providers: [
        {
          provide: NEST_AI_FEATURE_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        ...NestAiModule.createAsyncFeatureProviders(options.providers),
      ],
      exports: options.providers.map((provider) => provider.token),
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
        provide: PROVIDER_INSTANCE_EXPLORER_TOKEN,
        useClass: NestProviderInstanceExplorer,
      },
    ];
  }

  private static getRootExports(): InjectionToken[] {
    return [
      HTTP_CLIENT_TOKEN,
      ObservationHandlers,
      PROVIDER_INSTANCE_EXPLORER_TOKEN,
    ];
  }

  private static createAsyncFeatureProviders(
    providers: NestAiFeatureAsyncProviderDescriptor[],
  ): Provider[] {
    return providers.map((descriptor) => ({
      provide: descriptor.token,
      useFactory: async (
        configuration: NestAiFeatureModuleOptions,
        ...dependencies: unknown[]
      ): Promise<unknown> => {
        const provider = configuration.providers.find(
          (candidate) => candidate.token === descriptor.token,
        );

        if (provider == null) {
          throw new Error(
            `Missing async Nest AI feature provider for token ${String(descriptor.token)}`,
          );
        }

        return (provider.useFactory as (...args: unknown[]) => unknown)(
          ...dependencies,
        );
      },
      inject: [
        NEST_AI_FEATURE_MODULE_OPTIONS,
        ...(descriptor.inject ?? []),
      ],
      scope: NestAiModule.toProviderScope(descriptor.scope),
    }));
  }

  private static registerConfigurationProviders(
    providers: Provider[],
    exports: InjectionToken[],
    configuration?: NestAiFeatureModuleOptions,
  ): void {
    if (configuration == null) {
      return;
    }

    for (const provider of configuration.providers) {
      const scope =
        "scope" in provider
          ? NestAiModule.toProviderScope(provider.scope)
          : undefined;

      const token = provider.token as InjectionToken;
      NestAiModule.addProviderIfMissing(
        providers,
        exports,
        {
          provide: token,
          useFactory: provider.useFactory,
          inject: (provider.inject ?? []) as InjectionToken[],
          scope,
        },
        token,
      );
    }
  }

  private static addProviderIfMissing(
    providers: Provider[],
    exports: InjectionToken[],
    provider: Provider,
    token: InjectionToken,
  ): void {
    if (NestAiModule.hasProviderToken(providers, token)) {
      return;
    }
    providers.push(provider);
    exports.push(token);
  }

  private static hasProviderToken(
    providers: Provider[],
    token: InjectionToken,
  ): boolean {
    return providers.some((provider) => {
      if (typeof provider === "function") {
        return provider === token;
      }
      if (typeof provider !== "object" || provider == null) {
        return false;
      }
      return "provide" in provider && provider.provide === token;
    });
  }

  private static toProviderScope(scope: unknown): Scope | undefined {
    switch (scope) {
      case "DEFAULT":
        return Scope.DEFAULT;
      case "TRANSIENT":
        return Scope.TRANSIENT;
      case "REQUEST":
        return Scope.REQUEST;
      default:
        return undefined;
    }
  }
}
