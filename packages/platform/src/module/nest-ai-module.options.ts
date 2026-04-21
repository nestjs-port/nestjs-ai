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

import type { InjectionToken, ModuleMetadata } from "@nestjs/common";
import type { HttpClient } from "@nestjs-port/core";

export interface NestAiRootModuleOptions {
  imports?: ModuleMetadata["imports"];
  httpClient?: HttpClient;
  global?: boolean;
}

export interface NestAiRootModuleAsyncOptions {
  imports?: ModuleMetadata["imports"];
  inject?: InjectionToken[];
  useFactory: (
    ...args: never[]
  ) =>
    | Promise<NestAiRootModuleAsyncFactoryOptions>
    | NestAiRootModuleAsyncFactoryOptions;
  global?: boolean;
}

export interface NestAiRootModuleAsyncFactoryOptions {
  httpClient?: HttpClient;
}
