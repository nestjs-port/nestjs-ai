import {
  type DynamicModule,
  type InjectionToken,
  Module,
  type ModuleMetadata,
  type Provider,
} from "@nestjs/common";
import { CHAT_MEMORY_TOKEN } from "@nestjs-ai/commons";

import { MongoChatMemoryRepository } from "../mongo-chat-memory-repository.js";
import {
  MONGO_CHAT_MEMORY_PROPERTIES_TOKEN,
  type MongoChatMemoryProperties,
} from "./mongo-chat-memory-properties.js";
import {
  MongoChatMemoryIndexInitializer,
  resolveMongoChatMemoryCollection,
} from "./mongo-chat-memory-index-initializer.js";

export interface MongoChatMemoryModuleOptions {
  imports?: ModuleMetadata["imports"];
  global?: boolean;
}

export interface MongoChatMemoryModuleAsyncOptions {
  imports?: ModuleMetadata["imports"];
  inject?: InjectionToken[];
  useFactory: (
    ...args: never[]
  ) => Promise<MongoChatMemoryProperties> | MongoChatMemoryProperties;
  global?: boolean;
}

@Module({})
export class MongoChatMemoryModule {
  static forFeature(
    properties: MongoChatMemoryProperties = {},
    options?: MongoChatMemoryModuleOptions,
  ): DynamicModule {
    return MongoChatMemoryModule.forFeatureAsync({
      imports: options?.imports,
      useFactory: () => properties,
      global: options?.global,
    });
  }

  static forFeatureAsync(
    options: MongoChatMemoryModuleAsyncOptions,
  ): DynamicModule {
    const providers = createProviders();

    return {
      module: MongoChatMemoryModule,
      imports: options.imports ?? [],
      providers: [
        {
          provide: MONGO_CHAT_MEMORY_PROPERTIES_TOKEN,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        ...providers,
      ],
      exports: [CHAT_MEMORY_TOKEN],
      global: options.global ?? false,
    };
  }
}

function createProviders(): Provider[] {
  return [createChatMemoryProvider(), MongoChatMemoryIndexInitializer];
}

function createChatMemoryProvider(): Provider {
  return {
    provide: CHAT_MEMORY_TOKEN,
    useFactory: async (
      properties: MongoChatMemoryProperties,
    ): Promise<MongoChatMemoryRepository> => {
      const collection = await resolveMongoChatMemoryCollection(properties);

      return MongoChatMemoryRepository.builder().collection(collection).build();
    },
    inject: [MONGO_CHAT_MEMORY_PROPERTIES_TOKEN],
  };
}
