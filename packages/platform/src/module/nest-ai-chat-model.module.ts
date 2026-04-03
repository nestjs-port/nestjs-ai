import type { DynamicModule } from "@nestjs/common";
import { Module } from "@nestjs/common";
import {
  CHAT_MODEL_TOKEN,
  type ChatModelConfiguration,
} from "@nestjs-ai/commons";
import { NestAiModule } from "./nest-ai.module";
import type { NestAiChatModelModuleAsyncOptions } from "./nest-ai-module.options";

@Module({})
export class NestAiChatModelModule {
  static forFeature(configuration: ChatModelConfiguration): DynamicModule {
    return NestAiChatModelModule.forFeatureAsync({
      useFactory: () => configuration,
    });
  }

  static forFeatureAsync(
    options: NestAiChatModelModuleAsyncOptions,
  ): DynamicModule {
    return {
      module: NestAiChatModelModule,
      imports: [
        NestAiModule.forFeatureAsync({
          imports: options.imports,
          inject: options.inject,
          providers: [{ token: CHAT_MODEL_TOKEN }],
          useFactory: options.useFactory,
        }),
      ],
      exports: [NestAiModule],
    };
  }
}
