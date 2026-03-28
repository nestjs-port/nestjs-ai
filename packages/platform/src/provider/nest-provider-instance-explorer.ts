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

import { Injectable } from "@nestjs/common";
import type { ModulesContainer } from "@nestjs/core";
import type { ProviderInstanceExplorer } from "@nestjs-ai/commons";

@Injectable()
export class NestProviderInstanceExplorer implements ProviderInstanceExplorer {
  constructor(private readonly modulesContainer: ModulesContainer) {}

  getProviderInstances(): object[] {
    const providerInstances: object[] = [];
    const seen = new Set<object>();

    for (const moduleRef of this.modulesContainer.values()) {
      const providers = moduleRef.providers;
      for (const providerWrapper of providers.values()) {
        const instance = providerWrapper.instance;
        if (instance == null || typeof instance !== "object") {
          continue;
        }
        if (seen.has(instance)) {
          continue;
        }
        seen.add(instance);
        providerInstances.push(instance);
      }
    }

    return providerInstances;
  }
}
