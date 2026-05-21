import {
  type DynamicModule,
  type InjectionToken,
  Module,
  type Provider,
} from "@nestjs/common";
import {
  HTTP_CLIENT_TOKEN,
  PROVIDER_INSTANCE_EXPLORER_TOKEN,
  TOOL_CALLBACK_PROVIDER_TOKEN,
} from "@nestjs-ai/commons";
import { FetchHttpClient, LoggerFactory } from "@nestjs-port/core";
import { NestLoggerFactory } from "../logging/nest-logger-factory.js";
import { NestProviderInstanceExplorer } from "../provider/nest-provider-instance-explorer.js";
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
      {
        provide: TOOL_CALLBACK_PROVIDER_TOKEN,
        useValue: [],
      },
    ];
  }

  private static getRootExports(): InjectionToken[] {
    return [
      HTTP_CLIENT_TOKEN,
      PROVIDER_INSTANCE_EXPLORER_TOKEN,
      TOOL_CALLBACK_PROVIDER_TOKEN,
    ];
  }
}
