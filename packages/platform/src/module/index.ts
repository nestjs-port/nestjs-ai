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

export {
  NEST_AI_FEATURE_MODULE_OPTIONS,
  NEST_AI_ROOT_MODULE_OPTIONS,
  NestAiModule,
} from "./nest-ai.module";
export { NestAiChatClientModule } from "./nest-ai-chat-client.module";
export { NestAiChatModelModule } from "./nest-ai-chat-model.module";
export type {
  NestAiChatClientModuleAsyncOptions,
  NestAiChatModelModuleAsyncOptions,
  NestAiFeatureAsyncProviderDescriptor,
  NestAiFeatureModuleAsyncOptions,
  NestAiFeatureModuleOptions,
  NestAiRootModuleAsyncFactoryOptions,
  NestAiRootModuleAsyncOptions,
  NestAiRootModuleOptions,
} from "./nest-ai-module.options";
