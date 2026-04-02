import type { DynamicModule } from "@nestjs/common";
import { Module } from "@nestjs/common";
import {
  CHAT_CLIENT_BUILDER_TOKEN,
  CHAT_CLIENT_CUSTOMIZER_TOKEN,
  type ChatClientConfiguration,
} from "@nestjs-ai/commons";
import { NestAiModule } from "./nest-ai.module";
import type { NestAiChatClientModuleAsyncOptions } from "./nest-ai-module.options";

@Module({})
export class NestAiChatClientModule {
  static forFeature(configuration: ChatClientConfiguration): DynamicModule {
    return {
      module: NestAiChatClientModule,
      imports: [NestAiModule.forFeature(configuration)],
      exports: [NestAiModule],
    };
  }

  static forFeatureAsync(
    options: NestAiChatClientModuleAsyncOptions,
  ): DynamicModule {
    return {
      module: NestAiChatClientModule,
      imports: [
        NestAiModule.forFeatureAsync({
          imports: options.imports,
          inject: options.inject,
          providers: [
            { token: CHAT_CLIENT_CUSTOMIZER_TOKEN },
            { token: CHAT_CLIENT_BUILDER_TOKEN, scope: "TRANSIENT" },
          ],
          useFactory: options.useFactory,
        }),
      ],
      exports: [NestAiModule],
    };
  }
}
